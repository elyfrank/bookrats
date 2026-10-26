-- Bookrats: nova pontuação que premia a constância.
-- Cole no Supabase em "SQL Editor" > "New query" e clique em "Run" (uma vez só).
--
-- Regras, por pessoa e por dia (somando todas as leituras do dia):
--   páginas:          1 ponto por página até 50; 0,5 por página depois disso; máximo de 100
--   leitura do dia:   +10 se leu pelo menos 5 páginas no dia
--   sequência:        +2 por dia seguido lendo 5+ páginas, até +20 (a partir do 10º dia)
-- Os pontos são sempre calculados a partir de reading_logs, então mudar as regras aqui
-- recalcula todo o histórico.

create view public.daily_scores with (security_invoker = true) as
with days as (
  select user_id, read_on, sum(pages)::int as pages
  from public.reading_logs
  group by user_id, read_on
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
         least(2 * coalesce(s.streak_days, 0), 20) as streak_bonus
  from days d
  left join streaks s on s.user_id = d.user_id and s.read_on = d.read_on
)
select *, page_points + daily_bonus + streak_bonus as points
from scored;

grant select on public.daily_scores to authenticated;

-- Data de hoje no fuso do Brasil (o servidor usa UTC).
create function public.local_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- O ranking passa a usar a nova pontuação e mostra a sequência atual de cada membro.
drop function public.group_ranking(uuid);

create function public.group_ranking(gid uuid)
returns table (user_id uuid, name text, total_points bigint, week_points bigint, streak_days int)
language sql
stable
security definer set search_path = ''
as $$
  select p.id, p.name,
         coalesce(sum(s.points), 0)::bigint as total_points,
         coalesce(sum(s.points) filter (where s.read_on > public.local_today() - 7), 0)::bigint as week_points,
         -- A sequência continua viva se o último dia válido foi hoje ou ontem.
         coalesce((
           select s2.streak_days from public.daily_scores s2
           where s2.user_id = p.id and s2.streak_days > 0 and s2.read_on >= public.local_today() - 1
           order by s2.read_on desc
           limit 1
         ), 0) as streak_days
  from public.group_members m
  join public.profiles p on p.id = m.user_id
  left join public.daily_scores s on s.user_id = m.user_id
  where m.group_id = gid and public.is_group_member(gid)
  group by p.id, p.name
  order by total_points desc, p.name;
$$;
