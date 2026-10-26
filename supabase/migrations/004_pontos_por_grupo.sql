-- Bookrats: pontos do grupo só contam a partir da entrada da pessoa no grupo.
--
-- O cálculo diário (regras das migrações 002 e 003) vira a função score_days, que recebe a
-- partir de quando contar:
--   - pontuação pessoal (view daily_scores): desde sempre;
--   - ranking do grupo: desde group_members.joined_at. Só entram leituras registradas depois
--     disso (created_at), a sequência recomeça do zero no grupo e só valem livros concluídos
--     a partir do dia da entrada. Sair e entrar de novo reinicia a contagem.

create function public.score_days(target uuid, since timestamptz)
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
      and b.finished_on >= (since at time zone 'America/Sao_Paulo')::date
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

-- Pontuação pessoal: tudo desde sempre, só de quem está logado.
drop view public.daily_scores;

create view public.daily_scores with (security_invoker = true) as
select auth.uid() as user_id, s.*
from public.score_days(auth.uid(), '-infinity') s;

grant select on public.daily_scores to authenticated;

-- Ranking: cada membro pontua só a partir da própria entrada no grupo.
drop function public.group_ranking(uuid);

create function public.group_ranking(gid uuid)
returns table (
  user_id uuid,
  name text,
  total_points bigint,
  week_points bigint,
  streak_days int,
  joined_at timestamptz
)
language sql
stable
security definer set search_path = ''
as $$
  select p.id, p.name,
         coalesce(sum(s.points), 0)::bigint,
         coalesce(sum(s.points) filter (where s.read_on > public.local_today() - 7), 0)::bigint,
         -- A sequência continua viva se o último dia válido foi hoje ou ontem.
         coalesce((array_agg(s.streak_days order by s.read_on desc)
                   filter (where s.streak_days > 0 and s.read_on >= public.local_today() - 1))[1], 0),
         m.joined_at
  from public.group_members m
  join public.profiles p on p.id = m.user_id
  left join lateral public.score_days(m.user_id, m.joined_at) s on true
  where m.group_id = gid and public.is_group_member(gid)
  group by p.id, p.name, m.joined_at
  order by 3 desc, p.name;
$$;
