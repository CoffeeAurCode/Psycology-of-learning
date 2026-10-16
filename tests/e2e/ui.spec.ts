// UI behaviour on every device/browser project (phones, tablets, laptops; Chromium, WebKit, Firefox).
import { test, expect, type Page } from "@playwright/test";
import { ANSWER, QUESTIONS, currentQuestion, goto, isRail, noHorizontalOverflow } from "./support";

const ROUTES: [string, RegExp][] = [
  ["/", /Brew your/],
  ["/study", /All weeks/],
  ["/test", /100 questions/],
  ["/ranks", /Top brewers/],
  ["/me", /Pull up a chair/],
];

const deckFoot = (page: Page) => page.locator(".deck-foot");
const flipped = (page: Page) =>
  page.locator(".fc").last().locator(".fc-inner").evaluate((el) => {
    const t = getComputedStyle(el).transform;
    return t !== "none" && new DOMMatrix(t).m11 < 0; // rotateY(180deg) → m11 = -1
  });

test.beforeEach(async ({ page }) => {
  page.on("dialog", (d) => d.accept()); // "leave test?" beforeunload prompts
});

test("home shows hero, stats and all 13 weeks", async ({ page }) => {
  await goto(page, "/");
  await expect(page).toHaveTitle(/Psychology of Learning NPTEL/);
  await expect(page.locator(".hero h1")).toContainText("Brew your");
  await expect(page.locator(".stat")).toHaveCount(3);
  await expect(page.locator(".week-tile")).toHaveCount(13);
  await expect(page.locator(".stat").first()).toContainText("0/130");
});

test("navigation reaches every section and marks the active tab", async ({ page }) => {
  await goto(page, "/");
  // the right navigation for the screen: bottom tab bar on phones/tablets, side rail on laptops
  await expect(page.locator(".rail-brand")).toBeVisible({ visible: isRail(page) });
  await expect(page.locator(".topbar")).toBeVisible({ visible: !isRail(page) });
  for (const [path, heading] of ROUTES.slice(1).concat([ROUTES[0]])) {
    await page.locator(`.tabbar a[href="${path}"]`).last().click();
    await expect(page).toHaveURL(new RegExp(`${path === "/" ? "/$" : path}`));
    await expect(page.locator("main h1").first()).toContainText(heading);
    await expect(page.locator(`.tabbar a[href="${path}"].active`).last()).toHaveAttribute("aria-current", "page");
  }
});

test("no page scrolls sideways and nothing hides under the tab bar", async ({ page }) => {
  for (const [path] of ROUTES) {
    await goto(page, path);
    await noHorizontalOverflow(page);
  }
  await goto(page, "/study?week=0");
  await noHorizontalOverflow(page);
  // the card buttons must sit above the bottom tab bar without scrolling
  if (!isRail(page)) {
    const g = (await page.locator("button.btn.got").boundingBox())!;
    const bar = (await page.locator(".tabbar").boundingBox())!;
    expect(g.y + g.height, "Got it button hidden under the tab bar").toBeLessThanOrEqual(bar.y + 1);
  }
});

test("deep links, week filter and unknown routes", async ({ page }) => {
  await goto(page, "/study?week=3");
  await expect(page.locator("main h1")).toHaveText("Week 3");
  await expect(deckFoot(page)).toContainText("1 / 10");
  await page.locator(".chip", { hasText: /^Week 12$/ }).click();
  await expect(page).toHaveURL(/week=12/);
  await expect(page.locator(".fc").last()).toContainText("Sustainability in economic sustainability");
  await page.locator(".chip", { hasText: /^All/ }).click();
  await expect(deckFoot(page)).toContainText("1 / 130");
  await goto(page, "/this/does/not/exist");
  await expect(page.locator(".hero h1")).toContainText("Brew your");
});

test("flashcards: flip, got it, again, undo, hide mastered, progress saved", async ({ page }) => {
  await goto(page, "/study?week=0");
  await expect(page.locator(".fc").last()).toContainText("What is Psychology?");
  expect(await flipped(page)).toBe(false);
  await page.locator(".fc").last().click();
  await expect.poll(() => flipped(page)).toBe(true);
  await expect(page.locator(".fc").last().locator(".fc-answer")).toContainText("A study of cognitive processes & behavior");
  await page.getByRole("button", { name: "Flip card" }).click();
  await expect.poll(() => flipped(page)).toBe(false);

  await page.locator("button.btn.got").click();
  await expect(deckFoot(page)).toContainText("2 / 10");
  await expect(deckFoot(page)).toContainText("✓ 1");
  await page.locator("button.btn.again").click();
  await expect(deckFoot(page)).toContainText("3 / 10");
  await expect(deckFoot(page)).toContainText("↻ 1");
  await page.getByRole("button", { name: "Previous card" }).click();
  await expect(deckFoot(page)).toContainText("2 / 10");

  // progress survives a reload and shows on Home
  await page.reload();
  const marks = await page.evaluate(() => JSON.parse(localStorage.getItem("pol.marks") || "{}"));
  expect(marks["1"].s).toBe("known");
  expect(marks["2"].s).toBe("again");
  await goto(page, "/");
  await expect(page.locator(".stat").first()).toContainText("1/130");
  await expect(page.locator(".week-tile").first()).toContainText("1/10");

  // hide mastered removes the known card from the deck
  await goto(page, "/study?week=0");
  await page.getByRole("switch", { name: "Hide mastered" }).click();
  await expect(deckFoot(page)).toContainText("1 / 9");
  await expect(page.locator(".fc").last()).not.toContainText("What is Psychology?");
});

test("flashcards: finishing a deck offers review of the 'again' cards", async ({ page }) => {
  await goto(page, "/study?week=12");
  for (let i = 0; i < 10; i++) await page.locator(i % 3 === 0 ? "button.btn.again" : "button.btn.got").click();
  await expect(page.getByText("Deck done!")).toBeVisible();
  await page.getByRole("button", { name: /Review the 4/ }).click();
  await expect(deckFoot(page)).toContainText("1 / 4");
});

test("flashcards: swipe right = got it, swipe left = again", async ({ page }) => {
  await goto(page, "/study?week=1");
  const swipe = async (dx: number) => {
    const b = (await page.locator(".fc").last().boundingBox())!;
    const x = b.x + b.width / 2, y = b.y + 40;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(x + (dx * i) / 12, y + 2); // ~200ms, like a real swipe
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
  };
  await swipe(220);
  await expect(deckFoot(page)).toContainText("✓ 1");
  await swipe(-220);
  await expect(deckFoot(page)).toContainText("↻ 1");
  await expect(deckFoot(page)).toContainText("3 / 10");
});

test("flashcards: real touch swipe on phones (Chromium)", async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== "chromium" || !isMobile, "raw touch events need Chromium + a touch device");
  await goto(page, "/study?week=2");
  const cdp = await page.context().newCDPSession(page);
  const b = (await page.locator(".fc").last().boundingBox())!;
  const x = b.x + b.width / 2, y = b.y + b.height / 2; // middle of the scrollable options area
  const touch = (type: string, xx: number) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: xx, y }] });
  await touch("touchStart", x);
  for (let i = 1; i <= 12; i++) await touch("touchMove", x + (230 * i) / 12);
  await touch("touchEnd", x + 230);
  await expect(deckFoot(page)).toContainText("✓ 1");
  await expect(page).toHaveURL(/\/study/); // the swipe must not trigger browser back-navigation
});

test("flashcards: keyboard shortcuts on laptops", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard shortcuts are for laptops");
  await goto(page, "/study?week=4");
  await expect(page.locator(".kbd-hint").first()).toBeVisible();
  await page.keyboard.press("Space");
  await expect.poll(() => flipped(page)).toBe(true);
  await page.keyboard.press("ArrowRight");
  await expect(deckFoot(page)).toContainText("✓ 1");
  await page.keyboard.press("ArrowLeft");
  await expect(deckFoot(page)).toContainText("↻ 1");
  await page.keyboard.press("Backspace");
  await expect(deckFoot(page)).toContainText("2 / 10");
});

test("quiz mode scores right and wrong answers and finishes the round", async ({ page }) => {
  await goto(page, "/study?week=5");
  await page.locator(".seg button", { hasText: "Quiz" }).click();
  let expected = 0;
  for (let i = 0; i < 10; i++) {
    const q = await currentQuestion(page);
    const right = i % 2 === 0;
    const pick = right ? q.answer : (q.answer + 1) % q.options.length;
    await page.locator(".q-card .opt").nth(pick).click();
    await expect(page.locator(".q-card .opt.correct")).toHaveCount(1);
    await expect(page.locator(".q-card .opt.wrong")).toHaveCount(right ? 0 : 1);
    if (right) expected++;
    await expect(page.locator(".deck-foot")).toContainText(`Score ${expected}`);
    await page.getByRole("button", { name: /Next question|See score/ }).click();
    // wait until the next question has slid in (the old card animates out first)
    if (i < 9) await expect(page.locator(".q-card .q-text")).not.toHaveText(q.q);
  }
  await expect(page.getByRole("heading", { name: `${expected}/10` })).toBeVisible();
  await page.getByRole("button", { name: /Retry the 5 you missed/ }).click();
  await expect(page.locator(".deck-foot")).toContainText("1 / 5");
});

test("list mode searches and highlights", async ({ page }) => {
  await goto(page, "/study");
  await page.locator(".seg button", { hasText: "List" }).click();
  await expect(page.locator(".qa")).toHaveCount(130);
  await page.locator(".search input").fill("maslow");
  await expect(page.locator(".qa")).toHaveCount(1);
  await expect(page.locator(".qa mark")).toHaveText(/maslow/i);
  await expect(page.locator(".qa")).toContainText("Love and belonging");
  await page.locator(".search input").fill("zzzz-no-match");
  await expect(page.getByText(/Nothing matches/)).toBeVisible();
});

test("theme toggle switches light/dark and is remembered", async ({ page }) => {
  await goto(page, "/");
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const before = await bg();
  const toggle = isRail(page) ? page.locator(".rail-theme") : page.locator(".topbar .icon-btn");
  await toggle.click();
  await expect.poll(bg).not.toBe(before);
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(["light", "dark"]).toContain(theme);
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
  expect(await bg()).not.toBe(before);
  // explicit choice from the account page
  await goto(page, "/me");
  await page.locator(".seg button", { hasText: "Dark" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
});

test("signed-out visitors are sent to sign in before a ranked test", async ({ page }) => {
  await goto(page, "/test");
  await page.getByRole("link", { name: /Sign in to start/ }).click();
  await expect(page).toHaveURL(/\/me\?next=\/test/);
  await page.getByRole("button", { name: /Use email instead/ }).click();
  await expect(page.getByRole("button", { name: /Email me a code/ })).toBeVisible();
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByRole("button", { name: /Email me a code/ }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
});

test("Continue with Google hands off to Supabase and returns to where they were going", async ({ page }) => {
  // Stop at Supabase's authorize endpoint; we never drive Google's own login screen.
  let authorize: URL | undefined;
  await page.route("**/auth/v1/authorize*", async (route) => {
    authorize = new URL(route.request().url());
    await route.fulfill({ status: 200, contentType: "text/html", body: "<p>google</p>" });
  });
  await goto(page, "/me?next=/test");
  await page.getByRole("button", { name: /Continue with Google/ }).click();
  await expect.poll(() => authorize?.searchParams.get("provider")).toBe("google");
  const back = new URL(authorize!.searchParams.get("redirect_to")!);
  expect(back.pathname + back.search).toBe("/me?next=%2Ftest");
  expect(authorize!.searchParams.get("code_challenge")).toBeTruthy(); // PKCE

  // cancelling on Google's screen brings them back with ?error=… → friendly message, clean URL
  await page.unroute("**/auth/v1/authorize*");
  await goto(page, "/me?next=/test&error=access_denied&error_description=cancelled");
  await expect(page.locator(".err")).toContainText("Google sign-in didn't finish");
  await expect(page).toHaveURL(/\/me\?next=%2Ftest$|\/me\?next=\/test$/);
});

test("leaderboard loads from the live database", async ({ page }) => {
  await goto(page, "/ranks");
  await expect(page.locator(".banner")).toHaveCount(0);
  await expect(page.getByText("No scores yet").or(page.locator(".pod").first())).toBeVisible();
});

test("test runner: answer, auto-advance, flag, grid, resume, submit sheet, exit", async ({ page }) => {
  // a locally stored in-progress attempt (no server call needed to render the runner)
  await goto(page, "/");
  const ids = QUESTIONS.slice(0, 100).map((q) => q.id);
  await page.evaluate((qids) => {
    localStorage.setItem(
      "pol.attempt",
      JSON.stringify({ attempt_id: "00000000-0000-0000-0000-000000000000", question_ids: qids, started_at: new Date().toISOString(), client_started: Date.now(), answers: qids.map(() => null), flags: [], pos: 0 })
    );
  }, ids);
  await goto(page, "/test/run");
  await expect(page.getByText("Question 1 of 100")).toBeVisible();
  await expect(page.locator(".tabbar")).toHaveCount(0); // focus mode: no navigation bar
  await expect(page.locator(".timer")).toContainText(/0:0\d/);

  const q1 = await currentQuestion(page);
  await page.locator(".q-card .opt").nth(ANSWER.get(q1.id)!).click();
  await expect(page.getByText("Question 2 of 100")).toBeVisible(); // auto-advance
  await expect(page.locator(".test-top")).toContainText("1/100");

  await page.getByRole("button", { name: "Previous question" }).click();
  await expect(page.locator(".q-card .opt.sel")).toHaveCount(1);
  await page.getByRole("button", { name: "Flag question" }).click();
  await expect(page.locator(".q-card")).toContainText("Flagged");

  await page.getByRole("button", { name: "All questions" }).click();
  await expect(page.locator(".qgrid button")).toHaveCount(100);
  await expect(page.locator(".qgrid button.ans")).toHaveCount(1);
  await expect(page.locator(".qgrid button.flag")).toHaveCount(1);
  await page.locator(".qgrid button", { hasText: /^50$/ }).click();
  await expect(page.getByText("Question 50 of 100")).toBeVisible();

  await page.reload(); // resume where you left off
  await expect(page.getByText("Question 50 of 100")).toBeVisible();
  await expect(page.locator(".test-top")).toContainText("1/100");

  await page.locator(".test-top button", { hasText: "Submit" }).click();
  await expect(page.locator(".sheet")).toContainText("You answered 1 of 100");
  await expect(page.locator(".sheet")).toContainText("99 unanswered");
  await page.getByRole("button", { name: "Go to first unanswered" }).click();
  await expect(page.getByText("Question 2 of 100")).toBeVisible();

  // submitting without a valid session shows an error instead of crashing
  await page.locator(".test-top button", { hasText: "Submit" }).click();
  await page.locator(".sheet").getByRole("button", { name: /^Submit at/ }).click();
  await expect(page.locator(".sheet .banner")).toBeVisible();
  await expect(page).toHaveURL(/\/test\/run/);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /Exit/ }).click();
  await page.getByRole("button", { name: "Leave for now" }).click();
  await expect(page).toHaveURL(/\/test$/);
});

test("result page renders score, stats and mistakes", async ({ page }) => {
  await goto(page, "/");
  const ids = QUESTIONS.slice(0, 100).map((q) => q.id);
  await page.evaluate((qids) => {
    const key = qids.map(() => 0);
    localStorage.setItem("pol.lastResult", JSON.stringify({ score: 88, total: 100, duration_ms: 754000, correct: key, rank: 3, players: 20, question_ids: qids, answers: qids.map((_, i) => (i < 88 ? 0 : 1)) }));
  }, ids);
  await goto(page, "/test/result");
  await expect(page.locator(".ring-num b")).toHaveText("88", { timeout: 5000 });
  await expect(page.locator(".result-stats")).toContainText("12:34");
  await expect(page.locator(".result-stats")).toContainText("3rd");
  await expect(page.locator(".result-stats")).toContainText("of 20 players");
  await expect(page.getByText("12 to review")).toBeVisible();
  await expect(page.locator(".review-item")).toHaveCount(8);
  await page.getByRole("button", { name: "Show all 12" }).click();
  await expect(page.locator(".review-item")).toHaveCount(12);
  await noHorizontalOverflow(page);
});
