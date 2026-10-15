// Shared helpers for the Playwright suites.
// Reads the public Supabase URL/key from .env.local and, for tests that need real
// users, the secret key from SUPABASE_SECRET_KEY or the local (git-ignored) Supabase.txt.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import questions from "../../src/data/questions.json" with { type: "json" };

function readKv(path: string, sep: RegExp) {
  const out: Record<string, string> = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(sep);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
  }
  return out;
}

const dotenv = readKv(".env.local", /^([A-Z0-9_]+)=(.*)$/);
const creds = readKv("Supabase.txt", /^([^:]+):(.*)$/);

export const env = {
  url: process.env.VITE_SUPABASE_URL ?? dotenv.VITE_SUPABASE_URL ?? "",
  anon: process.env.VITE_SUPABASE_ANON_KEY ?? dotenv.VITE_SUPABASE_ANON_KEY ?? "",
  secret: process.env.SUPABASE_SECRET_KEY ?? creds["Secret keys"] ?? "",
};
export const hasAdmin = Boolean(env.url && env.secret);

const noPersist = { auth: { persistSession: false, autoRefreshToken: false } };
export const anonClient = () => createClient(env.url, env.anon, noPersist);
const admin = () => createClient(env.url, env.secret, noPersist);

export const TEST_EMAIL_PREFIX = "e2e-bot-";
const rand = () => Math.random().toString(36).slice(2, 8);

const created = new Set<string>();

/** Create a confirmed throwaway user (no email is ever sent). */
export async function createTestUser(tag: string) {
  const email = `${TEST_EMAIL_PREFIX}${tag}-${rand()}@example.com`;
  const { data, error } = await admin().auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  created.add(data.user!.id);
  return { email, id: data.user!.id };
}

/** Delete only the users this test file created (other workers may still be using theirs). */
export async function deleteMyTestUsers() {
  if (!hasAdmin) return;
  const a = admin();
  for (const id of created) {
    await a.auth.admin.deleteUser(id);
    created.delete(id);
  }
}

/** The 6-digit code the user would have received by email. */
export async function otpFor(email: string) {
  const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  return data.properties.email_otp;
}

/** A supabase-js client signed in through the real OTP verification endpoint. */
export async function signedInClient(email: string): Promise<SupabaseClient> {
  const c = anonClient();
  const { error } = await c.auth.verifyOtp({ email, token: await otpFor(email), type: "email" });
  if (error) throw error;
  return c;
}

/** Delete every throwaway user (cascades to profiles, attempts and progress). Global teardown only. */
export async function deleteTestUsers() {
  if (!hasAdmin) return 0;
  const a = admin();
  let n = 0;
  for (let page = 1; page < 20; page++) {
    const { data, error } = await a.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email?.startsWith(TEST_EMAIL_PREFIX)) {
        await a.auth.admin.deleteUser(u.id);
        n++;
      }
    }
    if (data.users.length < 200) break;
  }
  return n;
}

export async function cardProgressOf(userId: string) {
  const { data } = await admin().from("card_progress").select("question_id, status").eq("user_id", userId);
  return data ?? [];
}

// ---------- question lookups ----------
type Q = { id: number; week: number; q: string; options: string[]; answer: number };
export const QUESTIONS = questions as Q[];
export const ANSWER = new Map(QUESTIONS.map((q) => [q.id, q.answer]));
/** Find the question shown on screen from its text + options (some prompts repeat). */
export function questionFromScreen(text: string, options: string[]) {
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  const t = clean(text);
  const hits = QUESTIONS.filter((q) => clean(q.q) === t);
  if (hits.length === 1) return hits[0];
  const o = options.map(clean).join("|");
  const exact = hits.find((q) => q.options.map(clean).join("|") === o);
  if (!exact) throw new Error(`Question not found: ${t}`);
  return exact;
}

// ---------- page helpers ----------
export const isRail = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

/** Wait for the first-load splash to go away. */
export async function ready(page: Page) {
  await expect(page.locator(".splash")).toHaveCount(0, { timeout: 8000 });
}

export async function goto(page: Page, path: string) {
  await page.goto(path);
  await ready(page);
}

/** The page must not be pannable sideways, during or after entry animations. */
export async function noHorizontalOverflow(page: Page) {
  for (const wait of [0, 600]) {
    await page.waitForTimeout(wait);
    const scrolled = await page.evaluate(() => {
      window.scrollTo(400, window.scrollY);
      const x = window.scrollX;
      window.scrollTo(0, window.scrollY);
      return x;
    });
    expect(scrolled, `page scrolled sideways by ${scrolled}px (after ${wait}ms)`).toBe(0);
  }
}

/** Text of the question currently shown in the quiz/test card. */
export async function currentQuestion(page: Page) {
  await expect(page.locator(".q-card")).toHaveCount(1); // wait out the slide transition
  const card = page.locator(".q-card");
  const text = await card.locator(".q-text").innerText();
  const options = await card.locator(".opt").evaluateAll((els) => els.map((e) => (e.textContent ?? "").replace(/^[A-D]/, "").trim()));
  return questionFromScreen(text, options);
}
