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


-- =====================================================================
-- Questions
-- =====================================================================
-- Generated by scripts/gen-seed.mjs — 130 questions. Run after schema.sql.
insert into public.questions (id, week, prompt, options, answer) values
  (1, 0, 'What is Psychology?', '["Just a social media trend","An art of living","A subject about human body","A study of cognitive processes & behavior"]'::jsonb, 3),
  (2, 0, 'A broad field of study that explores a variety of questions about thoughts, feelings and actions is ___?', '["Society","Globalization","Psychology","Social Science"]'::jsonb, 2),
  (3, 0, 'Learning has been a central topic of research in ___.', '["Chemistry","Physics","Mathematics","Psychology"]'::jsonb, 3),
  (4, 0, 'The word Psyche means ___?', '["Body or physique","Mind or soul","Spirituality","Hormones"]'::jsonb, 1),
  (5, 0, 'The ___ of learning focuses on how people learn.', '["psychology","english","chemistry","none of the given"]'::jsonb, 0),
  (6, 0, '"To help people to function effectively and fulfill their own unique potential" is the aim of ___?', '["Humanistic psychology","Evolutionary biology","Computer science","Microbiology"]'::jsonb, 0),
  (7, 0, 'Psychology is not an independent science, but dependent on other fields.', '["True","False"]'::jsonb, 1),
  (8, 0, 'The study of changes in an individual''s behavior during his/her lifetime is called ___.', '["Hormonal psychology","Gender psychology","Developmental Psychology","Genetics or Heredity"]'::jsonb, 2),
  (9, 0, 'The study of differences and similarities in the behavior of animals of different species is called ___.', '["Developmental psychology","Cultural psychology","Personality psychology","Comparative Psychology"]'::jsonb, 3),
  (10, 0, 'Humans are incapable of learning.', '["True","False"]'::jsonb, 1),
  (101, 1, 'Learning is often seen as the contiguous causal effect of ___ on behavior.', '["blood","bone density","trauma","experience"]'::jsonb, 3),
  (102, 1, 'In order to say that learning has occurred, a hidden change in behavior must occur.', '["True","False"]'::jsonb, 1),
  (103, 1, 'Which of the following is not a mental construct?', '["skeleton","knowledge","representations","associations"]'::jsonb, 0),
  (104, 1, 'Learning changes the ___ structure of the brain through the process of continuous interactions between the learner and the external environment.', '["physical","social","biological","none of the given"]'::jsonb, 0),
  (105, 1, '___ shapes the learning process.', '["Only thoughts","Only emotions","Both thoughts and emotions","Neither thoughts nor emotions"]'::jsonb, 2),
  (106, 1, 'Watson''s work included the famous Little Albert experiment in which he conditioned a small child to ___ a white rat.', '["fear","love","hate","play with"]'::jsonb, 0),
  (107, 1, 'Behaviorism dominated psychology for much of the early ___ century.', '["20th","19th","18th","17th"]'::jsonb, 0),
  (108, 1, 'The state of "conscious incompetence" may be valuable ___ of a learning experience.', '["at the end","in the middle","2 years after the end","at the start"]'::jsonb, 3),
  (109, 1, 'Which of the following is not an outcome of effective e-learning?', '["wider range of strategies","more reflective approach","more positive emotions towards learning","more disconnected knowledge"]'::jsonb, 3),
  (110, 1, 'Instrumental conditioning is an example of ___ learning.', '["sensitization","habituation","associative","meaningful"]'::jsonb, 2),
  (201, 2, 'The three major types of learning described by ___ psychology are classical conditioning, operant conditioning and observational learning.', '["cognitive","behavioral","emotional","evolutionary"]'::jsonb, 1),
  (202, 2, 'According to the view of Watson, psychology is ___.', '["subjective","only descriptive","experimental","about internal mental processes that cannot be measured and observed"]'::jsonb, 2),
  (203, 2, '___ is given by Ivan Pavlov.', '["Operant conditioning","Functional conditioning","Classical conditioning","Modern conditioning"]'::jsonb, 2),
  (204, 2, 'The process by which organisms learn to respond to certain stimuli but not to others is known as ___.', '["stimulus generalization","stimulus appreciation","stimulus discrimination","stimulus differentiation"]'::jsonb, 2),
  (205, 2, 'Higher-order conditioning is intrinsically weaker than its first-order counterpart.', '["True","False"]'::jsonb, 0),
  (206, 2, '___ is the process of gradually changing the quality of a response.', '["Shaping","Modeling","Cueing","Shifting"]'::jsonb, 0),
  (207, 2, 'The works of ___ were instrumental in engendering the dramatic shift from behaviorism to cognitive theories.', '["Edward C. Tolman","Jean Piaget","German Gestalt","All of the given"]'::jsonb, 3),
  (208, 2, '___ intelligence is the ability to perceive the visual-spatial world accurately and involves sensitivity to color, line, shape, form, space, and the potential for recognizing and manipulating the patterns of spaces.', '["Interpersonal","Spatial","Bodily-kinesthetic","Linguistic"]'::jsonb, 1),
  (209, 2, 'Sternberg proposed his theory in 1985 as an alternative to the idea of the ___.', '["general intelligence factor","multiple intelligences","specific intelligence factor","unconscious intelligence"]'::jsonb, 0),
  (210, 2, 'Which of the following is not a kind of product in the structure of intellect model?', '["symbolic","classes","systems","implications"]'::jsonb, 0),
  (301, 3, 'The connections between nerve cells are called ___.', '["systems","syntaxes","neurons","synapses"]'::jsonb, 3),
  (302, 3, 'In order to create a ___, information must be changed into a usable form, which occurs through a process known as encoding.', '["past memory","new imagination","new memory","past imagination"]'::jsonb, 2),
  (303, 3, 'Calling back the stored information in response to some cue for use in a process or activity is called ___.', '["Retrieval","Recall","Recollection","All of the given"]'::jsonb, 3),
  (304, 3, 'For many with ___ deficits, reading facial expressions and knowing how to respond are confusing daily challenges.', '["memory","intelligence","social cognition","biological cognition"]'::jsonb, 2),
  (305, 3, 'The Information Processing View of Learning assumes that there are limits to how much information can be processed at each stage.', '["True","False"]'::jsonb, 0),
  (306, 3, 'The Information Processing View of Learning assumes that information process is involved in ___.', '["forgetting","remembering","perceiving","All of the given"]'::jsonb, 3),
  (307, 3, 'The capacity of the sensory register is ___.', '["very small","very large","7+/-2 chunks","unlimited"]'::jsonb, 1),
  (308, 3, 'Most children do not begin to engage in the process of rehearsal on their own until about age ___.', '["seven","two","thirteen","one"]'::jsonb, 0),
  (309, 3, '___ provides an interface between the sub-systems of working memory and the part of long term memory specialized for episodic memory.', '["Phonological loop","Visuo-spatial sketchpad","Retrieval buffer","Episodic buffer"]'::jsonb, 3),
  (310, 3, 'Memories of specific episodes of one''s life refers to ___.', '["declarative memory","experimental episodic memory","autobiographical episodic memory","procedural memory"]'::jsonb, 2),
  (401, 4, '___ thinking is the ability to create mental representations of objects, places, events, or people in your mind.', '["General","Creative","Divergent","Symbolic"]'::jsonb, 3),
  (402, 4, 'We compare new information to our ___ of the person, place, or thing, so we know how to categorize the new information mentally.', '["protofit","protobite","prototype","none of the given"]'::jsonb, 2),
  (403, 4, 'Which of the following is not true?', '["Thinking is a higher mental process","Thinking is a sub-vocal talking","Thinking is fulfilling a need or problem solving","Thinking is only done in verbal symbols"]'::jsonb, 3),
  (404, 4, 'Mental images are ___.', '["Auditory","Visual","Gustatory","All of the given"]'::jsonb, 3),
  (405, 4, '___ organize complex phenomena into simpler, easily understandable, and usable categories and help to solve our problems.', '["Concepts","Propositions","Constructs","Components"]'::jsonb, 0),
  (406, 4, 'The lowermost level of Bloom''s taxonomy is ___.', '["remember","apply","understand","analyze"]'::jsonb, 0),
  (407, 4, 'The psychomotor domain of the Bloom''s taxonomy is concerned with ___.', '["Biological makeup","Thoughts and beliefs","Feelings and emotions","Skilled behavior"]'::jsonb, 3),
  (408, 4, 'Which of the following is an example of meta-cognition skills?', '["Ignoring your limits","Self-monitoring","Skimming all important information","All of the given"]'::jsonb, 1),
  (409, 4, '___ critical thinking skill helps you analyze and process information to come to an unbiased conclusion.', '["Open-mindedness","Self-regulation","Self-control","Observation"]'::jsonb, 0),
  (410, 4, 'The inspiration phase of the creative thinking process refers to the ___ stage.', '["Incubation","Insight","Evaluation","Preparation"]'::jsonb, 3),
  (501, 5, 'Which of the following is true about motivation?', '["It is a physical impulse","It is an external process","It has a willingness to activate but not channel the attitudes of learners","None of the given"]'::jsonb, 3),
  (502, 5, 'The term "motivation" comes from a ___ word.', '["Greek","Latin","Hindi","Bengali"]'::jsonb, 1),
  (503, 5, 'It is called extrinsic motivation if causal factor is ___.', '["curiosity","social pressure","self-satisfaction","needs"]'::jsonb, 1),
  (504, 5, '___ motivation is considered to be more crucial for students as it is associated with deep learning, better performance and self-efficacy.', '["Intrinsic","Extrinsic","Introjected regulation","None of the given"]'::jsonb, 0),
  (505, 5, '___ proposed that there are three primary drives that drive human behavior.', '["Hull","Watson","Piaget","Gestalt"]'::jsonb, 0),
  (506, 5, 'Expectancy Theory of Motivation was developed by ___.', '["Vroom","Hull","Murray","None of the given"]'::jsonb, 0),
  (507, 5, 'An example of ___ is thinking, "If I work hard I can achieve the targets my boss has set for me".', '["purposeful","valence","instrumentality","expectancy"]'::jsonb, 3),
  (508, 5, 'In SMART goals, T stands for ___.', '["Temporary","Time-based","Tough","Testing"]'::jsonb, 1),
  (509, 5, 'Friendship is a ___ need in Maslow''s hierarchy.', '["Love and belonging","Esteem","Physiological","Safety"]'::jsonb, 0),
  (510, 5, '___ theory differentiates between autonomous motivation and controlled motivation.', '["Arousal","Goal-setting","Need hierarchy","Self-determination"]'::jsonb, 3),
  (601, 6, 'According to Daniel Goleman, ___ component of emotional intelligence focuses on how we handle relationships with others.', '["self-awareness","motivation","empathy","emotional regulation"]'::jsonb, 2),
  (602, 6, 'Emotional intelligence can be considered a type of ___ intelligence.', '["academic","genetic","social","external"]'::jsonb, 2),
  (603, 6, 'Noticing a difficult emotion and slowing down or resisting any impulsive action that may follow highlights ___ component of emotional intelligence.', '["Self-regulation","Motivation","Emotional literacy","Empathy"]'::jsonb, 0),
  (604, 6, 'The following are signs of emotional intelligence, except ___.', '["strong sense of curiosity","holding onto mistakes","ability to manage emotions in difficult situations","self-confidence"]'::jsonb, 1),
  (605, 6, 'Perceiving emotions means ___.', '["Ignoring signals","Understanding only what somebody is saying to you","Understanding only somebody''s facial expression","Understanding both verbal and nonverbal signals"]'::jsonb, 3),
  (606, 6, '___ suggests that 10 distinct components provide the scaffolding of emotionally and socially intelligent behaviors.', '["Bar-On","Goleman","Salovey","Mayer"]'::jsonb, 0),
  (607, 6, 'Which of the following is a facilitator of EQ?', '["optimism","happiness","independence","all of the given"]'::jsonb, 3),
  (608, 6, '___ is a strategy for improving one''s self-awareness.', '["rejecting feedback","using critical self-talk daily","developing a fixed mindset","pursuing one''s passion"]'::jsonb, 3),
  (609, 6, 'Having students create autobiographies is an example of creating opportunities for ___.', '["emotional labor","emotional contagion","metacognition","none of the given"]'::jsonb, 2),
  (610, 6, 'Which of the following is not true about management of emotions?', '["It is essentially a private act","It is directly regulated by others","It is influenced by cultural norms","It is influenced by what society defines as appropriate to feel and express"]'::jsonb, 1),
  (701, 7, 'Which of the following is false about learning according to Gagne''s definition?', '["It is a change in human disposition","It persists over a period of time","It is simply ascribable to processes of growth","None of the above"]'::jsonb, 2),
  (702, 7, 'Manual or physical skills come under ___ component of Bloom''s taxonomy.', '["Cognitive","Affective","Psychomotor","Physical"]'::jsonb, 2),
  (703, 7, 'Reflection, learning and education was explored by ___.', '["Carl Rogers","John Watson","Benjamin Bloom","John Dewey"]'::jsonb, 3),
  (704, 7, 'The principles of ___ refer to how close in time two events must be for a bond to be formed.', '["behavior","reinforcement","repetition","contiguity"]'::jsonb, 3),
  (705, 7, '___ gives information to learners about their success or failure concerning the task at hand.', '["Cognitive feedback","Emotional feedback","Reinforcement","Physical feedback"]'::jsonb, 0),
  (706, 7, 'The ___ orientation to learning has a quality of personal involvement: the whole person in both feeling and cognitive aspects being in the learning event.', '["behavioral","cognitive","humanistic","social"]'::jsonb, 2),
  (707, 7, 'Learning through play is ___ learning.', '["primary","secondary","passive","active"]'::jsonb, 3),
  (708, 7, 'People with ___ learning style are prone to sorting their ideas after speaking, rather than thinking ideas through before.', '["logical","solitary","visual","auditory"]'::jsonb, 3),
  (709, 7, 'Which of the following statements is false?', '["Effective instruction is static","Effective instruction is eclectic","Effective instruction is generative","Effective instruction is interactive"]'::jsonb, 0),
  (710, 7, 'In ADDIE model, I stands for ___.', '["instruction","implementation","integration","induction"]'::jsonb, 1),
  (801, 8, 'The word ''pedagogy'' has been derived from the ___ word "pedagogue".', '["Latin","Sanskrit","Greek","English"]'::jsonb, 2),
  (802, 8, 'Which of the following statements is not true about pedagogy?', '["It is a method or way of teaching","It is derived from the Greek word \"pedagogue\"","It helps a teacher understand how learning should be facilitated.","It harms the quality of teaching and learning."]'::jsonb, 3),
  (803, 8, 'Pedagogy can enhance the student-teacher relationship.', '["True","False"]'::jsonb, 0),
  (804, 8, '___ learning is based on the model that knowledge can be created within a population where members actively interact by sharing experiences and take on asymmetry roles.', '["integrative","inquiry-based","collaborative","constructivist"]'::jsonb, 2),
  (805, 8, 'The Pedagogical Model provides an overview of the learning cycle and breaks it down into ___ domains or phases of instruction.', '["five","three","two","seven"]'::jsonb, 0),
  (806, 8, 'Which of the following is not a type of inquiry-based approach?', '["confrontation","structure","guided","open"]'::jsonb, 0),
  (807, 8, 'In experiential learning, students are engaged ___.', '["intellectually","soulfully","socially","all of the given"]'::jsonb, 3),
  (808, 8, '___ stage of experiential theory by Kolb focuses on planning.', '["concrete experience","abstract conceptualization","reflective observation","active experimentation"]'::jsonb, 3),
  (809, 8, 'People with a ___ learning style can often act on "gut feeling" and will rely on others'' analysis rather than their own.', '["accommodating","converging","diverging","assimilating"]'::jsonb, 0),
  (810, 8, 'According to the ___ principle, students learn better from animation and narration than from animation and on-screen text.', '["multimedia","modality","coherence","temporal contiguity"]'::jsonb, 1),
  (901, 9, 'E-learning is any form of ___.', '["teaching","training","tutoring","all of the given"]'::jsonb, 3),
  (902, 9, '___ is a feature of e-learning.', '["difficulty in access","user friendliness","social injustice","closed learning"]'::jsonb, 1),
  (903, 9, 'E-learning is a synonym of audio-visual learning, multimedia learning, and distance learning.', '["True","False"]'::jsonb, 1),
  (904, 9, 'Which of the following is not a type of e-learning?', '["text-driven","interactive","simulation","physical"]'::jsonb, 3),
  (905, 9, 'Which of the following is not a benefit of e-learning?', '["It can accommodate the need of a housewife","People can revise the learning content as many times as they want","It facilitates in developing and communicating new training policies","None of the given"]'::jsonb, 3),
  (906, 9, 'Good learners know ___.', '["What they are learning","Why they are learning","How they are learning","All of the given"]'::jsonb, 3),
  (907, 9, 'Learners may multitask when engaging in an online course, which could be resulting in ___.', '["hyperfocus","better retrieval","shorter attention spans","None of the given"]'::jsonb, 2),
  (908, 9, '___ learning is the crucial determinant of successful e-learning.', '["passive","retrospective","social","active"]'::jsonb, 3),
  (909, 9, 'The brain can process 36,000 visual cues per ___.', '["hour","second","day","year"]'::jsonb, 0),
  (910, 9, 'For effective learning, online courses should ___.', '["use headings","use complex language","present long pieces of text","use random images"]'::jsonb, 0),
  (1001, 10, 'During Covid-19 the world was busy in preparing 1.5 billion learners for the new normal, i.e., ___ learning.', '["ineffective","physical","remote","experiential"]'::jsonb, 2),
  (1002, 10, 'To develop learner readiness for online learning, training sessions on ___ are helpful.', '["netiquettes","time management","developing study skills","all of the given"]'::jsonb, 3),
  (1003, 10, 'The typical picture of a teacher being a dispenser of knowledge to the students has been replaced by that of a ___.', '["obstructor","parent","friend","facilitator"]'::jsonb, 3),
  (1004, 10, 'In 2018, Global Education and Skills Forum noted that the ''future'' teacher would need 5 skills to thrive in the 21st century. Which of the following is not one of them?', '["Strong social skills","Data analysis","External focus","Strictness"]'::jsonb, 3),
  (1005, 10, 'Participatory education demands ___ so as to build a needs-based approach to teaching.', '["creativity","stubbornness","reward","none of the given"]'::jsonb, 0),
  (1006, 10, 'Students who consider intelligence as a malleable entity tend to focus on their obstacles instead of goals.', '["True","False"]'::jsonb, 1),
  (1007, 10, 'Which of the following is not a principle to enhance student learning?', '["What students already know affects their learning","Learning is context-based","Students'' cognitive development and learning is limited by the general stages of development.","The acquisition of knowledge and skills in the long term depends largely on practice."]'::jsonb, 2),
  (1008, 10, '___ feedback to students is important for learning.', '["Unclear","Late","Harsh","Explanatory"]'::jsonb, 3),
  (1009, 10, 'Mastery goals are those that are geared towards the acquisition or improvement of ___.', '["Skills","Number of students in a classroom","Teacher feedback","None of the given"]'::jsonb, 0),
  (1010, 10, 'The vast majority of formative assessment is ___.', '["Formal","Incorrect","Written","informal"]'::jsonb, 3),
  (1101, 11, 'Social cognition has a protracted development through infancy to ___.', '["teenage","old-age","adulthood","death"]'::jsonb, 2),
  (1102, 11, 'Which of the following abilities comes under social cognition?', '["Face processing","Joint attention","Theory of mind","All of the given"]'::jsonb, 3),
  (1103, 11, 'Under social cognition, abilities involved in affective processing are often called ___.', '["hot","cold","white","black"]'::jsonb, 0),
  (1104, 11, 'Social schemas refer to people''s mental representations of social ___.', '["values","memories","skills","patterns"]'::jsonb, 3),
  (1105, 11, 'During the earliest stages of development, children are very ___-centric. They see the world from their own perspective and struggle to think about how other people may view the world.', '["selfish","ego","conscious","emotional"]'::jsonb, 1),
  (1106, 11, 'A theory of mind refers to a person''s ability to understand and think about the ___ of other people.', '["behaviors","family backgrounds","mental states","language"]'::jsonb, 2),
  (1107, 11, 'The same social behavior in one cultural setting might have a very different meaning and interpretation if it were to occur or be observed in another culture.', '["True","False"]'::jsonb, 0),
  (1108, 11, 'Social cognitive theory by Bandura focuses on concepts of ___.', '["self-efficacy","modeling","observational learning","all of the given"]'::jsonb, 3),
  (1109, 11, 'The central tenet of Bandura''s social-cognitive theory is that people seek to develop a sense of ___ over the important events in their lives.', '["agency","dependency","attachment","emotion"]'::jsonb, 0),
  (1110, 11, '___ hypothesis suggests that social processes influence how information is selected, organized, integrated, and retrieved.', '["activation","cognitive influence","interaction","social cue strength"]'::jsonb, 1),
  (1201, 12, 'Sustainability in economic sustainability is ___.', '["multidimensional","bidimensional","unidimensional","none of the given"]'::jsonb, 2),
  (1202, 12, 'The term "sustainable development" was first mentioned in a book related to the 1972 UN Stockholm conference on ___.', '["water","poverty","economic crisis","human environment"]'::jsonb, 3),
  (1203, 12, 'Environmental sustainability focuses on impacts of processes, products and services on ___.', '["water","biodiversity","human health","all of the given"]'::jsonb, 3),
  (1204, 12, 'Which of the following does not come under social sustainability?', '["Labour practices","Revenue generation","Human rights","Business ethics"]'::jsonb, 1),
  (1205, 12, 'SDG ___ focuses on clean water and sanitation.', '["1","17","6","3"]'::jsonb, 2),
  (1206, 12, 'SDG 16 focuses on ___.', '["No poverty","No hunger","Good health","Peace and justice"]'::jsonb, 3),
  (1207, 12, 'On 20 October 2020, the Higher Education Sustainability Initiative (HESI) raised the flag of higher education as a driver for sustainable development and inclusive societies on the first day of the ___ 2020.', '["National Sustainability Meeting","National Teachers Meeting","Global Childrens'' Meeting","Global Education Meeting"]'::jsonb, 3),
  (1208, 12, 'Education is related to all SDGs.', '["True","False"]'::jsonb, 0),
  (1209, 12, 'Successful implementation of ESD requires a shift in focus from ___.', '["teaching to learning","learning to teaching","reading to speaking","knowing to ignoring"]'::jsonb, 0),
  (1210, 12, '___ competency is the ability to reflect on one''s own role in the local community and (global) society.', '["collaboration","self-awareness","strategic","normative"]'::jsonb, 1)
on conflict (id) do update
  set week = excluded.week, prompt = excluded.prompt, options = excluded.options, answer = excluded.answer;
