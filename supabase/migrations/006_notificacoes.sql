-- Bookrats: notificações push para os colegas de grupo.
--
--   - Alguém registra uma leitura: avisa todo mundo que divide algum grupo com a pessoa (uma
--     notificação por pessoa, mesmo dividindo vários grupos). Preferência: notify_readings.
--   - Alguém entra num grupo: avisa os outros membros desse grupo. Preferência: notify_joins.
--
-- O app registra o token de push do aparelho (Expo Push) em push_tokens. Os gatilhos enviam pela
-- API de push do Expo via pg_net (assíncrono: não atrasa a operação que disparou o aviso).

create extension if not exists pg_net with schema extensions;

alter table public.profiles
  add column notify_readings boolean not null default true,
  add column notify_joins boolean not null default true;

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles on delete cascade,
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

-- Sem políticas: a tabela só é acessada pelas funções abaixo.
alter table public.push_tokens enable row level security;

-- O mesmo aparelho pode trocar de conta: o token passa a ser de quem está logado.
create function public.register_push_token(push_token text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  insert into public.push_tokens (token, user_id) values (push_token, auth.uid())
  on conflict (token) do update set user_id = excluded.user_id, updated_at = now();
end;
$$;

create function public.unregister_push_token(push_token text)
returns void
language sql
security definer set search_path = ''
as $$
  delete from public.push_tokens where token = push_token and user_id = auth.uid();
$$;

-- Envia mensagens pela API de push do Expo, em lotes de até 100 (limite da API).
create function public.send_push(messages jsonb)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  batch jsonb;
begin
  for batch in
    select jsonb_agg(m.value)
    from (
      select e.value, (row_number() over () - 1) / 100 as n
      from jsonb_array_elements(messages) e
    ) m
    group by m.n
  loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := batch,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end loop;
end;
$$;

-- Só os gatilhos abaixo podem enviar: o app não consegue chamar send_push.
revoke execute on function public.send_push(jsonb) from public, anon, authenticated;

create function public.notify_group_reading()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  reader_name text;
  book_title text;
  messages jsonb;
begin
  select p.name into reader_name from public.profiles p where p.id = new.user_id;
  select b.title into book_title from public.books b where b.id = new.book_id;

  select jsonb_agg(jsonb_build_object(
           'to', t.token,
           'title', '📖 ' || reader_name || ' leu ' || new.pages ||
                    case when new.pages = 1 then ' página' else ' páginas' end,
           'body', coalesce(book_title || ' · ', '') || 'Bora ler também?',
           'sound', 'default',
           'channelId', 'default',
           'data', jsonb_build_object('url', '/group/' || shared.group_id)
         ))
  into messages
  from public.push_tokens t
  join public.profiles p on p.id = t.user_id
  -- Ao tocar, abre um grupo que quem recebe tem em comum com quem leu (o mais antigo).
  join lateral (
    select g.id as group_id
    from public.group_members m1
    join public.group_members m2 on m2.group_id = m1.group_id
    join public.groups g on g.id = m1.group_id
    where m1.user_id = new.user_id and m2.user_id = t.user_id
    order by g.created_at
    limit 1
  ) shared on true
  where t.user_id <> new.user_id
    and p.notify_readings;

  if messages is not null then
    perform public.send_push(messages);
  end if;
  return new;
end;
$$;

create trigger reading_logs_notify_group
  after insert on public.reading_logs
  for each row execute function public.notify_group_reading();

create function public.notify_group_join()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  joiner_name text;
  group_name text;
  messages jsonb;
begin
  select p.name into joiner_name from public.profiles p where p.id = new.user_id;
  select g.name into group_name from public.groups g where g.id = new.group_id;

  select jsonb_agg(jsonb_build_object(
           'to', t.token,
           'title', '👋 ' || joiner_name || ' entrou no grupo',
           'body', group_name || ' · Agora a disputa ficou mais acirrada!',
           'sound', 'default',
           'channelId', 'default',
           'data', jsonb_build_object('url', '/group/' || new.group_id)
         ))
  into messages
  from public.push_tokens t
  join public.profiles p on p.id = t.user_id
  join public.group_members m on m.user_id = t.user_id and m.group_id = new.group_id
  where t.user_id <> new.user_id
    and p.notify_joins;

  if messages is not null then
    perform public.send_push(messages);
  end if;
  return new;
end;
$$;

create trigger group_members_notify_join
  after insert on public.group_members
  for each row execute function public.notify_group_join();
