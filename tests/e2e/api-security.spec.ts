// Live security checks against the real Supabase project.
// Uses two throwaway users (created + deleted via the admin API, no emails sent).
import { test, expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ANSWER, anonClient, createTestUser, deleteMyTestUsers, env, hasAdmin, signedInClient } from "./support";

test.describe.configure({ mode: "serial" });

const anon = anonClient();

test.describe("anonymous visitor", () => {
  test("cannot read the answer key or any private table", async () => {
    for (const table of ["questions", "profiles", "test_attempts", "card_progress"]) {
      const { data, error } = await anon.from(table).select("*").limit(5);
      expect(error, table).toBeNull();
      expect(data, `${table} must be empty for anon`).toEqual([]);
    }
  });

  test("cannot start, submit or read stats", async () => {
    for (const [fn, args] of [
      ["start_test", {}],
      ["submit_test", { p_attempt: "00000000-0000-0000-0000-000000000000", p_answers: [] }],
      ["get_my_stats", {}],
    ] as const) {
      const { error } = await anon.rpc(fn, args);
      expect(error?.code, fn).toBe("42501");
    }
  });

  test("cannot write to any table", async () => {
    expect((await anon.from("profiles").insert({ id: "00000000-0000-0000-0000-000000000000", display_name: "Anon" })).error).not.toBeNull();
    expect((await anon.from("test_attempts").insert({ user_id: "00000000-0000-0000-0000-000000000000", question_ids: [1], total: 1 })).error).not.toBeNull();
    expect((await anon.from("questions").insert({ id: 9999, week: 0, prompt: "x", options: [], answer: 0 })).error).not.toBeNull();
  });

  test("can read the public leaderboard (names only, no emails)", async () => {
    const { data, error } = await anon.rpc("get_leaderboard", { p_limit: 5 });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    for (const row of data as Record<string, unknown>[]) expect(Object.keys(row)).not.toContain("email");
  });
});

test.describe("signed-in users", () => {
  test.skip(!hasAdmin, "needs SUPABASE_SECRET_KEY (or local Supabase.txt) to create throwaway users");

  let A: SupabaseClient, B: SupabaseClient;
  let a: { email: string; id: string }, b: { email: string; id: string };
  const nameA = `E2E Alpha ${Date.now() % 100000}`;

  test.beforeAll(async () => {
    a = await createTestUser("sec-a");
    b = await createTestUser("sec-b");
    A = await signedInClient(a.email);
    B = await signedInClient(b.email);
  });
  test.afterAll(async () => {
    await deleteMyTestUsers();
  });

  test("OTP sign-in produces a real session", async () => {
    const { data } = await A.auth.getUser();
    expect(data.user?.email).toBe(a.email);
  });

  test("cannot start a test before choosing a name", async () => {
    const { error } = await A.rpc("start_test");
    expect(error?.message).toMatch(/display name/i);
  });

  test("profile rules: own row only, valid names, unique ignoring case", async () => {
    expect((await A.from("profiles").insert({ id: b.id, display_name: "Hijack Attempt" })).error, "write someone else's profile").not.toBeNull();
    expect((await A.from("profiles").insert({ id: a.id, display_name: "ab" })).error?.code, "too short").toBe("23514");
    expect((await A.from("profiles").insert({ id: a.id, display_name: "<img src=x>" })).error?.code, "bad chars").toBe("23514");
    expect((await A.from("profiles").insert({ id: a.id, display_name: nameA })).error).toBeNull();
    expect((await B.from("profiles").insert({ id: b.id, display_name: nameA.toUpperCase() })).error?.code, "duplicate").toBe("23505");
    expect((await B.from("profiles").insert({ id: b.id, display_name: `E2E Beta ${Date.now() % 100000}` })).error).toBeNull();
    const { data } = await A.from("profiles").select("id");
    expect(data, "sees only own profile").toEqual([{ id: a.id }]);
  });

  test("server grades the test and records the time", async () => {
    const { data: s, error } = await A.rpc("start_test");
    expect(error).toBeNull();
    expect(s.question_ids).toHaveLength(100);
    expect(new Set(s.question_ids).size).toBe(100);
    const answers = s.question_ids.map((id: number, i: number) => (i < 73 ? ANSWER.get(id) : -1));
    const { data: r, error: e2 } = await A.rpc("submit_test", { p_attempt: s.attempt_id, p_answers: answers });
    expect(e2).toBeNull();
    expect(r.score).toBe(73);
    expect(r.total).toBe(100);
    expect(r.duration_ms).toBeGreaterThan(0);
    expect(r.correct).toEqual(s.question_ids.map((id: number) => ANSWER.get(id)));
  });

  test("scores cannot be forged or tampered with", async () => {
    const ins = await A.from("test_attempts").insert({ user_id: a.id, question_ids: [101], total: 1, score: 1, duration_ms: 1, submitted_at: new Date().toISOString() });
    expect(ins.error, "direct insert").not.toBeNull();
    const upd = await A.from("test_attempts").update({ score: 100, duration_ms: 1 }).eq("user_id", a.id).select();
    expect(upd.data ?? [], "direct update changes nothing").toEqual([]);
    const { data } = await A.from("test_attempts").select("score").eq("user_id", a.id);
    expect(data?.map((d) => d.score)).toEqual([73]);
  });

  test("cannot submit another user's attempt, twice, or with a wrong answer count", async () => {
    const { data: s } = await B.rpc("start_test");
    const ans = s.question_ids.map(() => 0);
    expect((await A.rpc("submit_test", { p_attempt: s.attempt_id, p_answers: ans })).error?.message).toMatch(/not found/i);
    expect((await B.rpc("submit_test", { p_attempt: s.attempt_id, p_answers: [0, 1] })).error?.message).toMatch(/count/i);
    expect((await B.rpc("submit_test", { p_attempt: s.attempt_id, p_answers: ans })).error).toBeNull();
    expect((await B.rpc("submit_test", { p_attempt: s.attempt_id, p_answers: ans })).error?.message).toMatch(/already submitted/i);
  });

  test("users cannot see each other's attempts or flashcard progress", async () => {
    expect((await B.from("test_attempts").select("user_id")).data?.every((r) => r.user_id === b.id)).toBe(true);
    expect((await A.from("card_progress").upsert({ user_id: a.id, question_id: 101, status: "known" })).error).toBeNull();
    expect((await B.from("card_progress").upsert({ user_id: a.id, question_id: 102, status: "known" })).error, "write A's progress").not.toBeNull();
    expect((await B.from("card_progress").select("*")).data).toEqual([]);
    const del = await B.from("card_progress").delete().eq("user_id", a.id).select();
    expect(del.data ?? []).toEqual([]);
    expect((await A.from("card_progress").select("question_id, status")).data).toEqual([{ question_id: 101, status: "known" }]);
  });

  test("leaderboard ranks by score then time and get_my_stats agrees", async () => {
    const { data: lb } = await anon.rpc("get_leaderboard", { p_limit: 1000 });
    const rowA = (lb as { display_name: string; score: number; rank: number }[]).find((r) => r.display_name === nameA);
    expect(rowA?.score).toBe(73);
    const { data: st } = await A.rpc("get_my_stats");
    expect(st.best_score).toBe(73);
    expect(st.rank).toBe(rowA?.rank);
    const sorted = [...(lb as { score: number; duration_ms: number }[])].sort((x, y) => y.score - x.score || x.duration_ms - y.duration_ms);
    expect(lb).toEqual(sorted);
  });

  test("the public key is the publishable/anon key, never the secret", async () => {
    expect(env.anon).not.toEqual(env.secret);
    expect(env.anon).not.toMatch(/^sb_secret_/);
  });
});
