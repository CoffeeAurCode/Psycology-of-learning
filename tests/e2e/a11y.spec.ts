// Automated accessibility checks (axe-core, WCAG 2.1 A/AA) on every screen, both themes.
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { QUESTIONS, goto } from "./support";

async function scan(page: Page, label: string) {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude(".splash")
    .analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× e.g. ${v.nodes[0]?.target.join(" ")} — ${v.nodes[0]?.failureSummary?.split("\n")[1]?.trim()}`);
  expect(summary, `${label}: serious/critical accessibility issues`).toEqual([]);
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("pol.theme", JSON.stringify(t)), theme);
      page.on("dialog", (d) => d.accept());
    });

    test("main screens", async ({ page }) => {
      for (const path of ["/", "/study", "/test", "/ranks", "/me"]) {
        await goto(page, path);
        await page.waitForTimeout(700); // let entry animations settle
        await scan(page, `${theme} ${path}`);
      }
    });

    test("flashcard back, quiz feedback and list", async ({ page }) => {
      await goto(page, "/study?week=6");
      await page.locator(".fc").last().click();
      await page.waitForTimeout(900);
      await scan(page, `${theme} flashcard back`);
      await page.locator(".seg button", { hasText: "Quiz" }).click();
      await page.locator(".q-card .opt").first().click();
      await page.waitForTimeout(500);
      await scan(page, `${theme} quiz feedback`);
      await page.locator(".seg button", { hasText: "List" }).click();
      await page.locator(".search input").fill("memory");
      await scan(page, `${theme} list search`);
    });

    test("test runner, question grid and results", async ({ page }) => {
      await goto(page, "/");
      const ids = QUESTIONS.slice(20, 120).map((q) => q.id);
      await page.evaluate((qids) => {
        localStorage.setItem("pol.attempt", JSON.stringify({ attempt_id: "x", question_ids: qids, started_at: new Date().toISOString(), client_started: Date.now(), answers: qids.map((_, i) => (i < 3 ? 0 : null)), flags: [1], pos: 2 }));
        localStorage.setItem("pol.lastResult", JSON.stringify({ score: 81, total: 100, duration_ms: 900000, correct: qids.map(() => 1), rank: 4, players: 30, question_ids: qids, answers: qids.map((_, i) => (i % 5 ? 1 : 0)) }));
      }, ids);
      await goto(page, "/test/run");
      await page.waitForTimeout(600);
      await scan(page, `${theme} test runner`);
      await page.getByRole("button", { name: "All questions" }).click();
      await page.waitForTimeout(600);
      await scan(page, `${theme} question grid`);
      await goto(page, "/test/result");
      await page.waitForTimeout(2000);
      await scan(page, `${theme} results`);
    });
  });
}
