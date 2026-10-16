# L4.02 · Test it II: database tests in PGlite with simulated Supabase roles

> **Level 4 · Test it and ship it** · Lesson 2 of 8

| Recipe card | |
|---|---|
| **Time** | 75 min |
| **You need** | L4.01 (`node:test`, mutation checks), L2.02–L2.03 (schema, policies, functions), L3.01 (how Supabase applies roles and claims) |
| **You'll produce** | `tests/db/schema.test.mjs` (190 lines, 19 tests) from a blank file: an in-memory Postgres with Supabase-like roles, a role-switching helper, and tests for every policy, grant, constraint and function |

**In two sentences:** The security model of L3.01 is only a claim until something tries to break it, and the fastest place to try is a real Postgres running in-process: PGlite is Postgres compiled to WebAssembly, so `npm run test:db` boots a database, loads the exact `setup.sql` users run in Supabase, and attacks it as `anon` and as three signed-in users in about 1.5 seconds. This lesson builds the emulation line by line, shows which single line makes the tests test *RLS* rather than privileges, and proves with two SQL mutations that the suite catches broken rules.

### Objectives
1. Build the Supabase emulation from memory: roles, the `auth` schema, an `auth.uid()` stand-in, schema and table grants.
2. Write the `as(role, uid, sql)` helper and explain why `reset role` sits in a `finally`.
3. Write tests for each policy (allowed and denied), each grant, each constraint and each function's checks, and predict the error text for each denial.
4. Explain how the tests manipulate time and durations as the database owner, and why that's legitimate.
5. Prove the suite's strength with SQL mutation checks, and name what this layer can't catch.

---

## 1 · Warm-up: pull it from memory

1. *(L3.01)* Inside a PostgREST request, where does `auth.uid()` get the user id from?
2. *(L3.01)* A blocked `update` on a table with RLS: error, or zero rows?
3. *(L4.01)* What does a mutation check prove?

<details><summary>Answers</summary>

1. From the request's JWT claims, which PostgREST stores as settings for the transaction (the `sub` claim).
2. Zero rows, no error. Only inserts (and updates whose new row fails `WITH CHECK`) raise 42501.
3. That the tests are connected to what they test: break it on purpose and the right test fails.
</details>

## 2 · The problem this solves

Testing RLS against the real Supabase project is possible (L4.06 does it), but it needs network, credentials, real users, and cleanup, and each run takes minutes. Testing it by reading the SQL is not testing.

**The idea:** run the exact production SQL in a local Postgres and reproduce the *two things Supabase adds*: database roles that requests run as, and a function that returns the current user's id. Everything else (tables, policies, functions, grants) is the real file.

```mermaid
sequenceDiagram
  participant T as test
  participant H as as(role, uid, sql)
  participant P as PGlite (Postgres in WASM)
  T->>H: as("authenticated", A, "select start_test()")
  H->>P: reset role; select set_config('test.uid', A, false); set role authenticated;
  H->>P: select start_test()
  P->>P: grant check → function runs as owner → auth.uid() = current_setting('test.uid') = A
  P-->>H: rows
  H->>P: reset role   (in finally, even if the query threw)
  H-->>T: rows (or the error, rethrown)
```

---

## 3 · Concepts

### 3.1 PGlite

1. **Definition.** PGlite is real PostgreSQL (the server's C code) compiled to WebAssembly and packaged as a JavaScript library. `new PGlite()` starts an in-memory database inside the Node process.
2. **Why here.** No Docker, no installed Postgres, no network. The test file is self-contained and runs anywhere Node runs.
3. **How it works.** It's a single-user, single-connection Postgres: `db.exec(sql)` runs one or more statements; `db.query(sql, params)` runs one statement with `$1`-style parameters and returns `{ rows }`.
4. **Minimal example.**
   ```js
   import { PGlite } from "@electric-sql/pglite";
   const db = new PGlite();
   await db.exec("create table t (x int); insert into t values (1), (2);");
   console.log((await db.query("select sum(x)::int s from t")).rows[0].s); // 3
   ```
5. **In the project.** One database for the whole file, created in `before()`.
6. **What it can't do.** One connection means no concurrency tests (L3.02's double-submit race). It's Postgres 17 in WASM, not Supabase: no PostgREST, no GoTrue, no real JWTs.

### 3.2 What Supabase adds, and how the tests fake it

| In Supabase | In the tests | Why it's a faithful stand-in |
|---|---|---|
| Roles `anon`, `authenticated` (PostgREST switches to them per request) | `create role anon nologin; create role authenticated nologin;` and `set role …` per query | Grants and policies are checked against the current role in both cases |
| `auth.users` table | `create table auth.users (id uuid primary key)` | Foreign keys from `profiles`, `test_attempts`, `card_progress` need it |
| `auth.uid()` reads the JWT `sub` from request settings | `auth.uid()` reads `current_setting('test.uid', true)` | Same signature (`returns uuid`), same "null when signed out" behaviour |
| Default table privileges for `anon`/`authenticated` on `public` | `grant all on all tables in schema public to anon, authenticated` | Makes RLS, not privileges, the gate (§7.1) |
| Usage on schemas | `grant usage on schema public, auth to anon, authenticated` | Without it, every name lookup fails |

### 3.3 `set role`, `reset role` and `set_config`

- **`set role anon`** makes the session act as `anon` for privilege and policy checks until `reset role`. The test process connects as the superuser, so everything outside `as()` runs with full rights.
- **`select set_config('test.uid', '<uuid>', false)`** sets a custom setting; `false` means "for the session", not just the current transaction. Custom settings need a dotted name (`test.uid`).
- **`current_setting('test.uid', true)`**: the `true` means "return null instead of erroring if it was never set". `nullif(…, '')::uuid` turns the empty string used for signed-out calls into `null`.

### 3.4 Shared state, on purpose

All tests share one database and run **in file order** (node:test runs a file's top-level tests sequentially). Later tests use profiles created by earlier ones ("Espresso Ana", "Latte_Ben", "Mocha.C"). That makes the file read like a story, and it's fast (one boot), but each test isn't independent: run one alone with `--test-name-pattern` and it may fail for lack of setup. The trade-off is recorded in §8.

---

## 4 · Reading the real code

### 4.1 Imports, data and identities (lines 1–16)

```js
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
```
- **`KEY`**: a `Map` from question id to answer index, built from the same JSON the app ships. Tests use it to produce right, wrong and partly-right answer sheets.
- **Three readable UUIDs**: A, B and C are recognisable in failure messages (`aaaaaaaa-…`), unlike random ones.
- **`before`** (imported) runs once before all tests.

### 4.2 The role-switching helper (lines 18–27)

```js
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
```
- **Three statements in one `exec`**: back to the superuser (so `set_config` and `set role` are allowed), set the user id (empty for anonymous), then become the role.
- **String interpolation of `uid` and `role`** is acceptable *here* because both come from the test file's own constants, never from input. Production code must never build SQL this way.
- **`try … finally { reset role }`**: if the query throws (which many tests expect), the session must still return to the superuser. Without `finally`, the next test's setup (`db.exec(… update test_attempts …)` as owner) would run as `anon` and fail with a confusing "permission denied" far from the real cause.
- **`rejects(p, re)`** wraps `assert.rejects`: it awaits the promise, requires it to reject, and requires the error message to match the regex. A query that *succeeds* when it should be denied fails the test.

### 4.3 Booting the emulation (lines 29–42)

```js
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
```
- **`nologin`**: these roles can't connect; they're only switched to, exactly like in Supabase.
- **`auth.uid()` as `language sql stable`**: `stable` tells Postgres the result doesn't change within a statement, which lets it evaluate it once per query (Supabase's real one is also `stable`).
- **Load the real `setup.sql`** (schema + 130 questions), the same file users paste into the Supabase SQL editor. There's no test-only copy of the schema to drift.
- **The grant line comes after `setup.sql`** because `grant … on all tables` applies to tables that exist at that moment. §7.1 shows what happens without it.
- **Three users in `auth.users`**: needed for the foreign keys.

### 4.4 The `play` helper (lines 44–49)

```js
const play = async (uid, nCorrect) => {
  const s = (await as("authenticated", uid, "select start_test() r"))[0].r;
  const answers = s.question_ids.map((id, i) => (i < nCorrect ? KEY.get(id) : -1));
  const r = (await as("authenticated", uid, "select submit_test($1, $2) r", [s.attempt_id, answers]))[0].r;
  return { s, r };
};
```
- **One full ranked test** as a given user: start, answer the first `nCorrect` correctly and skip the rest (`-1`, the app's encoding for skipped), submit.
- **`select start_test() r`**: aliasing the result column `r` makes `[0].r` the JSON object.
- **`$1, $2` parameters**: PGlite sends the JS array as a Postgres `int[]`.

### 4.5 The tests, grouped by what they prove

**Seed and anonymous access (lines 51–66).**
```js
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
```
- **`count(*)::int`**: `count` returns `bigint`. PGlite happens to convert safe `bigint`s to JS numbers (measured: `count(*)` came back as `1`), but other drivers such as `node-postgres` return them as strings, so the cast makes the type explicit and the test portable.
- **Zero rows, not an error** for anonymous selects: RLS default-deny (L3.01 §3.2).
- **`permission denied`** for the revoked functions: the grant check fails before the body runs. The leaderboard returns an array (empty here, nobody has played yet).

**Signed-in reads, profiles and constraints (lines 68–91).**
```js
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
```
- **Signing in doesn't unlock the key**: `questions` has no select policy for anyone.
- **`start_test` checks the profile first**: the error text is the function's own ("Choose a display name first").
- **Four bad names**, each one constraint: 2 characters (length), 21 characters (length), `<script>` (allowed-characters regex), `émoji☕` (non-ASCII). The third argument to `rejects` (`bad`) labels which one failed.
- **Case-insensitive uniqueness**: "espresso ANA" collides with "Espresso Ana" because the unique index is on `lower(display_name)`. Error: `duplicate key value violates unique constraint`.
- **The allowed characters** include `_` and `.` ("Latte_Ben", "Mocha.C"), so the test also proves the regex isn't too strict.
- **Writing someone else's row**: the insert hits `with check (auth.uid() = id)` → "new row violates row-level security policy"; the update matches zero rows (`returning id` gives `[]`). Select shows only A's own profile.

**Starting, grading and results (lines 93–118).**
```js
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
```
- **100, distinct, real**: length, `Set` size, and every id in the key. `started_at` is within a minute of now (the server's clock, read in JS).
- **Abandon on restart**: two starts leave exactly one open attempt (the function deletes the previous one).
- **Three grading cases** plus a fourth: "all wrong" (not just skipped). `KEY.get(id) === 0 ? 1 : 0` picks a guaranteed-wrong option for each question, so a bug that treated "answered" as "correct" would score 100 here.
- **`r.correct`** equals the key in the test's order (the `array_agg(… order by i)` of L3.02).

**Integrity attacks (lines 120–147).**
```js
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
```
- **Forge by insert** → RLS error (no insert policy). **Forge by update** → zero rows (no update policy).
- **The submit checks in order of the function's code**: another user's attempt ("not found", the ownership filter), wrong length ("count"), then a valid submit, then a repeat ("already submitted"). The order matters: the wrong-length call must come *before* the valid one, or "already submitted" would win.
- **Time travel as the owner**: the expiry can't be tested by waiting three hours. `db.exec` (outside `as`, so as the superuser) back-dates `started_at` by 3 h 1 min. This is legitimate because it simulates the passage of time, not something a user could do: users can't update `test_attempts` at all.
- **Own attempts only**: by now B and C have many attempts; A's select returns only A's id.

**Ranking and stats (lines 149–175).**
```js
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
```
- **Durations are set by hand** because real ones (a few ms each) are effectively random. With A at 9 s and B at 5 s on a perfect score, B must be first. That's "score, then time".
- **C's best is 0** (C never scored), and **one row per player** proves `distinct on`.
- **The tie**: set A to exactly B's time, and both get rank 1.
- **The clamp**: `-5` becomes 1 (at most one row); `2` returns exactly two.
- **Stats agree with the board**: B is rank 1 with 100 and has played at least three times; three players exist.

**Progress and idempotence (lines 177–190).**
```js
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
```
- **All four progress policies** in one test: own insert works; inserting for B fails (`with check`); an invalid status fails the check constraint (`'maybe'` isn't `known`/`again`); B sees nothing and deletes nothing of A's; A can update its own row.
- **Idempotence**: run `setup.sql` again on a database full of data. Still 130 questions (the seed's `on conflict do update`), and the 3 profiles survive (the schema's `create … if not exists`, `drop policy if exists`, `create or replace`). This is what makes "re-run `setup.sql` after editing a question" safe for the real project.

---

## 5 · Worked trace: the RLS test matrix

Each cell is a test assertion in this file (✓ allowed, ✗ denied with the error shown, ∅ zero rows).

| Table | anon select | own select | other's select | own insert | other's insert | own update | other's update | delete |
|---|---|---|---|---|---|---|---|---|
| `questions` | ∅ | ∅ | — | — | — | — | — | — |
| `profiles` | ∅ | ✓ (1 row) | ∅ | ✓ | ✗ RLS | — | ∅ | — |
| `test_attempts` | ∅ | ✓ | ∅ | ✗ RLS | — | ∅ | — | — |
| `card_progress` | ∅ | ✓ | ∅ | ✓ | ✗ RLS | ✓ | — | ∅ (other's) |

**Predict** before reading §7.2: if the select policy on `card_progress` were changed to `using (true)`, which cell turns wrong, and does any test notice?

<details><summary>Reveal</summary>"other's select" on <code>card_progress</code> becomes ✓ (everyone sees everyone's progress), and the assertion <code>"B can't see A's progress"</code> fails. Verified in §7.2.</details>

---

## 6 · Running and testing

```bash
npm run test:db
```
```text
✔ seed loaded 130 questions
✔ anon cannot read the answer key, profiles, attempts or progress
✔ anon cannot start/submit tests or read stats, but can read the leaderboard
…
✔ card progress: users manage only their own rows
✔ setup.sql is safe to run twice
ℹ tests 19
ℹ pass 19
ℹ fail 0
ℹ duration_ms 1432
```
- Most of the time is the first test, which includes booting Postgres and loading 130 questions (~1.3 s); the other 18 take milliseconds each.
- On Windows you may see "The system cannot find the path specified." printed by the shell before the run; it's noise from npm's script shell, not from the tests.
- **Run one test by name**: `node --test --test-name-pattern="leaderboard" tests/db/schema.test.mjs`. Because of shared state (§3.4), tests late in the file may need the earlier ones, so filter by a pattern that includes their setup, or run the whole file.

## 7 · Bug journal

### 7.1 Known foot-gun, verified · Testing privileges instead of RLS

1. **Symptom.** Remove one line (`grant all on all tables in schema public to anon, authenticated`) and the suite turns red with messages like:
   ```text
   ✖ anon cannot read the answer key, profiles, attempts or progress
     error: permission denied for table questions
   ✖ cannot forge scores by writing to test_attempts directly
     actual: error: permission denied for table test_attempts
   ℹ pass 3
   ℹ fail 16
   ```
2. **Diagnosis.** Every denial now comes from the **privilege** check, which runs before RLS. The tests that expect RLS errors (`/row-level security/`) or zero rows fail because they get a different error.
3. **Root cause.** A plain Postgres doesn't grant `anon` or `authenticated` anything. Supabase does, and relies on RLS. Without reproducing that default, the tests would be checking a stricter database than production. Worse, if you "fixed" the failing assertions to accept "permission denied", the suite would pass while proving nothing about the policies that actually protect production.
4. **Fix.** Reproduce Supabase's default, after the schema is loaded:
   ```js
   // Supabase grants table privileges to these roles by default; RLS does the real gating
   await db.exec(`grant all on all tables in schema public to anon, authenticated;`);
   ```
5. **Lesson.** An emulator must reproduce the production defaults that your security depends on, and each assertion should pin the **specific** error (`/row-level security/`, `/permission denied/`), so a denial for the wrong reason fails.

### 7.2 Mutation checks on the SQL

Run for this lesson against a temporary copy of `setup.sql`, then restored (`git status` clean, 19/19 passing again):

| Mutation | Test that failed | Message |
|---|---|---|
| `progress: read own` → `using (true)` | card progress: users manage only their own rows | `AssertionError: B can't see A's progress` |
| `submit_test`: `where id = p_attempt and user_id = auth.uid()` → `where id = p_attempt` | cannot submit twice, submit another user's attempt, … | `expected: /not found/` |

Each security rule is pinned by at least one assertion that fails when the rule is weakened. Try your own: drop the unique index on `lower(display_name)`, or delete `revoke all on function public.get_my_stats() from public, anon`.

### 7.3 Clean run

The file passed on its first full run in the session; the schema had already been verified in PGlite before the user ran it in Supabase (L1.01 build log, step 8), which is why no SQL bug ever reached production.

## 8 · Why this design

| Decision | Alternatives | Why this one | Trade-off | Choose differently when |
|---|---|---|---|---|
| PGlite in-process | Docker Postgres; the Supabase CLI's local stack; testing only against the live project | Seconds, no installs, no network, no secrets | Single connection; no PostgREST/JWT | Concurrency tests or full API emulation → `supabase start` (local stack) |
| Load the real `setup.sql` | A test-only schema | Zero drift between tested and deployed SQL | Tests depend on seed data | — |
| `auth.uid()` from a custom setting | Mint and verify fake JWTs | Tiny, explicit, same function signature | Doesn't test JWT parsing | Custom JWT claims used in policies → emulate `request.jwt.claims` |
| Shared database, ordered tests | Fresh database per test | One boot (~1.3 s) instead of 19 | Order-dependent; harder to run one test alone | Large suites → per-test transactions rolled back, or templates |
| Specific error regexes | Any rejection | Catches "denied for the wrong reason" | Breaks if error texts change | — |

## 9 · Check yourself

**Q1.** You forget the `finally { reset role }` in `as()`. A test expects `start_test` to be denied for `anon`, and the next test runs `db.exec("update test_attempts …")`. What happens?
<details><summary>Answer</summary>The denial throws inside the <code>try</code>; without <code>finally</code> the session stays as <code>anon</code>. The next test's owner-level update runs as <code>anon</code> and fails with a permission or RLS error, in a test that has nothing to do with the cause.</details>

**Q2.** Why does `display names: …` insert "Latte_Ben" and "Mocha.C" at all, if it's a test of rejections?
<details><summary>Answer</summary>To prove the allowed-characters rule isn't too strict (underscore and dot are permitted), and because later tests need three profiles.</details>

**Q3.** Predict the error message for `as("authenticated", A, "insert into profiles (id, display_name) values ($1, 'Hijack')", [C])`.
<details><summary>Answer</summary><code>new row violates row-level security policy for table "profiles"</code> (matched by <code>/row-level security/</code>): A passes the privilege check but fails <code>with check (auth.uid() = id)</code>.</details>

**Q4.** How does the suite test a 3-hour expiry without waiting?
<details><summary>Answer</summary>As the database owner, it back-dates the attempt's <code>started_at</code> by 3 h 1 min, then submits as the user and expects "expired".</details>

**Q5.** Which of these can this layer **not** catch? (a) A policy that's too permissive. (b) The Supabase dashboard's "Email OTP length" set to 8. (c) A missing `revoke` on a new function. (d) RLS accidentally disabled on the live project.
<details><summary>Answer</summary><b>(b) and (d).</b> They're settings of the live project, not of <code>setup.sql</code>. The live tests of L4.06 cover them (the signed-in journey types a real code; the anonymous tests read every table).</details>

**Q6.** Why does the leaderboard test set durations by hand instead of using the real ones?
<details><summary>Answer</summary>Real durations are a few milliseconds and effectively random, so the order between equal scores would be flaky. Fixed values make "score, then time" deterministic.</details>

## 10 · Practice

**Easy (10 min).** Add an assertion that `anon` can't call `start_test` even with a user id set (`as("anon", A, …)`), and explain why the result is the same.

**Medium (20 min).** Add the catalog test from L3.01 §7.1 ("every public table has RLS enabled") and a test that every function in `public` other than `get_leaderboard` is **not** executable by `anon` (query `has_function_privilege('anon', oid, 'execute')` over `pg_proc`).
**Done when** both pass, and each fails if you remove one `enable row level security` or one `revoke` line from a temporary copy of `setup.sql`.

**Hard (40 min).** Make each test independent: wrap every test in a transaction that's rolled back at the end (`begin` … `rollback`), with a shared fixture function that creates the three profiles.
**Done when** `--test-name-pattern` can run any single test successfully and the whole file still passes.
<details><summary>Key insight</summary>The functions use <code>now()</code> (transaction start time); inside one long transaction per test, "started_at" and "submitted" share the same <code>now()</code>. <code>clock_timestamp()</code> in <code>submit_test</code> still advances, so durations stay positive. Check the expiry test, which back-dates rows inside the same transaction.</details>

## 11 · From memory

**Rung 1 · Cloze.**

```js
async function as(role, uid, sql, params) {
  await db.exec(`reset role; select ___①___('test.uid', '${uid ?? ""}', false); set role ${role};`);
  try { return (await db.query(sql, params)).rows; }
  ___②___ { await db.exec("reset role;"); }
}
before(async () => {
  db = new ___③___();
  await db.exec(`
    create role anon ___④___; create role authenticated nologin;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('test.uid', ___⑤___), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;`);
  await db.exec(readFileSync(new URL("supabase/setup.sql", root), "utf8"));
  await db.exec(`grant ___⑥___ on all tables in schema public to anon, authenticated;`);
});
await rejects(as("anon", null, "select start_test()"), /___⑦___/);
await rejects(as("authenticated", A, "insert into profiles … values ($1, 'Hijack')", [C]), /___⑧___/);
```
<details><summary>Answers</summary>① <code>set_config</code> ② <code>finally</code> ③ <code>PGlite</code> ④ <code>nologin</code> ⑤ <code>true</code> ⑥ <code>all</code> ⑦ <code>permission denied</code> ⑧ <code>row-level security</code></details>

**Rung 2 · Blank page (25 min). No scrolling up.** Write the emulation, the `as` and `play` helpers, and at least ten of the nineteen tests, covering every row of the §5 matrix.
<details><summary>Self-check</summary>

- [ ] Roles `nologin`; `auth` schema, `auth.users`, `auth.uid()` from `current_setting(…, true)`; schema usage grants
- [ ] Real `setup.sql` loaded, then `grant all on all tables … to anon, authenticated`; three users
- [ ] `as()`: reset → set_config → set role; query; `finally` reset
- [ ] `play()`: start, answer first n correctly with `-1` for the rest, submit
- [ ] anon: zero rows on all four tables; permission denied on three functions; leaderboard is an array
- [ ] Profiles: four bad names (check constraint), case-insensitive duplicate, other's insert (RLS), other's update (zero rows)
- [ ] Grading: 100 / 63 / 0 / all-wrong; `correct` array; forge by insert and update; submit other's / wrong count / twice; expiry by back-dating
- [ ] Ranking with hand-set durations, tie → [1, 1], clamp; stats agree
- [ ] Progress policies; `setup.sql` run twice keeps data
</details>

## 12 · Flashcards

<details><summary><b>Q:</b> What is PGlite?</summary><b>A:</b> Real Postgres compiled to WebAssembly, running in-process, in memory.</details>
<details><summary><b>Q:</b> Which two Supabase features does the test emulate?</summary><b>A:</b> The request roles (<code>anon</code>, <code>authenticated</code>) and <code>auth.uid()</code> (plus <code>auth.users</code> and the default grants).</details>
<details><summary><b>Q:</b> Why <code>reset role</code> in a <code>finally</code>?</summary><b>A:</b> So a query that throws doesn't leave the session as <code>anon</code> for the next test.</details>
<details><summary><b>Q:</b> What does <code>current_setting('test.uid', true)</code>'s <code>true</code> do?</summary><b>A:</b> Returns null instead of erroring when the setting doesn't exist.</details>
<details><summary><b>Q:</b> Why grant all table privileges to anon and authenticated?</summary><b>A:</b> To match Supabase's defaults, so denials come from RLS (16 tests fail without it).</details>
<details><summary><b>Q:</b> How is the 3-hour expiry tested?</summary><b>A:</b> Back-date <code>started_at</code> as the owner, then submit as the user.</details>
<details><summary><b>Q:</b> Why set durations by hand in the ranking test?</summary><b>A:</b> Real ones are milliseconds and random; fixed values make "score then time" deterministic.</details>
<details><summary><b>Q:</b> What does "setup.sql is safe to run twice" prove?</summary><b>A:</b> Re-running keeps 130 questions and existing user data (idempotent DDL and upsert seed).</details>
<details><summary><b>Q:</b> Two things this layer can't test?</summary><b>A:</b> Concurrency (one connection) and live-project settings (OTP length, RLS toggled in the dashboard, PostgREST/JWT).</details>
<details><summary><b>Q:</b> Why pin specific error regexes?</summary><b>A:</b> So a denial for the wrong reason (privileges instead of RLS) fails the test.</details>

## 13 · The menu board

| | |
|---|---|
| Boot | `new PGlite()` · roles nologin · `auth` schema, `users`, `uid()` · usage grants · real `setup.sql` · table grants · 3 users |
| Helper | `as(role, uid, sql)`: reset → set_config → set role → query → finally reset |
| Errors | RLS insert → "row-level security" · revoked fn → "permission denied" · check → "violates check constraint" · unique → "duplicate key" · own messages: "display name", "not found", "count", "already submitted", "expired" |
| Owner moves | back-date `started_at`; set `duration_ms` |
| Matrix | 4 tables × anon/own/other × select/insert/update/delete |
| Strength | SQL mutations caught: progress `using (true)`; submit without owner check |
| Limits | one connection; no PostgREST/JWT; not the live project |
| Time | 19 tests ≈ 1.4 s |

## 14 · Glossary

**Emulation**: reproducing the behaviour of one system in another for testing. **Fixture**: data or state prepared for tests. **Idempotent**: safe to apply more than once with the same result. **`nologin` role**: a role that can be switched to but not connected as. **`set role`**: make the session act with another role's privileges. **`set_config` / `current_setting`**: write / read a configuration parameter. **`stable` function**: returns the same result for the same inputs within one statement. **Test isolation**: tests that don't depend on each other's state. **WebAssembly (WASM)**: a portable binary format that runs compiled C/C++/Rust code in JS engines.

## 15 · Go further

| Resource | Type | Why | Which part | Time |
|---|---|---|---|---|
| [PGlite documentation](https://pglite.dev/docs/) | Docs | API (`exec`, `query`), limits, extensions | "Getting started", "API" | 15 min |
| [PostgreSQL: SET ROLE](https://www.postgresql.org/docs/current/sql-set-role.html) | Docs | Exactly what `set role` changes | Whole page | 5 min |
| [PostgreSQL: System administration functions (`set_config`)](https://www.postgresql.org/docs/current/functions-admin.html) | Docs | `set_config` / `current_setting` | "Configuration Settings Functions" | 5 min |
| [Supabase: Testing your database](https://supabase.com/docs/guides/database/testing) | Docs | The official approach (pgTAP + the local stack), to compare | Whole page | 15 min |
| [Supabase: Local development](https://supabase.com/docs/guides/local-development) | Docs | When you need the full local stack instead | "Getting started" | 15 min |

---
← [L4.01 Test it I: strategy and data tests](l4-01-testing-strategy-data.md) · [Hub](README.md) · [L4.03 Test it III: Playwright foundations →](l4-03-playwright-foundations.md)
