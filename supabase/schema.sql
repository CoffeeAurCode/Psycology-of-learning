-- =====================================================================
-- Psychology of Learning · Coffee aur Code
-- Easiest: run supabase/setup.sql (this file + the 130 questions) once in
-- Supabase → SQL Editor → New query → Run.
-- Safe to re-run: everything is "create if not exists" / "create or replace".
-- =====================================================================

-- ---------- Questions (answer key lives here; tests are graded in SQL) ----------
create table if not exists public.questions (
  id      int primary key,           -- week*100 + question number, e.g. 304 = week 3 Q4
  week    int  not null,
  prompt  text not null,
  options jsonb not null,
  answer  int  not null              -- 0-based index into options
);
alter table public.questions enable row level security;
-- No policies on purpose: clients never read this table directly.

-- ---------- Profiles (public display name for the leaderboard) ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now(),
  constraint display_name_len   check (char_length(display_name) between 3 and 20),
  constraint display_name_chars check (display_name ~ '^[A-Za-z0-9_. -]+$')
);
create unique index if not exists profiles_display_name_key on public.profiles (lower(display_name));
alter table public.profiles enable row level security;

drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: read own"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------- Test attempts (written only by the functions below) ----------
create table if not exists public.test_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  question_ids int[] not null,
  started_at   timestamptz not null default now(),
  submitted_at timestamptz,
  answers      int[],
  score        int,
  total        int not null,
  duration_ms  int
);
create index if not exists test_attempts_user_idx on public.test_attempts (user_id);
create index if not exists test_attempts_rank_idx on public.test_attempts (score desc, duration_ms asc) where submitted_at is not null;
alter table public.test_attempts enable row level security;

drop policy if exists "attempts: read own" on public.test_attempts;
create policy "attempts: read own" on public.test_attempts for select using (auth.uid() = user_id);
-- No insert/update policies: only start_test()/submit_test() can write, so scores can't be forged.

-- ---------- Flashcard progress (synced across devices) ----------
create table if not exists public.card_progress (
  user_id     uuid not null references auth.users on delete cascade,
  question_id int  not null,
  status      text not null check (status in ('known', 'again')),
  updated_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);
alter table public.card_progress enable row level security;

drop policy if exists "progress: read own"   on public.card_progress;
drop policy if exists "progress: insert own" on public.card_progress;
drop policy if exists "progress: update own" on public.card_progress;
drop policy if exists "progress: delete own" on public.card_progress;
create policy "progress: read own"   on public.card_progress for select using (auth.uid() = user_id);
create policy "progress: insert own" on public.card_progress for insert with check (auth.uid() = user_id);
create policy "progress: update own" on public.card_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "progress: delete own" on public.card_progress for delete using (auth.uid() = user_id);

-- =====================================================================
-- Functions
-- =====================================================================

-- Start a ranked test: 100 random questions, start time stamped by the server.
create or replace function public.start_test()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid     uuid := auth.uid();
  qids    int[];
  aid     uuid;
  started timestamptz;
begin
  if uid is null then
    raise exception 'Please sign in first' using errcode = '28000';
  end if;
  if not exists (select 1 from profiles where id = uid) then
    raise exception 'Choose a display name first' using errcode = 'P0001';
  end if;

  -- one open attempt at a time; starting again abandons the previous one
  delete from test_attempts where user_id = uid and submitted_at is null;

  select array_agg(id) into qids
  from (select id from questions order by random() limit 100) s;

  if qids is null then
    raise exception 'No questions in the database yet (run seed.sql)';
  end if;

  insert into test_attempts (user_id, question_ids, total)
  values (uid, qids, array_length(qids, 1))
  returning id, started_at into aid, started;

  return json_build_object('attempt_id', aid, 'question_ids', qids, 'started_at', started);
end;
$$;

-- Leaderboard: each player's best attempt (highest score, then fastest).
create or replace function public.get_leaderboard(p_limit int default 100)
returns table (
  rank         bigint,
  user_id      uuid,
  display_name text,
  score        int,
  total        int,
  duration_ms  int,
  attempts     bigint,
  submitted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with best as (
    select distinct on (t.user_id)
           t.user_id, t.score, t.total, t.duration_ms, t.submitted_at
    from test_attempts t
    where t.submitted_at is not null
    order by t.user_id, t.score desc, t.duration_ms asc, t.submitted_at asc
  ),
  counts as (
    select t.user_id, count(*) as attempts
    from test_attempts t
    where t.submitted_at is not null
    group by t.user_id
  )
  select rank() over (order by b.score desc, b.duration_ms asc) as rank,
         b.user_id, p.display_name, b.score, b.total, b.duration_ms, c.attempts, b.submitted_at
  from best b
  join profiles p on p.id = b.user_id
  join counts  c on c.user_id = b.user_id
  order by rank, b.submitted_at
  limit least(greatest(coalesce(p_limit, 100), 1), 100000);
$$;

-- Submit answers; graded here against the server-side key.
-- p_answers[i] is the chosen option for question_ids[i], or -1 if skipped.
create or replace function public.submit_test(p_attempt uuid, p_answers int[])
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  a       test_attempts;
  s       int;
  correct int[];
  dur     int;
  my_rank bigint;
  players bigint;
begin
  select * into a from test_attempts
  where id = p_attempt and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Test attempt not found';
  end if;
  if a.submitted_at is not null then
    raise exception 'This test was already submitted';
  end if;
  if now() - a.started_at > interval '3 hours' then
    raise exception 'This test expired (3 hour limit). Start a new one.';
  end if;
  if coalesce(array_length(p_answers, 1), 0) <> array_length(a.question_ids, 1) then
    raise exception 'Answer count does not match';
  end if;

  select coalesce(sum(case when p_answers[i] = q.answer then 1 else 0 end), 0)::int,
         array_agg(q.answer order by i)
    into s, correct
  from generate_subscripts(a.question_ids, 1) as i
  join questions q on q.id = a.question_ids[i];

  dur := (extract(epoch from (clock_timestamp() - a.started_at)) * 1000)::int;

  update test_attempts
     set submitted_at = now(), answers = p_answers, score = s, duration_ms = dur
   where id = a.id;

  select l.rank into my_rank from get_leaderboard(100000) l where l.user_id = auth.uid();
  select count(distinct t.user_id) into players from test_attempts t where t.submitted_at is not null;

  return json_build_object(
    'score', s, 'total', a.total, 'duration_ms', dur,
    'correct', correct, 'rank', my_rank, 'players', players
  );
end;
$$;

-- Personal stats for the home screen.
create or replace function public.get_my_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'best_score',    (select l.score       from get_leaderboard(100000) l where l.user_id = auth.uid()),
    'best_total',    (select l.total       from get_leaderboard(100000) l where l.user_id = auth.uid()),
    'best_duration', (select l.duration_ms from get_leaderboard(100000) l where l.user_id = auth.uid()),
    'rank',          (select l.rank        from get_leaderboard(100000) l where l.user_id = auth.uid()),
    'attempts',      (select count(*) from test_attempts t where t.user_id = auth.uid() and t.submitted_at is not null),
    'players',       (select count(distinct t.user_id) from test_attempts t where t.submitted_at is not null)
  );
$$;

-- Who can call what
revoke all on function public.start_test()                from public, anon;
revoke all on function public.submit_test(uuid, int[])    from public, anon;
revoke all on function public.get_my_stats()              from public, anon;
revoke all on function public.get_leaderboard(int)        from public;
grant execute on function public.start_test()             to authenticated;
grant execute on function public.submit_test(uuid, int[]) to authenticated;
grant execute on function public.get_my_stats()           to authenticated;
grant execute on function public.get_leaderboard(int)     to anon, authenticated;
