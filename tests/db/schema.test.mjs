// Runs supabase/setup.sql in an in-memory Postgres (PGlite) with Supabase-like
// roles (anon / authenticated) and an auth.uid() stand-in, then checks grading,
// ranking, constraints and row-level security.
// Run: npm run test:db
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("../../", import.meta.url);
const KEY = new Map(JSON.parse(readFileSync(new URL("src/data/questions.json", root), "utf8")).map((q) => [q.id, q.answer]));
const A = "aaaaaaaa-0000-0000-0000-000000000001";
const B = "bbbbbbbb-0000-0000-0000-000000000002";
const C = "cccccccc-0000-0000-0000-000000000003";
let db;

// run SQL as a given role/user, like PostgREST does
async function as(role, uid, sql, params) {
  await db.exec(`reset role; select set_config('test.uid', '${uid ?? ""}', false); set role ${role};`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec("reset role;");
  }
}
const rejects = async (p, re) => assert.rejects(p, re);

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  await db.exec(readFileSync(new URL("supabase/setup.sql", root), "utf8"));
  // Supabase grants table privileges to these roles by default; RLS does the real gating
  await db.exec(`grant all on all tables in schema public to anon, authenticated;`);
  await db.exec(`insert into auth.users values ('${A}'), ('${B}'), ('${C}');`);
});

const play = async (uid, nCorrect) => {
  const s = (await as("authenticated", uid, "select start_test() r"))[0].r;
  const answers = s.question_ids.map((id, i) => (i < nCorrect ? KEY.get(id) : -1));
  const r = (await as("authenticated", uid, "select submit_test($1, $2) r", [s.attempt_id, answers]))[0].r;
  return { s, r };
};

test("seed loaded 130 questions", async () => {
  assert.equal((await db.query("select count(*)::int n from questions")).rows[0].n, 130);
});

test("anon cannot read the answer key, profiles, attempts or progress", async () => {
  for (const t of ["questions", "profiles", "test_attempts", "card_progress"]) {
    assert.equal((await as("anon", null, `select * from ${t}`)).length, 0, t);
  }
});

test("anon cannot start/submit tests or read stats, but can read the leaderboard", async () => {
  await rejects(as("anon", null, "select start_test()"), /permission denied/);
  await rejects(as("anon", null, "select submit_test(gen_random_uuid(), '{}')"), /permission denied/);
  await rejects(as("anon", null, "select get_my_stats()"), /permission denied/);
  assert.ok(Array.isArray(await as("anon", null, "select * from get_leaderboard(10)")));
});

test("signed-in users still cannot read the answer key", async () => {
  assert.equal((await as("authenticated", A, "select * from questions")).length, 0);
});

test("start_test requires a profile", async () => {
  await rejects(as("authenticated", A, "select start_test()"), /display name/);
});

test("display names: length, characters and case-insensitive uniqueness", async () => {
  for (const bad of ["ab", "x".repeat(21), "bad<script>", "émoji☕"]) {
    await rejects(as("authenticated", A, "insert into profiles (id, display_name) values ($1, $2)", [A, bad]), /violates check constraint/, bad);
  }
  await as("authenticated", A, "insert into profiles (id, display_name) values ($1, 'Espresso Ana')", [A]);
  await rejects(as("authenticated", B, "insert into profiles (id, display_name) values ($1, 'espresso ANA')", [B]), /duplicate key/);
  await as("authenticated", B, "insert into profiles (id, display_name) values ($1, 'Latte_Ben')", [B]);
  await as("authenticated", C, "insert into profiles (id, display_name) values ($1, 'Mocha.C')", [C]);
});

test("users cannot create or edit someone else's profile", async () => {
  await rejects(as("authenticated", A, "insert into profiles (id, display_name) values ($1, 'Hijack')", [C]), /row-level security/);
  const upd = await as("authenticated", A, "update profiles set display_name = 'Hacked' where id = $1 returning id", [B]);
  assert.equal(upd.length, 0);
  assert.equal((await as("authenticated", A, "select * from profiles")).length, 1, "sees only own profile");
});

test("start_test returns 100 distinct real questions and records server time", async () => {
  const s = (await as("authenticated", A, "select start_test() r"))[0].r;
  assert.equal(s.question_ids.length, 100);
  assert.equal(new Set(s.question_ids).size, 100);
  assert.ok(s.question_ids.every((id) => KEY.has(id)));
  assert.ok(Date.now() - Date.parse(s.started_at) < 60_000);
  // a new start abandons the previous unsubmitted attempt
  await as("authenticated", A, "select start_test()");
  assert.equal((await as("authenticated", A, "select count(*)::int n from test_attempts where submitted_at is null"))[0].n, 1);
});

test("submit_test grades on the server (all right / partly right / all skipped)", async () => {
  assert.equal((await play(A, 100)).r.score, 100);
  assert.equal((await play(B, 63)).r.score, 63);
  assert.equal((await play(C, 0)).r.score, 0);
  // wrong answers (not just skipped) also score 0
  const s = (await as("authenticated", C, "select start_test() r"))[0].r;
  const wrong = s.question_ids.map((id) => (KEY.get(id) === 0 ? 1 : 0));
  assert.equal((await as("authenticated", C, "select submit_test($1, $2) r", [s.attempt_id, wrong]))[0].r.score, 0);
});

test("result includes the correct answers and a rank", async () => {
  const { s, r } = await play(B, 10);
  assert.deepEqual(r.correct, s.question_ids.map((id) => KEY.get(id)));
  assert.ok(r.rank >= 1 && r.players >= 1);
});

test("cannot forge scores by writing to test_attempts directly", async () => {
  await rejects(
    as("authenticated", C, "insert into test_attempts (user_id, question_ids, total, score, duration_ms, submitted_at) values ($1, '{1}', 100, 100, 1, now())", [C]),
    /row-level security/
  );
  const upd = await as("authenticated", C, "update test_attempts set score = 100 where user_id = $1 returning id", [C]);
  assert.equal(upd.length, 0);
});

test("cannot submit twice, submit another user's attempt, or send the wrong number of answers", async () => {
  const s = (await as("authenticated", B, "select start_test() r"))[0].r;
  const ans = s.question_ids.map(() => 0);
  await rejects(as("authenticated", A, "select submit_test($1, $2)", [s.attempt_id, ans]), /not found/);
  await rejects(as("authenticated", B, "select submit_test($1, $2)", [s.attempt_id, [1, 2]]), /count/);
  await as("authenticated", B, "select submit_test($1, $2)", [s.attempt_id, ans]);
  await rejects(as("authenticated", B, "select submit_test($1, $2)", [s.attempt_id, ans]), /already submitted/);
});

test("attempts older than 3 hours cannot be submitted", async () => {
  const s = (await as("authenticated", C, "select start_test() r"))[0].r;
  await db.exec(`update test_attempts set started_at = now() - interval '3 hours 1 minute' where id = '${s.attempt_id}'`);
  await rejects(as("authenticated", C, "select submit_test($1, $2)", [s.attempt_id, s.question_ids.map(() => 0)]), /expired/);
});

test("users only see their own attempts", async () => {
  const rows = await as("authenticated", A, "select distinct user_id from test_attempts");
  assert.deepEqual(rows.map((r) => r.user_id), [A]);
});

test("leaderboard: best attempt per player, score first, then time", async () => {
  // make B tie A at 100 but faster, by fixing durations directly (as the DB owner)
  await play(B, 100);
  await db.exec(`update test_attempts set duration_ms = 5000 where user_id = '${B}' and score = 100;
                 update test_attempts set duration_ms = 9000 where user_id = '${A}' and score = 100;`);
  const lb = await as("anon", null, "select rank::int, display_name, score, attempts::int from get_leaderboard(10)");
  assert.deepEqual(lb.slice(0, 2).map((r) => [r.rank, r.display_name, r.score]), [[1, "Latte_Ben", 100], [2, "Espresso Ana", 100]]);
  assert.equal(lb.find((r) => r.display_name === "Mocha.C").score, 0, "C's best is 0");
  assert.equal(new Set(lb.map((r) => r.display_name)).size, lb.length, "one row per player");
  // ties on score AND time share a rank
  await db.exec(`update test_attempts set duration_ms = 5000 where user_id = '${A}' and score = 100;`);
  const tie = await as("anon", null, "select rank::int from get_leaderboard(10) limit 2");
  assert.deepEqual(tie.map((r) => r.rank), [1, 1]);
});

test("leaderboard limit is clamped", async () => {
  assert.ok((await as("anon", null, "select * from get_leaderboard(-5)")).length <= 1);
  assert.equal((await as("anon", null, "select * from get_leaderboard(2)")).length, 2);
});

test("get_my_stats reflects the caller's best attempt", async () => {
  const st = (await as("authenticated", B, "select get_my_stats() s"))[0].s;
  assert.equal(st.best_score, 100);
  assert.equal(st.rank, 1);
  assert.ok(st.attempts >= 3);
  assert.equal(st.players, 3);
});

test("card progress: users manage only their own rows", async () => {
  await as("authenticated", A, "insert into card_progress (user_id, question_id, status) values ($1, 101, 'known')", [A]);
  await rejects(as("authenticated", A, "insert into card_progress (user_id, question_id, status) values ($1, 101, 'known')", [B]), /row-level security/);
  await rejects(as("authenticated", A, "insert into card_progress (user_id, question_id, status) values ($1, 102, 'maybe')", [A]), /check constraint/);
  assert.equal((await as("authenticated", B, "select * from card_progress")).length, 0, "B can't see A's progress");
  assert.equal((await as("authenticated", B, "delete from card_progress where user_id = $1 returning 1", [A])).length, 0);
  assert.equal((await as("authenticated", A, "update card_progress set status = 'again' where question_id = 101 returning status"))[0].status, "again");
});

test("setup.sql is safe to run twice", async () => {
  await db.exec(readFileSync(new URL("supabase/setup.sql", root), "utf8"));
  assert.equal((await db.query("select count(*)::int n from questions")).rows[0].n, 130);
  assert.ok((await db.query("select count(*)::int n from profiles")).rows[0].n === 3, "data kept");
});
