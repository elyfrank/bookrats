-- Bookrats: esquema do banco.
-- Cole este arquivo inteiro no Supabase em "SQL Editor" > "New query" e clique em "Run".

-- Perfil público de cada usuário (nome exibido nos rankings).
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique,
  created_by uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Cada registro é uma leitura: páginas lidas num dia. 1 página = 1 ponto.
create table public.reading_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  read_on date not null default current_date,
  pages integer not null check (pages between 1 and 2000),
  book_title text check (char_length(book_title) <= 200),
  created_at timestamptz not null default now()
);

create index reading_logs_user_idx on public.reading_logs (user_id, read_on desc);

-- Cria o perfil automaticamente no cadastro, usando o nome enviado no signUp.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), 'Leitor'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ajudante usado pelas regras de segurança (security definer evita recursão no RLS).
create function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- Regras de segurança (Row Level Security).
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.reading_logs enable row level security;

create policy "perfis visíveis para usuários logados" on public.profiles
  for select to authenticated using (true);
create policy "editar o próprio perfil" on public.profiles
  for update to authenticated using (id = auth.uid());

create policy "ver grupos dos quais participa" on public.groups
  for select to authenticated using (public.is_group_member(id));

create policy "ver membros dos seus grupos" on public.group_members
  for select to authenticated using (public.is_group_member(group_id));
create policy "sair de um grupo" on public.group_members
  for delete to authenticated using (user_id = auth.uid());

create policy "ver as próprias leituras" on public.reading_logs
  for select to authenticated using (user_id = auth.uid());
create policy "registrar leitura" on public.reading_logs
  for insert to authenticated with check (user_id = auth.uid());
create policy "apagar a própria leitura" on public.reading_logs
  for delete to authenticated using (user_id = auth.uid());

-- Cria um grupo com código de convite e adiciona o criador como membro.
create function public.create_group(group_name text)
returns public.groups
language plpgsql
security definer set search_path = ''
as $$
declare
  new_group public.groups;
  code text;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  loop
    -- 6 caracteres sem 0/O/1/I para evitar confusão ao digitar.
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
      into code from generate_series(1, 6);
    exit when not exists (select 1 from public.groups where invite_code = code);
  end loop;

  insert into public.groups (name, invite_code, created_by)
  values (trim(group_name), code, auth.uid())
  returning * into new_group;

  insert into public.group_members (group_id, user_id) values (new_group.id, auth.uid());
  return new_group;
end;
$$;

-- Entra num grupo pelo código de convite.
create function public.join_group(code text)
returns public.groups
language plpgsql
security definer set search_path = ''
as $$
declare
  found public.groups;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  select * into found from public.groups where invite_code = upper(trim(code));
  if found.id is null then
    raise exception 'Código de convite inválido';
  end if;
  insert into public.group_members (group_id, user_id)
  values (found.id, auth.uid())
  on conflict do nothing;
  return found;
end;
$$;

-- Ranking de um grupo: pontos totais e pontos dos últimos 7 dias de cada membro.
create function public.group_ranking(gid uuid)
returns table (user_id uuid, name text, total_points bigint, week_points bigint)
language sql
stable
security definer set search_path = ''
as $$
  select p.id, p.name,
         coalesce(sum(r.pages), 0) as total_points,
         coalesce(sum(r.pages) filter (where r.read_on > current_date - 7), 0) as week_points
  from public.group_members m
  join public.profiles p on p.id = m.user_id
  left join public.reading_logs r on r.user_id = m.user_id
  where m.group_id = gid and public.is_group_member(gid)
  group by p.id, p.name
  order by total_points desc, p.name;
$$;
