# Study plan · 62 study days to rebuilding it from memory

> Default pace: **90 minutes a day, 5 days a week, from Monday 19 October 2026**. Other paces, and a script to make your own schedule, are below.

**[◀ Hub](README.md)** · **[Start Level 1](l1-01-what-we-built.md)** · **[Mastery checkpoint](mastery.md)**

## How the estimate was made

- **Each lesson's time is computed from its content**, not guessed: prose at 150 words a minute (technical reading with some re-reading), annotated TypeScript and SQL at 1 minute per 4 lines, annotated CSS at 1 minute per 8 lines, 1 minute per quiz question, 0.5 per flashcard, 5 per cloze, 10–25 per blank-page drill, 10/20/40 for easy/medium/hard practice, 20 per level checkpoint. The sum is multiplied by **1.3** for breaks and re-reading, and rounded to 5. Every lesson is 45–75 minutes, except L2.07c (80), which is long because it also walks through two dashboards.
- **The long CSS listings** in L2.10b–c are folded reveals; the 75 minutes count the notes and patterns, plus one skim of the listings, not memorising 2,400 lines.
- **New to this stack?** If React, SQL or CSS are new to you, expect about **1.5×** these times in Level 1 and the first half of Level 2. Lower the daily minutes rather than skipping the practice: the drills are what make it stick.
- **Spaced review is built in**: each lesson returns **1, 3, 7 and 14 study days** after you finish it, for **10 minutes** (its flashcards, then its blank-page drill). Reviews come **first** each day; new material fills the rest. That's why the last two weeks are short review-only days: they lock in Level 4.
- **Reading** items (📖) are the twelve outside resources from the hub, at the point they help most. **Setup** (🛠) is 30 minutes on day 1.
- **Scheduling rules**: a day may run up to 10 minutes over to finish an item, so no lesson is left with a 5-minute stub; otherwise long lessons split across days, never into parts shorter than 15 minutes.

| | Minutes |
|---|---|
| Lessons (38) | 2,710 |
| Setup | 30 |
| Outside reading (12 items) | 240 |
| Mastery checkpoint | 195 |
| **New material** | **3,175 = 52 h 55 min** |
| Spaced reviews (38 lessons × 4 × 10 min) | 1,520 = 25 h 20 min |
| **Everything** | **4,695 = 78 h 15 min** |

## Milestones: what you can do without notes, and how you prove it

| After | You can… | Proof |
|---|---|---|
| **Level 1** (day 6) | Explain the whole app, draw its architecture, and run a from-scratch slice | [L1.05](l1-05-setup-first-slice.md) checkpoint: draw the map and name every part |
| **Level 2** (day 28) | Write every file of the app from a blank editor and explain every line, including Google sign-in and its dashboard settings | [L2.10c](l2-10c-responsive.md) checkpoint: `submit_test` and `SwipeCard` from memory |
| **Level 3** (day 36) | Defend the design, predict edge cases and reason about security, maths, performance, OAuth and PKCE | [L3.05](l3-05-performance.md) checkpoint + the [L3.06](l3-06-oauth-pkce-504.md) addendum: a trade-off and an edge case, with numbers |
| **Level 4** (day 48) | Write the whole test suite, diagnose failures, deploy, operate and run an incident | [L4.08](l4-08-deploy-operate.md) checkpoint + the [L4.09](l4-09-auth-tests-incident-ops.md) addendum: the test and release system, and the auth runbook |
| **Mastery** (day 51) | Rebuild it from memory | [mastery.md](mastery.md): sittings A, B and C; retake after 7 days |

## Other paces

Computed with the same rules and the same start date (Monday 2026-10-19):

| Minutes per day | Days per week | Study days | Finish date | Reviews |
|---|---|---|---|---|
| 60 | 5 | 87 | 2027-02-16 | 152 |
| **90** | **5** | **62** | **2027-01-12** | 152 |
| 120 | 5 | 50 | 2026-12-25 | 152 |
| 120 | 6 | 50 | 2026-12-15 | 152 |
| 180 | 7 | 37 | 2026-11-24 | 152 |

More minutes per day shortens the plan only until the reviews set the pace: the last lesson's 14-day review always comes 14 study days after you finish it.

## Day by day (90 min/day, 5 days/week)

Tick ☐ → ☑ in your own copy as you go. ↻ = a 10-minute review of that lesson.

| Study days | Finish date | New material | Reviews | Total |
|---|---|---|---|---|
| **62** | **2027-01-12** | 52 h 55 min | 152 × 10 min = 25 h 20 min | **78 h 15 min** |

| Level | Lessons | New material (incl. setup, reading, checkpoint) | Starts | Ends |
|---|---|---|---|---|
| Level 1 · Foundations | 5 | 6 h 50 min | Day 1 · 2026-10-19 | Day 6 · 2026-10-26 |
| Level 2 · Build it | 18 | 22 h 20 min | Day 6 · 2026-10-26 | Day 28 · 2026-11-25 |
| Level 3 · Under the hood | 6 | 8 h 25 min | Day 28 · 2026-11-25 | Day 36 · 2026-12-07 |
| Level 4 · Test it and ship it | 9 | 12 h 05 min | Day 37 · 2026-12-08 | Day 48 · 2026-12-23 |
| Mastery | checkpoint | 3 h 15 min | Day 49 · 2026-12-24 | Day 51 · 2026-12-28 |

| Day | Date | Review first (10 min each) | Then new material | Min | ✓ |
|---|---|---|---|---|---|
| | | **Level 1 · Foundations** | | | |
| 1 | 2026-10-19 | — | 🛠 [Setup: install Node, Git, a browser; clone and run the app (in L1.05)](l1-05-setup-first-slice.md)<br>[L1.01 What we built, the map, and the build log](l1-01-what-we-built.md)<br>[L1.02 Prerequisites I: the web platform](l1-02-web-platform.md) *(part 1, 15 min)* | 90 | ☐ |
| 2 | 2026-10-20 | ↻ L1.01 | [L1.02 Prerequisites I: the web platform](l1-02-web-platform.md) *(part 2, 55 min)*<br>[L1.03 Prerequisites II: TypeScript and React](l1-03-typescript-react.md) *(part 1, 25 min)* | 90 | ☐ |
| 3 | 2026-10-21 | ↻ L1.02 | [L1.03 Prerequisites II: TypeScript and React](l1-03-typescript-react.md) *(part 2, 50 min)*<br>📖 [Read: react.dev, Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects) | 85 | ☐ |
| 4 | 2026-10-22 | ↻ L1.01, ↻ L1.03 | [L1.04 Prerequisites III: SQL, auth, keys and hosting](l1-04-data-auth-hosting.md) | 90 | ☐ |
| 5 | 2026-10-23 | ↻ L1.02, ↻ L1.04 | 📖 [Read: Supabase, Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)<br>[L1.05 Setup and the first working slice (+ Level 1 checkpoint)](l1-05-setup-first-slice.md) *(part 1, 50 min)* | 90 | ☐ |
| | | **Level 2 · Build it** | | | |
| 6 | 2026-10-26 | ↻ L1.03 | [L1.05 Setup and the first working slice (+ Level 1 checkpoint)](l1-05-setup-first-slice.md) *(part 2, 25 min)*<br>[L2.01 From PDFs to 130 questions: the data pipeline](l2-01-data-pipeline.md) | 95 | ☐ |
| 7 | 2026-10-27 | ↻ L1.04, ↻ L1.05, ↻ L2.01 | [L2.02 The database I: tables, constraints and RLS](l2-02-tables-and-rls.md) | 100 | ☐ |
| 8 | 2026-10-28 | ↻ L1.01, ↻ L2.02 | [L2.03 The database II: server-side grading and the leaderboard](l2-03-server-grading.md) | 95 | ☐ |
| 9 | 2026-10-29 | ↻ L1.02, ↻ L1.05, ↻ L2.01, ↻ L2.03 | 📖 [Read: PostgreSQL, Window functions tutorial](https://www.postgresql.org/docs/current/tutorial-window.html)<br>[L2.04 Entry point, config and the small libraries](l2-04-entry-config-libs.md) *(part 1, 35 min)* | 90 | ☐ |
| 10 | 2026-10-30 | ↻ L1.03, ↻ L2.02 | [L2.04 Entry point, config and the small libraries](l2-04-entry-config-libs.md) *(part 2, 35 min)*<br>[L2.05 The app shell](l2-05-app-shell.md) *(part 1, 35 min)* | 90 | ☐ |
| 11 | 2026-11-02 | ↻ L1.04, ↻ L2.03, ↻ L2.04 | [L2.05 The app shell](l2-05-app-shell.md) *(part 2, 40 min)*<br>📖 [Read: Motion, AnimatePresence](https://motion.dev/docs/react-animate-presence) | 85 | ☐ |
| 12 | 2026-11-03 | ↻ L2.05 | [L2.06a The UI kit](l2-06a-ui-kit.md) | 85 | ☐ |
| 13 | 2026-11-04 | ↻ L1.05, ↻ L2.01, ↻ L2.04, ↻ L2.06a | [L2.06b The animated mug, the icon set and the Home page](l2-06b-mug-icons-home.md) *(part 1, 50 min)* | 90 | ☐ |
| 14 | 2026-11-05 | ↻ L2.02, ↻ L2.05 | [L2.06b The animated mug, the icon set and the Home page](l2-06b-mug-icons-home.md) *(part 2, 20 min)*<br>[L2.07a Auth state and email-code sign-in](l2-07a-auth-sign-in.md) *(part 1, 50 min)* | 90 | ☐ |
| 15 | 2026-11-06 | ↻ L1.01, ↻ L2.03, ↻ L2.06a, ↻ L2.06b | [L2.07a Auth state and email-code sign-in](l2-07a-auth-sign-in.md) *(part 2, 20 min)*<br>[L2.07c Google sign-in, line by line](l2-07c-google-sign-in.md) *(part 1, 30 min)* | 90 | ☐ |
| 16 | 2026-11-09 | ↻ L1.02, ↻ L2.07a | [L2.07c Google sign-in, line by line](l2-07c-google-sign-in.md) *(part 2, 50 min)*<br>📖 [Read: Supabase, Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google) | 85 | ☐ |
| 17 | 2026-11-10 | ↻ L1.03, ↻ L2.04, ↻ L2.06b, ↻ L2.07c | [L2.07b Leaderboard names, the account page and progress sync](l2-07b-account-progress.md) *(part 1, 50 min)* | 90 | ☐ |
| 18 | 2026-11-11 | ↻ L1.04, ↻ L2.05, ↻ L2.07a | [L2.07b Leaderboard names, the account page and progress sync](l2-07b-account-progress.md) *(part 2, 25 min)*<br>[L2.08a Flashcards I: the deck, the swipe card and the flip](l2-08a-flashcard-deck.md) *(part 1, 35 min)* | 90 | ☐ |
| 19 | 2026-11-12 | ↻ L2.06a, ↻ L2.07c, ↻ L2.07b | [L2.08a Flashcards I: the deck, the swipe card and the flip](l2-08a-flashcard-deck.md) *(part 2, 40 min)*<br>[L2.08b Flashcards II: quiz mode and the searchable list](l2-08b-quiz-and-list.md) *(part 1, 20 min)* | 90 | ☐ |
| 20 | 2026-11-13 | ↻ L1.05, ↻ L2.01, ↻ L2.08a | [L2.08b Flashcards II: quiz mode and the searchable list](l2-08b-quiz-and-list.md) *(part 2, 50 min)* | 80 | ☐ |
| 21 | 2026-11-16 | ↻ L2.02, ↻ L2.06b, ↻ L2.07b, ↻ L2.08b | [L2.09a The ranked test I: intro and starting a test](l2-09a-test-intro.md) | 100 | ☐ |
| 22 | 2026-11-17 | ↻ L2.03, ↻ L2.07a, ↻ L2.08a, ↻ L2.09a | [L2.09b The ranked test II: the runner](l2-09b-test-runner.md) *(part 1, 50 min)* | 90 | ☐ |
| 23 | 2026-11-18 | ↻ L2.07c, ↻ L2.08b | [L2.09b The ranked test II: the runner](l2-09b-test-runner.md) *(part 2, 25 min)*<br>[L2.09c The ranked test III: results and the leaderboard](l2-09c-results-leaderboard.md) *(part 1, 45 min)* | 90 | ☐ |
| 24 | 2026-11-19 | ↻ L2.04, ↻ L2.09a, ↻ L2.09b | [L2.09c The ranked test III: results and the leaderboard](l2-09c-results-leaderboard.md) *(part 2, 30 min)*<br>[L2.10a Styling I: tokens, themes, base and the shell](l2-10a-tokens-base-shell.md) *(part 1, 30 min)* | 90 | ☐ |
| 25 | 2026-11-20 | ↻ L2.05, ↻ L2.07b, ↻ L2.09c | [L2.10a Styling I: tokens, themes, base and the shell](l2-10a-tokens-base-shell.md) *(part 2, 40 min)*<br>[L2.10b Styling II: every component](l2-10b-component-styles.md) *(part 1, 20 min)* | 90 | ☐ |
| 26 | 2026-11-23 | ↻ L2.06a, ↻ L2.08a, ↻ L2.09b, ↻ L2.10a | [L2.10b Styling II: every component](l2-10b-component-styles.md) *(part 2, 55 min)* | 95 | ☐ |
| 27 | 2026-11-24 | ↻ L2.08b, ↻ L2.09c, ↻ L2.10b | [L2.10c Styling III: the responsive layer (+ Level 2 checkpoint)](l2-10c-responsive.md) *(part 1, 60 min)* | 90 | ☐ |
| | | **Level 3 · Under the hood** | | | |
| 28 | 2026-11-25 | ↻ L2.06b, ↻ L2.09a, ↻ L2.10a | [L2.10c Styling III: the responsive layer (+ Level 2 checkpoint)](l2-10c-responsive.md) *(part 2, 15 min)*<br>[L3.01 The security model](l3-01-security-model.md) *(part 1, 45 min)* | 90 | ☐ |
| 29 | 2026-11-26 | ↻ L2.07a, ↻ L2.10b, ↻ L2.10c | [L3.01 The security model](l3-01-security-model.md) *(part 2, 25 min)*<br>📖 [Read: PostgreSQL, Writing SECURITY DEFINER functions safely](https://www.postgresql.org/docs/current/sql-createfunction.html)<br>[L3.02 Ranking maths and SQL internals](l3-02-ranking-sql.md) *(part 1, 25 min)* | 90 | ☐ |
| 30 | 2026-11-27 | ↻ L2.07c, ↻ L2.09b, ↻ L3.01 | [L3.02 Ranking maths and SQL internals](l3-02-ranking-sql.md) *(part 2, 40 min)*<br>[L3.03 Gestures, springs, 3D and scrolling](l3-03-gestures-3d.md) *(part 1, 20 min)* | 90 | ☐ |
| 31 | 2026-11-30 | ↻ L2.09c, ↻ L2.10c, ↻ L3.02 | [L3.03 Gestures, springs, 3D and scrolling](l3-03-gestures-3d.md) *(part 2, 55 min)* | 85 | ☐ |
| 32 | 2026-12-01 | ↻ L2.07b, ↻ L2.10a, ↻ L3.01, ↻ L3.03 | 📖 [Read: Josh W. Comeau, A friendly introduction to spring physics](https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/)<br>[L3.04 Viewports, contrast maths and accessibility](l3-04-viewports-contrast.md) *(part 1, 25 min)* | 90 | ☐ |
| 33 | 2026-12-02 | ↻ L2.08a, ↻ L2.10b, ↻ L3.02 | [L3.04 Viewports, contrast maths and accessibility](l3-04-viewports-contrast.md) *(part 2, 45 min)*<br>[L3.05 Performance and Lighthouse (+ Level 3 checkpoint)](l3-05-performance.md) *(part 1, 15 min)* | 90 | ☐ |
| 34 | 2026-12-03 | ↻ L2.08b, ↻ L3.03, ↻ L3.04 | [L3.05 Performance and Lighthouse (+ Level 3 checkpoint)](l3-05-performance.md) *(part 2, 55 min)* | 85 | ☐ |
| 35 | 2026-12-04 | ↻ L2.09a, ↻ L2.10c, ↻ L3.05 | 📖 [Read: web.dev, Largest Contentful Paint](https://web.dev/articles/lcp)<br>[L3.06 OAuth, PKCE, and why sign-up timed out](l3-06-oauth-pkce-504.md) *(part 1, 40 min)* | 90 | ☐ |
| 36 | 2026-12-07 | ↻ L3.01, ↻ L3.04 | [L3.06 OAuth, PKCE, and why sign-up timed out](l3-06-oauth-pkce-504.md) *(part 2, 35 min)*<br>📖 [Read: RFC 7636 (PKCE), sections 1 and 4](https://datatracker.ietf.org/doc/html/rfc7636) | 80 | ☐ |
| | | **Level 4 · Test it and ship it** | | | |
| 37 | 2026-12-08 | ↻ L2.09b, ↻ L3.02, ↻ L3.05, ↻ L3.06 | [L4.01 Testing strategy and the data-integrity tests](l4-01-testing-strategy-data.md) *(part 1, 50 min)* | 90 | ☐ |
| 38 | 2026-12-09 | ↻ L2.09c, ↻ L3.03 | [L4.01 Testing strategy and the data-integrity tests](l4-01-testing-strategy-data.md) *(part 2, 20 min)*<br>📖 [Read: Martin Fowler, The practical test pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)<br>[L4.02 Database tests in PGlite](l4-02-database-tests.md) *(part 1, 20 min)* | 90 | ☐ |
| 39 | 2026-12-10 | ↻ L2.10a, ↻ L3.06, ↻ L4.01 | [L4.02 Database tests in PGlite](l4-02-database-tests.md) *(part 2, 55 min)* | 85 | ☐ |
| 40 | 2026-12-11 | ↻ L2.10b, ↻ L3.04, ↻ L4.02 | [L4.03 Playwright foundations](l4-03-playwright-foundations.md) *(part 1, 60 min)* | 90 | ☐ |
| 41 | 2026-12-14 | ↻ L3.05, ↻ L4.01 | [L4.03 Playwright foundations](l4-03-playwright-foundations.md) *(part 2, 15 min)*<br>[L4.04 UI tests: navigation, layout and flashcards](l4-04-ui-tests-nav-cards.md) *(part 1, 55 min)* | 90 | ☐ |
| 42 | 2026-12-15 | ↻ L2.10c, ↻ L4.02, ↻ L4.03 | [L4.04 UI tests: navigation, layout and flashcards](l4-04-ui-tests-nav-cards.md) *(part 2, 20 min)*<br>📖 [Read: Playwright, Locators](https://playwright.dev/docs/locators)<br>[L4.05 UI tests: quiz, list, theme, runner and results](l4-05-ui-tests-quiz-runner.md) *(part 1, 20 min)* | 90 | ☐ |
| 43 | 2026-12-16 | ↻ L3.01, ↻ L3.06, ↻ L4.04 | [L4.05 UI tests: quiz, list, theme, runner and results](l4-05-ui-tests-quiz-runner.md) *(part 2, 50 min)* | 80 | ☐ |
| 44 | 2026-12-17 | ↻ L3.02, ↻ L4.03, ↻ L4.05 | [L4.06 Live security tests and the signed-in journey](l4-06-live-security-auth.md) *(part 1, 60 min)* | 90 | ☐ |
| 45 | 2026-12-18 | ↻ L3.03, ↻ L4.01, ↻ L4.04 | [L4.06 Live security tests and the signed-in journey](l4-06-live-security-auth.md) *(part 2, 15 min)*<br>[L4.07 Accessibility, Lighthouse and flaky-test forensics](l4-07-a11y-lighthouse-flaky.md) *(part 1, 45 min)* | 90 | ☐ |
| 46 | 2026-12-21 | ↻ L4.02, ↻ L4.05, ↻ L4.06 | [L4.07 Accessibility, Lighthouse and flaky-test forensics](l4-07-a11y-lighthouse-flaky.md) *(part 2, 20 min)*<br>[L4.08 Ship it: deploy from Git and operate (+ Level 4 checkpoint)](l4-08-deploy-operate.md) *(part 1, 40 min)* | 90 | ☐ |
| 47 | 2026-12-22 | ↻ L3.04, ↻ L4.07 | [L4.08 Ship it: deploy from Git and operate (+ Level 4 checkpoint)](l4-08-deploy-operate.md) *(part 2, 35 min)*<br>📖 [Read: Vercel, Project configuration (vercel.json)](https://vercel.com/docs/project-configuration)<br>[L4.09 A sign-in you can't automate, and a live incident](l4-09-auth-tests-incident-ops.md) *(part 1, 15 min)* | 90 | ☐ |
| 48 | 2026-12-23 | ↻ L3.05, ↻ L4.03, ↻ L4.06, ↻ L4.08 | [L4.09 A sign-in you can't automate, and a live incident](l4-09-auth-tests-incident-ops.md) *(part 2, 60 min)* | 100 | ☐ |
| | | **Mastery** | | | |
| 49 | 2026-12-24 | ↻ L4.04, ↻ L4.07, ↻ L4.09 | 🏁 [Mastery checkpoint: rebuild from memory](mastery.md) *(part 1, 60 min)* | 90 | ☐ |
| 50 | 2026-12-25 | ↻ L3.06, ↻ L4.05, ↻ L4.08 | 🏁 [Mastery checkpoint: rebuild from memory](mastery.md) *(part 2, 60 min)* | 90 | ☐ |
| 51 | 2026-12-28 | ↻ L4.09 | 🏁 [Mastery checkpoint: rebuild from memory](mastery.md) *(part 3, 75 min)* | 85 | ☐ |
| 52 | 2026-12-29 | ↻ L4.01, ↻ L4.06 | — *(review only)* | 20 | ☐ |
| 53 | 2026-12-30 | ↻ L4.02, ↻ L4.07 | — *(review only)* | 20 | ☐ |
| 54 | 2026-12-31 | ↻ L4.08 | — *(review only)* | 10 | ☐ |
| 55 | 2027-01-01 | ↻ L4.03, ↻ L4.09 | — *(review only)* | 20 | ☐ |
| 56 | 2027-01-04 | ↻ L4.04 | — *(review only)* | 10 | ☐ |
| 57 | 2027-01-05 | ↻ L4.05 | — *(review only)* | 10 | ☐ |
| 58 | 2027-01-06 | — | — *(free)* | 0 | ☐ |
| 59 | 2027-01-07 | ↻ L4.06 | — *(review only)* | 10 | ☐ |
| 60 | 2027-01-08 | ↻ L4.07 | — *(review only)* | 10 | ☐ |
| 61 | 2027-01-11 | ↻ L4.08 | — *(review only)* | 10 | ☐ |
| 62 | 2027-01-12 | ↻ L4.09 | — *(review only)* | 10 | ☐ |

## Make your own schedule

Save this script as `plan.mjs` anywhere and run `node plan.mjs <minutesPerDay> <daysPerWeek> <YYYY-MM-DD start>`. It prints a schedule in the same format (paste it over the table above). `node plan.mjs 60 5 2026-11-02 summary` prints one summary row.

<details><summary>plan.mjs</summary>

```js
// Usage: node plan.mjs [minutesPerDay=90] [daysPerWeek=5] [start=2026-10-19] [format=md|summary]
const [mpd = 90, dpw = 5, start = "2026-10-19", format = "md"] = process.argv.slice(2);
const L1 = "Level 1 · Foundations", L2 = "Level 2 · Build it", L3 = "Level 3 · Under the hood", L4 = "Level 4 · Test it and ship it", M = "Mastery";
const items = [
  ["setup", L1, "practice", "Setup: install Node, Git, a browser; clone and run the app (in L1.05)", 30],
  ["l1-01", L1, "learn", "L1.01 What we built, the map, and the build log", 45],
  ["l1-02", L1, "learn", "L1.02 Prerequisites I: the web platform", 70],
  ["l1-03", L1, "learn", "L1.03 Prerequisites II: TypeScript and React", 75],
  ["read-react-effects", L1, "read", "Read: react.dev, Synchronizing with Effects", 25],
  ["l1-04", L1, "learn", "L1.04 Prerequisites III: SQL, auth, keys and hosting", 70],
  ["read-supabase-rls", L1, "read", "Read: Supabase, Row Level Security", 20],
  ["l1-05", L1, "learn", "L1.05 Setup and the first working slice (+ Level 1 checkpoint)", 75],
  ["l2-01", L2, "learn", "L2.01 From PDFs to 130 questions: the data pipeline", 60],
  ["l2-02", L2, "learn", "L2.02 The database I: tables, constraints and RLS", 70],
  ["l2-03", L2, "learn", "L2.03 The database II: server-side grading and the leaderboard", 75],
  ["read-pg-window", L2, "read", "Read: PostgreSQL, Window functions tutorial", 15],
  ["l2-04", L2, "learn", "L2.04 Entry point, config and the small libraries", 70],
  ["l2-05", L2, "learn", "L2.05 The app shell", 75],
  ["read-motion-presence", L2, "read", "Read: Motion, AnimatePresence", 15],
  ["l2-06a", L2, "learn", "L2.06a The UI kit", 75],
  ["l2-06b", L2, "learn", "L2.06b The animated mug, the icon set and the Home page", 70],
  ["l2-07a", L2, "learn", "L2.07a Auth state and email-code sign-in", 70],
  ["l2-07c", L2, "learn", "L2.07c Google sign-in, line by line", 80],
  ["read-supabase-google", L2, "read", "Read: Supabase, Login with Google", 15],
  ["l2-07b", L2, "learn", "L2.07b Leaderboard names, the account page and progress sync", 75],
  ["l2-08a", L2, "learn", "L2.08a Flashcards I: the deck, the swipe card and the flip", 75],
  ["l2-08b", L2, "learn", "L2.08b Flashcards II: quiz mode and the searchable list", 70],
  ["l2-09a", L2, "learn", "L2.09a The ranked test I: intro and starting a test", 60],
  ["l2-09b", L2, "learn", "L2.09b The ranked test II: the runner", 75],
  ["l2-09c", L2, "learn", "L2.09c The ranked test III: results and the leaderboard", 75],
  ["l2-10a", L2, "learn", "L2.10a Styling I: tokens, themes, base and the shell", 70],
  ["l2-10b", L2, "learn", "L2.10b Styling II: every component", 75],
  ["l2-10c", L2, "learn", "L2.10c Styling III: the responsive layer (+ Level 2 checkpoint)", 75],
  ["l3-01", L3, "learn", "L3.01 The security model", 70],
  ["read-pg-definer", L3, "read", "Read: PostgreSQL, Writing SECURITY DEFINER functions safely", 10],
  ["l3-02", L3, "learn", "L3.02 Ranking maths and SQL internals", 65],
  ["l3-03", L3, "learn", "L3.03 Gestures, springs, 3D and scrolling", 75],
  ["read-springs", L3, "read", "Read: Josh W. Comeau, A friendly introduction to spring physics", 25],
  ["l3-04", L3, "learn", "L3.04 Viewports, contrast maths and accessibility", 70],
  ["l3-05", L3, "learn", "L3.05 Performance and Lighthouse (+ Level 3 checkpoint)", 70],
  ["read-lcp", L3, "read", "Read: web.dev, Largest Contentful Paint", 20],
  ["l3-06", L3, "learn", "L3.06 OAuth, PKCE, and why sign-up timed out", 75],
  ["read-rfc7636", L3, "read", "Read: RFC 7636 (PKCE), sections 1 and 4", 25],
  ["l4-01", L4, "learn", "L4.01 Testing strategy and the data-integrity tests", 70],
  ["read-pyramid", L4, "read", "Read: Martin Fowler, The practical test pyramid", 30],
  ["l4-02", L4, "learn", "L4.02 Database tests in PGlite", 75],
  ["l4-03", L4, "learn", "L4.03 Playwright foundations", 75],
  ["l4-04", L4, "learn", "L4.04 UI tests: navigation, layout and flashcards", 75],
  ["read-locators", L4, "read", "Read: Playwright, Locators", 20],
  ["l4-05", L4, "learn", "L4.05 UI tests: quiz, list, theme, runner and results", 70],
  ["l4-06", L4, "learn", "L4.06 Live security tests and the signed-in journey", 75],
  ["l4-07", L4, "learn", "L4.07 Accessibility, Lighthouse and flaky-test forensics", 65],
  ["l4-08", L4, "learn", "L4.08 Ship it: deploy from Git and operate (+ Level 4 checkpoint)", 75],
  ["read-vercel-config", L4, "read", "Read: Vercel, Project configuration (vercel.json)", 20],
  ["l4-09", L4, "learn", "L4.09 A sign-in you can't automate, and a live incident", 75],
  ["mastery", M, "checkpoint", "Mastery checkpoint: rebuild from memory", 195],
].map(([id, level, kind, title, minutes]) => ({ id, level, kind, title, minutes }));

const HREF = {
  setup: "l1-05-setup-first-slice.md", mastery: "mastery.md",
  "read-react-effects": "https://react.dev/learn/synchronizing-with-effects",
  "read-supabase-rls": "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "read-pg-window": "https://www.postgresql.org/docs/current/tutorial-window.html",
  "read-motion-presence": "https://motion.dev/docs/react-animate-presence",
  "read-pg-definer": "https://www.postgresql.org/docs/current/sql-createfunction.html",
  "read-springs": "https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/",
  "read-lcp": "https://web.dev/articles/lcp",
  "read-pyramid": "https://martinfowler.com/articles/practical-test-pyramid.html",
  "read-locators": "https://playwright.dev/docs/locators",
  "read-vercel-config": "https://vercel.com/docs/project-configuration",
  "read-supabase-google": "https://supabase.com/docs/guides/auth/social-login/auth-google",
  "read-rfc7636": "https://datatracker.ietf.org/doc/html/rfc7636",
  "l1-01": "l1-01-what-we-built.md", "l1-02": "l1-02-web-platform.md", "l1-03": "l1-03-typescript-react.md", "l1-04": "l1-04-data-auth-hosting.md", "l1-05": "l1-05-setup-first-slice.md",
  "l2-01": "l2-01-data-pipeline.md", "l2-02": "l2-02-tables-and-rls.md", "l2-03": "l2-03-server-grading.md", "l2-04": "l2-04-entry-config-libs.md", "l2-05": "l2-05-app-shell.md",
  "l2-06a": "l2-06a-ui-kit.md", "l2-06b": "l2-06b-mug-icons-home.md", "l2-07a": "l2-07a-auth-sign-in.md", "l2-07b": "l2-07b-account-progress.md", "l2-07c": "l2-07c-google-sign-in.md", "l2-08a": "l2-08a-flashcard-deck.md",
  "l2-08b": "l2-08b-quiz-and-list.md", "l2-09a": "l2-09a-test-intro.md", "l2-09b": "l2-09b-test-runner.md", "l2-09c": "l2-09c-results-leaderboard.md", "l2-10a": "l2-10a-tokens-base-shell.md",
  "l2-10b": "l2-10b-component-styles.md", "l2-10c": "l2-10c-responsive.md", "l3-01": "l3-01-security-model.md", "l3-02": "l3-02-ranking-sql.md", "l3-03": "l3-03-gestures-3d.md",
  "l3-04": "l3-04-viewports-contrast.md", "l3-05": "l3-05-performance.md", "l4-01": "l4-01-testing-strategy-data.md", "l4-02": "l4-02-database-tests.md", "l4-03": "l4-03-playwright-foundations.md",
  "l4-04": "l4-04-ui-tests-nav-cards.md", "l4-05": "l4-05-ui-tests-quiz-runner.md", "l4-06": "l4-06-live-security-auth.md", "l4-07": "l4-07-a11y-lighthouse-flaky.md", "l4-08": "l4-08-deploy-operate.md", "l3-06": "l3-06-oauth-pkce-504.md", "l4-09": "l4-09-auth-tests-incident-ops.md",
};

const OFFS = [1, 3, 7, 14], REV = 10, MIN_PART = 15, OVERRUN = 10;
const budget = +mpd, perWeek = +dpw;
const startDate = new Date(start + "T00:00:00Z");
function studyDate(n) {
  const d = new Date(startDate);
  let count = -1;
  for (;;) {
    const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
    if (dow < perWeek && ++count === n) return d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}
const reviewsDue = {};
const days = [];
const parts = {};
let i = 0, rest = items[0].minutes, day = 0;
while (i < items.length || Object.keys(reviewsDue).some((k) => +k >= day)) {
  const rev = reviewsDue[day] ?? [];
  let left = budget - rev.length * REV;
  const work = [];
  while (i < items.length && left > 0 && left >= Math.min(rest, MIN_PART)) {
    const take = rest <= left + OVERRUN ? rest : Math.min(rest - MIN_PART, left); // finish if within 10 min; never leave < 15 min
    parts[items[i].id] = (parts[items[i].id] ?? 0) + 1;
    work.push({ ...items[i], take, part: parts[items[i].id] });
    rest -= take; left -= take;
    if (rest === 0) {
      if (items[i].kind === "learn") for (const o of OFFS) (reviewsDue[day + o] ??= []).push(items[i].id);
      i++;
      if (i < items.length) rest = items[i].minutes;
    }
  }
  days.push({ day, date: studyDate(day), rev, work, minutes: rev.length * REV + work.reduce((s, w) => s + w.take, 0) });
  day++;
}
const split = new Set(Object.entries(parts).filter(([, n]) => n > 1).map(([id]) => id));
const newMin = items.reduce((s, x) => s + x.minutes, 0);
const revCount = days.reduce((s, d) => s + d.rev.length, 0);
const fmt = (m) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
const label = (id) => id.replace(/^l(\d)-(\w+)$/, (m, a, b) => `L${a}.${b}`);
if (format === "summary") {
  console.log(`| ${budget} min | ${perWeek} | ${days.length} | ${days.at(-1).date} | ${revCount} |`);
} else {
  console.log(`| Study days | Finish date | New material | Reviews | Total |\n|---|---|---|---|---|`);
  console.log(`| **${days.length}** | **${days.at(-1).date}** | ${fmt(newMin)} | ${revCount} × ${REV} min = ${fmt(revCount * REV)} | **${fmt(newMin + revCount * REV)}** |\n`);
  console.log(`| Level | Lessons | New material (incl. setup, reading, checkpoint) | Starts | Ends |\n|---|---|---|---|---|`);
  for (const lv of [...new Set(items.map((x) => x.level))]) {
    const its = items.filter((x) => x.level === lv);
    const first = days.find((d) => d.work.some((w) => w.level === lv));
    const last = [...days].reverse().find((d) => d.work.some((w) => w.level === lv));
    console.log(`| ${lv} | ${its.filter((x) => x.kind === "learn").length || "checkpoint"} | ${fmt(its.reduce((s, x) => s + x.minutes, 0))} | Day ${first.day + 1} · ${first.date} | Day ${last.day + 1} · ${last.date} |`);
  }
  console.log(`\n| Day | Date | Review first (10 min each) | Then new material | Min | ✓ |\n|---|---|---|---|---|---|`);
  let lastLevel = "";
  for (const d of days) {
    const lv = d.work.map((w) => w.level).find((l) => l !== lastLevel);
    if (lv) { console.log(`| | | **${lv}** | | | |`); lastLevel = d.work.at(-1).level; }
    const icon = (k) => (k === "read" ? "📖 " : k === "practice" ? "🛠 " : k === "checkpoint" ? "🏁 " : "");
    const w = d.work.map((x) => `${icon(x.kind)}[${x.title}](${HREF[x.id]})${split.has(x.id) ? ` *(part ${x.part}, ${x.take} min)*` : ""}`).join("<br>");
    console.log(`| ${d.day + 1} | ${d.date} | ${d.rev.map((r) => "↻ " + label(r)).join(", ") || "—"} | ${w || (d.rev.length ? "— *(review only)*" : "— *(free)*")} | ${d.minutes} | ☐ |`);
  }
}
```
</details>

---
← [Hub](README.md) · [L1.01 What we built →](l1-01-what-we-built.md)
