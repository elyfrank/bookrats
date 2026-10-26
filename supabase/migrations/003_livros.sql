-- Bookrats: livros como registros próprios e bônus por livro concluído.
--
-- Nova regra de pontuação:
--   livro concluído:  +30 no dia em que a pessoa marca o livro como concluído, desde que ela
--                     tenha registrado pelo menos 50 páginas dele (evita "concluir" livros vazios).

create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  finished_on date,
  created_at timestamptz not null default now()
);

create index books_user_idx on public.books (user_id);

alter table public.books enable row level security;

create policy "ver os próprios livros" on public.books
  for select to authenticated using (user_id = auth.uid());
create policy "cadastrar livro" on public.books
  for insert to authenticated with check (user_id = auth.uid());
create policy "editar o próprio livro" on public.books
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "apagar o próprio livro" on public.books
  for delete to authenticated using (user_id = auth.uid());

-- Leituras passam a apontar para um livro em vez de guardar o título solto.
alter table public.reading_logs add column book_id uuid references public.books on delete set null;

insert into public.books (user_id, title, created_at)
select user_id, trim(book_title), min(created_at)
from public.reading_logs
where trim(coalesce(book_title, '')) <> ''
group by user_id, trim(book_title);

update public.reading_logs r
set book_id = b.id
from public.books b
where b.user_id = r.user_id and b.title = trim(r.book_title);

alter table public.reading_logs drop column book_title;

-- Só dá para registrar leitura em livro próprio.
drop policy "registrar leitura" on public.reading_logs;
create policy "registrar leitura" on public.reading_logs
  for insert to authenticated with check (
    user_id = auth.uid()
    and (book_id is null or exists (
      select 1 from public.books b where b.id = book_id and b.user_id = auth.uid()
    ))
  );

-- Pontuação recriada com o bônus de livro concluído (regras anteriores na migração 002).
drop view public.daily_scores;

create view public.daily_scores with (security_invoker = true) as
with reading_days as (
  select user_id, read_on, sum(pages)::int as pages
  from public.reading_logs
  group by user_id, read_on
),
finishes as (
  select b.user_id, b.finished_on as read_on, count(*)::int as books_finished
  from public.books b
  where b.finished_on is not null
    and (
      select coalesce(sum(r.pages), 0) from public.reading_logs r
      where r.book_id = b.id and r.user_id = b.user_id
    ) >= 50
  group by b.user_id, b.finished_on
),
days as (
  select coalesce(r.user_id, f.user_id) as user_id,
         coalesce(r.read_on, f.read_on) as read_on,
         coalesce(r.pages, 0) as pages,
         coalesce(f.books_finished, 0) as books_finished
  from reading_days r
  full join finishes f on f.user_id = r.user_id and f.read_on = r.read_on
),
qualifying as (
  -- Dias seguidos têm a mesma diferença entre a data e a posição na fila ("gaps and islands").
  select user_id, read_on,
         read_on - (row_number() over (partition by user_id order by read_on))::int as streak_group
  from days
  where pages >= 5
),
streaks as (
  select user_id, read_on,
         (row_number() over (partition by user_id, streak_group order by read_on))::int as streak_days
  from qualifying
),
scored as (
  select d.user_id, d.read_on, d.pages,
         least(least(d.pages, 50) + greatest(d.pages - 50, 0) / 2, 100) as page_points,
         case when d.pages >= 5 then 10 else 0 end as daily_bonus,
         coalesce(s.streak_days, 0) as streak_days,
         least(2 * coalesce(s.streak_days, 0), 20) as streak_bonus,
         d.books_finished,
         30 * d.books_finished as finish_bonus
  from days d
  left join streaks s on s.user_id = d.user_id and s.read_on = d.read_on
)
select *, page_points + daily_bonus + streak_bonus + finish_bonus as points
from scored;

grant select on public.daily_scores to authenticated;
