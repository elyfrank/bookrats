-- Bookrats: guarda o momento exato em que o livro foi concluído.
--
-- Antes só havia a data (finished_on), então um livro concluído no mesmo dia, mas antes de entrar
-- num grupo, ainda dava +30 nesse grupo. Agora o ranking compara finished_at com a hora de entrada.

alter table public.books add column finished_at timestamptz;

-- Livros já concluídos: a hora real é desconhecida; usa o início do dia (no fuso do Brasil),
-- o que não dá bônus em grupos nos quais a pessoa entrou nesse mesmo dia.
update public.books
set finished_at = finished_on::timestamp at time zone 'America/Sao_Paulo'
where finished_on is not null;

-- finished_at é sempre definido pelo banco: o app só marca/desmarca finished_on.
create function public.set_book_finished_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.finished_at := case when new.finished_on is null then null else now() end;
  elsif new.finished_on is distinct from old.finished_on then
    new.finished_at := case when new.finished_on is null then null else now() end;
  else
    new.finished_at := old.finished_at;
  end if;
  return new;
end;
$$;

create trigger books_set_finished_at
  before insert or update on public.books
  for each row execute function public.set_book_finished_at();

-- Mesma função da migração 004; só muda o filtro de livros concluídos (finished_at >= since).
create or replace function public.score_days(target uuid, since timestamptz)
returns table (
  read_on date,
  pages int,
  page_points int,
  daily_bonus int,
  streak_days int,
  streak_bonus int,
  books_finished int,
  finish_bonus int,
  points int
)
language sql
stable
set search_path = ''
as $$
  with reading_days as (
    select r.read_on, sum(r.pages)::int as pages
    from public.reading_logs r
    where r.user_id = target and r.created_at >= since
    group by r.read_on
  ),
  finishes as (
    -- O mínimo de 50 páginas considera o livro inteiro, inclusive o que foi lido antes de `since`.
    select b.finished_on as read_on, count(*)::int as books_finished
    from public.books b
    where b.user_id = target
      and b.finished_at >= since
      and (
        select coalesce(sum(r.pages), 0) from public.reading_logs r
        where r.book_id = b.id and r.user_id = b.user_id
      ) >= 50
    group by b.finished_on
  ),
  days as (
    select coalesce(rd.read_on, f.read_on) as read_on,
           coalesce(rd.pages, 0) as pages,
           coalesce(f.books_finished, 0) as books_finished
    from reading_days rd
    full join finishes f on f.read_on = rd.read_on
  ),
  qualifying as (
    -- Dias seguidos têm a mesma diferença entre a data e a posição na fila ("gaps and islands").
    select d.read_on, d.read_on - (row_number() over (order by d.read_on))::int as streak_group
    from days d
    where d.pages >= 5
  ),
  streaks as (
    select q.read_on, (row_number() over (partition by q.streak_group order by q.read_on))::int as streak_days
    from qualifying q
  ),
  scored as (
    select d.read_on, d.pages,
           least(least(d.pages, 50) + greatest(d.pages - 50, 0) / 2, 100) as page_points,
           case when d.pages >= 5 then 10 else 0 end as daily_bonus,
           coalesce(s.streak_days, 0) as streak_days,
           least(2 * coalesce(s.streak_days, 0), 20) as streak_bonus,
           d.books_finished,
           30 * d.books_finished as finish_bonus
    from days d
    left join streaks s on s.read_on = d.read_on
  )
  select sc.*, sc.page_points + sc.daily_bonus + sc.streak_bonus + sc.finish_bonus
  from scored sc;
$$;
