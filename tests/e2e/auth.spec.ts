// Full signed-in journey through the real UI against the live Supabase project:
// email code sign-in → leaderboard name → 100-question test → results → leaderboard
// → profile edits → flashcard sync → sign out. Throwaway users; no real emails are sent.
import { test, expect } from "@playwright/test";
import { ANSWER, cardProgressOf, createTestUser, currentQuestion, deleteMyTestUsers, goto, hasAdmin, otpFor, signedInClient } from "./support";

test.skip(!hasAdmin, "needs SUPABASE_SECRET_KEY (or local Supabase.txt) to create throwaway users");
test.describe.configure({ mode: "serial", timeout: 480_000 });
test.afterAll(async () => {
  await deleteMyTestUsers();
});

test("sign in, take a ranked test, appear on the leaderboard, manage account", async ({ page }, info) => {
  page.on("dialog", (d) => d.accept());
  const crashes: string[] = [];
  page.on("pageerror", (e) => crashes.push(e.message));
  const tag = info.project.name.replace(/\W/g, "").slice(0, 10);
  const user = await createTestUser(tag);
  const name = `E2E ${tag} ${Math.floor(Math.random() * 9000 + 1000)}`;

  // Don't actually email anyone: the "send code" request is answered locally.
  // Verification of the code below is the real Supabase endpoint.
  let otpRequests = 0;
  await page.route("**/auth/v1/otp*", async (route) => {
    otpRequests++;
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  // ---- sign in with the 6-digit code ----
  await goto(page, "/test");
  await page.getByRole("link", { name: /Sign in with email to start/ }).click();
  await page.getByLabel("Email").fill(user.email);
  await page.getByRole("button", { name: /Email me a code/ }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();
  expect(otpRequests).toBe(1);

  await page.locator("#code").fill("00000000"); // wrong code first (8 digits auto-submits)
  await expect(page.locator(".err")).toContainText(/wrong or has expired/i);
  await page.locator("#code").fill(await otpFor(user.email));
  await expect(page.getByText("You're in!")).toBeVisible();

  // ---- choose a leaderboard name (validation first) ----
  await page.getByLabel("Leaderboard name").fill("ab");
  await page.getByRole("button", { name: "Let's go" }).click();
  await expect(page.locator(".err")).toContainText("3–20 characters");
  await page.getByLabel("Leaderboard name").fill(name);
  await page.getByRole("button", { name: "Let's go" }).click();
  await expect(page).toHaveURL(/\/test$/); // ?next=/test brings them back

  // ---- take the test: 90 right, 4 wrong, 6 skipped ----
  await page.getByRole("button", { name: /Start test/ }).click();
  await expect(page).toHaveURL(/\/test\/run/);
  await expect(page.getByText("Question 1 of 100")).toBeVisible();
  for (let i = 0; i < 100; i++) {
    await expect(page.getByText(`Question ${i + 1} of 100`)).toBeVisible();
    const q = await currentQuestion(page);
    if (i === 50) {
      await page.reload(); // resume mid-test
      await expect(page.getByText("Question 51 of 100")).toBeVisible();
      await expect(page.locator(".test-top")).toContainText("50/100");
    }
    if (i >= 94) {
      if (i < 99) await page.getByRole("button", { name: /^Next/ }).click();
      continue;
    }
    const pick = i < 90 ? ANSWER.get(q.id)! : (ANSWER.get(q.id)! + 1) % q.options.length;
    await page.locator(".q-card .opt").nth(pick).click(); // the app auto-advances after an answer
  }
  await page.getByRole("button", { name: "Submit test" }).click();
  await expect(page.locator(".sheet")).toContainText("You answered 94 of 100");
  await expect(page.locator(".sheet")).toContainText("6 unanswered");
  await page.locator(".sheet").getByRole("button", { name: /^Submit at/ }).click();

  // ---- results ----
  await expect(page).toHaveURL(/\/test\/result/);
  await expect(page.locator(".ring-num b")).toHaveText("90", { timeout: 10_000 });
  await expect(page.getByText("10 to review")).toBeVisible();
  await expect(page.locator(".result-stats")).toContainText(/\d+(st|nd|rd|th)/);

  // ---- leaderboard shows me ----
  await page.getByRole("link", { name: /See the leaderboard/ }).click();
  const me = page.locator(".lb-row.me, .pod", { hasText: name }).first();
  await expect(me).toBeVisible();
  await expect(me).toContainText("90");

  // ---- home stats ----
  await goto(page, "/");
  await expect(page.locator(".stat").nth(1)).toContainText("90/100");

  // ---- account: rename, duplicate-name guard ----
  const other = await createTestUser(`${tag}-b`);
  const otherName = `E2E Taken ${Math.floor(Math.random() * 9000 + 1000)}`;
  const oc = await signedInClient(other.email);
  await oc.from("profiles").insert({ id: other.id, display_name: otherName });

  await goto(page, "/me");
  await expect(page.getByText(user.email)).toBeVisible();
  await page.getByRole("button", { name: "Edit name" }).click();
  await page.getByLabel("Leaderboard name").fill(otherName.toLowerCase());
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.locator(".sheet .err")).toContainText("That name is taken");
  const renamed = `${name} X`.slice(0, 20);
  await page.getByLabel("Leaderboard name").fill(renamed);
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Name updated")).toBeVisible();
  await expect(page.locator(".card").first()).toContainText(renamed);

  // ---- flashcard progress syncs to the cloud ----
  await goto(page, "/study?week=0");
  await page.locator("button.btn.got").click();
  await expect.poll(async () => (await cardProgressOf(user.id)).find((r) => r.question_id === 1)?.status, { timeout: 10_000 }).toBe("known");

  // ---- sign out ----
  await goto(page, "/me");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByText("Pull up a chair")).toBeVisible();
  await goto(page, "/test");
  await expect(page.getByRole("link", { name: /Sign in with email to start/ })).toBeVisible();
  expect(crashes, "uncaught errors in the page").toEqual([]);
});
