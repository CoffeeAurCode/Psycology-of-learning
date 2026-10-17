# Outline (source of truth for ids, order and times)

Series: **`psych-learning-build`** · Mode: **Session** (turning the build of the *Psychology of Learning · Coffee aur Code* app into lessons) · Format: **Markdown only** (user request).

**Extended 2026-10-17 with session 2** (sign-up returned HTTP 504 → Google-only sign-in). New ids: `l2-07c`, `l3-06`, `l4-09`; no old id was renumbered. Superseded content in older lessons carries a "Session 2 update" note instead of being rewritten, so the history and its bug stories stay intact.

---

## 1. Mastery spec

When you finish, you can do all of this **with an editor and a terminal, and no notes, docs or AI**:

1. **Extract the data.** Turn 12 assignment PDFs plus a saved SWAYAM page into `src/data/questions.json`: 130 questions, ids `week*100 + n`, 0-based answer indexes. Then regenerate `supabase/seed.sql` and `supabase/setup.sql` from it with a script.
2. **Write the database.** Write `supabase/schema.sql` from a blank file: 4 tables, row-level security (RLS) on all of them, the 8 policies, and the 4 functions (`start_test`, `submit_test`, `get_leaderboard`, `get_my_stats`) with the right `security definer`, `search_path` and grants. Explain why a student cannot forge a score.
3. **Scaffold the app.** Create a Vite + React + TypeScript app by hand (`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `main.tsx`), with no generator.
4. **Build the shell.** Providers (theme, auth, progress), router, animated page transitions, a tab bar that becomes a side rail on laptops, a first-load splash, and an error boundary.
5. **Build Google sign-in.** Configure the Google Cloud OAuth client (branding, authorised domains as top private domains, audience, redirect URI = Supabase callback) and Supabase (Google provider, Site URL, redirect allow-list, Email off). Write `SignIn` with `signInWithOAuth` and a `redirectTo` that keeps `?next`, the client options `detectSessionInUrl: true` + `flowType: "pkce"`, and the `?error` return. A "choose a leaderboard name" step and an account page follow. Flashcard progress syncs local ↔ cloud with "newest wins". *(Session 1 built email-code sign-in; it is kept in L2.07a as history.)*
6. **Build the flashcards.** A deck with swipe right/left (got it / again), a 3D flip that works in Safari, undo, hide-mastered, shuffle, a quiz mode and a searchable list.
7. **Build the ranked test.** 100 random questions with a server-side start time, auto-advance, flags, a question grid, resume after reload, a submit sheet, results with an animated ring, and a podium leaderboard.
8. **Style it for every screen.** A token-based light/dark design that works from a 280 px Galaxy Fold to a 1920 px desktop, with safe areas, `dvh`, and fallbacks for old Safari. Pass axe accessibility checks.
9. **Test it.** Explain the test pyramid used here, then write from blank files: (a) data-integrity tests that check every answer against the PDFs and prove they can fail (mutation check); (b) PGlite database tests that simulate Supabase's `anon`/`authenticated` roles to prove RLS and grading; (c) a Playwright config with 11 device/browser projects and a local production-build server; (d) UI tests that wait correctly for animations; (e) live security tests and a signed-in journey that injects a real session (no emails, no Google UI) and deletes only its own users, plus a Google hand-off test at the Supabase boundary; (f) axe accessibility scans in both themes. Run Lighthouse and read its metrics, and diagnose a failing or flaky test from its report.
10. **Ship it.** Git hygiene for secrets, Vercel deploy from Git with env vars, `vercel.json` rewrites/redirects/headers, domains, SEO files, analytics, and the Supabase and Google Cloud dashboard settings for sign-in.
11. **Debug from symptoms.** Diagnose every bug story in this series from its symptom alone (session 2 added ten).
12. **Run an incident.** Given "users get HTTP 504 on sign-up", find the failing hop with five probes (timed status checks, auth settings, the endpoint itself, a masked user listing, the dependency's port), explain the cause (504 vs 502/503/429; dropped vs refused connections), and prove a fix is live by fingerprinting the bundle. Explain PKCE with its formula and numbers.

## 2. Knowledge inventory

| Item | Tag | Taught in |
|---|---|---|
| HTML document, `<head>` meta, viewport, module scripts | prerequisite | l1-02 |
| CSS cascade, custom properties, media queries, flex/grid, transforms | prerequisite | l1-02, l2-10a |
| DOM events: click, pointer, touch, keyboard, `beforeunload` | prerequisite | l1-02, l3-03 |
| `localStorage` / `sessionStorage`, JSON | prerequisite | l1-02, l2-04 |
| HTTP, REST, JSON APIs, status codes, CORS-free same-origin | prerequisite | l1-02 |
| SPA routing, History API, URL query strings | prerequisite | l1-02, l2-05 |
| TypeScript types, unions, generics, `as`, non-null `!` | prerequisite | l1-03 |
| ES modules, `import`/`export`, JSON imports | prerequisite | l1-03 |
| React: JSX, components, props, `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`, context, keys, StrictMode | prerequisite | l1-03 |
| SQL: tables, primary/foreign keys, constraints, indexes, `insert … on conflict` | prerequisite | l1-04 |
| Postgres functions, PL/pgSQL, arrays, JSON | core | l1-04, l2-03 |
| Row-level security, roles `anon`/`authenticated`, grants | core | l1-04, l2-02, l3-01 |
| Auth: sessions, JWT, OTP email codes, publishable vs secret keys | prerequisite | l1-04, l2-07a |
| Environment variables, `.env`, `import.meta.env`, `VITE_` prefix | prerequisite | l1-04, l2-04 |
| Git, `.gitignore`, static hosting/CDN, Vercel | prerequisite | l1-04, l4-03 |
| Node/npm, `package.json` scripts, pinned versions, lockfile | prerequisite | l1-05 |
| Vite dev server, build, preview, chunks | core | l1-05, l2-04, l3-05 |
| `pdftotext`, reading images, data ids `week*100+n` | core | l2-01 |
| Seed generation, SQL string escaping `''` | core | l2-01 |
| `security definer`, `set search_path`, `auth.uid()` | core | l2-03, l3-01 |
| `distinct on`, `rank() over`, `generate_subscripts`, `for update` | deep | l2-03, l3-02 |
| React Router 7 (`BrowserRouter`, `Routes`, `NavLink`, `useSearchParams`) | core | l2-05 |
| Motion (`motion`, `AnimatePresence`, `layoutId`, `useMotionValue`, `useTransform`, `useSpring`, drag) | core | l2-05, l2-06a, l2-08a, l3-03 |
| Error boundaries (class components) | core | l2-05 |
| SVG drawing and CSS keyframe animation (the mug) | core | l2-06b |
| Supabase JS: `createClient`, `rpc`, `from().select/upsert/delete`, `auth.signInWithOtp/verifyOtp/onAuthStateChange` | core | l2-04, l2-07a, l2-07b |
| Optimistic local state + cloud merge ("newest wins") | core | l2-07b |
| Fisher–Yates shuffle | core | l2-04 |
| Swipe gesture thresholds (offset/velocity), 3D flip | core | l2-08a, l3-03 |
| Test runner state machine, resume via storage | core | l2-09a, l2-09b |
| Design tokens, theming with `prefers-color-scheme` + `data-theme` | core | l2-10a |
| Responsive breakpoints, `dvh`, safe-area insets, `@supports` fallbacks | core | l2-10c, l3-04 |
| WCAG contrast ratio maths, axe | deep | l3-04 |
| `overflow: clip` vs `hidden`, sticky, `overscroll-behavior` | deep | l3-03 |
| `backface-visibility` and WebKit | deep | l3-03 |
| Lighthouse metrics (FCP, LCP, CLS, TBT), fonts, image sizing, cache headers | deep | l3-05 |
| Test pyramid, what each layer proves | core | l4-01 |
| `node:test`, mutation check | core | l4-01 |
| PGlite, role simulation, `set role` | core | l4-02 |
| Playwright projects, devices, `webServer`, locators, auto-waiting, `expect.poll` | core | l4-03, l4-04 |
| Waiting out animations, realistic gestures, CDP touch, flaky-test diagnosis | deep | l4-04, l4-05, l4-07 |
| Route mocking (`page.route`), live API tests with supabase-js | core | l4-06 |
| Supabase admin API (`createUser`, `generateLink`, `deleteUser`), per-file cleanup | core | l4-06 |
| axe-core accessibility scans, Lighthouse CLI | core | l4-07 |
| Vercel CLI (device login, link, env, deploy, API), Git integration, framework preset | core | l4-08 |
| `vercel.json` rewrites/redirects/headers, `.vercelignore`, domains | core | l4-08 |
| SEO: title/description, canonical, OG, JSON-LD, robots, sitemap; Vercel Analytics | core | l4-08 |
| *Session 2:* HTTP 5xx family and 429; gateways and upstreams; probing hop by hop | core | l3-06, l4-09 |
| *Session 2:* SMTP, ports 25/465/587, implicit TLS vs STARTTLS, refused vs timed-out connections, sender domains | deep | l3-06 |
| *Session 2:* OAuth 2.0 authorisation code flow, public vs confidential clients, `state`, redirect URIs, front vs back channel | core | l2-07c, l3-06 |
| *Session 2:* PKCE (verifier, S256 challenge, base64url, entropy), supabase-js verifier storage | deep | l2-07c, l3-06 |
| *Session 2:* Supabase `signInWithOAuth`, `detectSessionInUrl`, `flowType`, Site URL and Redirect URLs | core | l2-07c |
| *Session 2:* Google Cloud OAuth client: branding, authorised domains, audience, redirect URI; the Public Suffix List | core | l2-07c, l3-06 |
| *Session 2:* boundary tests, route interception of navigations, session injection, `toHaveCount(0)` | core | l4-09 |
| *Session 2:* incident probes, bundle fingerprints, allow-list redaction, `< /dev/null` + `timeout` | core | l4-09 |

## 3. Level plan (minutes = study + practice, ×1.3 buffer, rounded to 5)

| Id | File | Title | Min |
|---|---|---|---|
| setup | (l1-05) | Install Node, Git, a browser; clone and run the finished app | 30 |
| l1-01 | `l1-01-what-we-built.md` | What we built, the map, and the build log | 45 |
| l1-02 | `l1-02-web-platform.md` | Prerequisites I: the web platform an app stands on | 70 |
| l1-03 | `l1-03-typescript-react.md` | Prerequisites II: TypeScript and React, enough to read every line | 75 |
| l1-04 | `l1-04-data-auth-hosting.md` | Prerequisites III: SQL, auth, keys and hosting | 70 |
| l1-05 | `l1-05-setup-first-slice.md` | Setup and the first working slice (+ Level 1 checkpoint) | 75 |
| l2-01 | `l2-01-data-pipeline.md` | From PDFs to 130 questions: the data pipeline | 60 |
| l2-02 | `l2-02-tables-and-rls.md` | The database I: tables, constraints and row-level security | 70 |
| l2-03 | `l2-03-server-grading.md` | The database II: server-side grading and the leaderboard | 75 |
| l2-04 | `l2-04-entry-config-libs.md` | Entry point, config and the small libraries | 70 |
| l2-05 | `l2-05-app-shell.md` | The app shell: providers, routes, navigation, splash, error boundary | 75 |
| l2-06a | `l2-06a-ui-kit.md` | The UI kit: sheets, switches, segmented control, rings, confetti | 75 |
| l2-06b | `l2-06b-mug-icons-home.md` | The animated mug, the icon set and the Home page | 70 |
| l2-07a | `l2-07a-auth-sign-in.md` | Auth state and email-code sign-in | 70 |
| l2-07c | `l2-07c-google-sign-in.md` | Google sign-in, line by line (session 2) | 80 |
| l2-07b | `l2-07b-account-progress.md` | Leaderboard names, the account page and progress sync | 75 |
| l2-08a | `l2-08a-flashcard-deck.md` | Flashcards I: the deck, the swipe card and the flip | 75 |
| l2-08b | `l2-08b-quiz-and-list.md` | Flashcards II: deck finished, quiz mode and the searchable list | 70 |
| l2-09a | `l2-09a-test-intro.md` | The ranked test I: intro, attempt storage and starting a test | 60 |
| l2-09b | `l2-09b-test-runner.md` | The ranked test II: the runner | 75 |
| l2-09c | `l2-09c-results-leaderboard.md` | The ranked test III: results and the leaderboard | 75 |
| l2-10a | `l2-10a-tokens-base-shell.md` | Styling I: tokens, themes, base and the shell | 70 |
| l2-10b | `l2-10b-component-styles.md` | Styling II: every component | 75 |
| l2-10c | `l2-10c-responsive.md` | Styling III: the responsive layer (+ Level 2 checkpoint) | 75 |
| l3-01 | `l3-01-security-model.md` | Under the hood: the security model | 70 |
| l3-02 | `l3-02-ranking-sql.md` | Under the hood: ranking maths and SQL internals | 65 |
| l3-03 | `l3-03-gestures-3d.md` | Under the hood: gestures, springs, 3D and scrolling | 75 |
| l3-04 | `l3-04-viewports-contrast.md` | Under the hood: viewports, contrast maths and accessibility | 70 |
| l3-05 | `l3-05-performance.md` | Under the hood: performance and Lighthouse (+ Level 3 checkpoint) | 70 |
| l3-06 | `l3-06-oauth-pkce-504.md` | Under the hood: OAuth, PKCE, and why sign-up timed out (session 2; + Level 3 checkpoint addendum) | 75 |
| l4-01 | `l4-01-testing-strategy-data.md` | Test it I: testing strategy and the data-integrity tests | 70 |
| l4-02 | `l4-02-database-tests.md` | Test it II: database tests in PGlite with simulated Supabase roles | 75 |
| l4-03 | `l4-03-playwright-foundations.md` | Test it III: Playwright foundations: config, helpers, teardown, HTTP checks | 75 |
| l4-04 | `l4-04-ui-tests-nav-cards.md` | Test it IV: UI tests for navigation, layout and flashcards | 75 |
| l4-05 | `l4-05-ui-tests-quiz-runner.md` | Test it V: UI tests for quiz, list, theme, test runner and results | 70 |
| l4-06 | `l4-06-live-security-auth.md` | Test it VI: live security tests and the signed-in journey | 75 |
| l4-07 | `l4-07-a11y-lighthouse-flaky.md` | Test it VII: accessibility audits, Lighthouse and flaky-test forensics | 65 |
| l4-08 | `l4-08-deploy-operate.md` | Ship it: deploy from Git and operate (+ Level 4 checkpoint) | 75 |
| l4-09 | `l4-09-auth-tests-incident-ops.md` | Test it and run it: a sign-in you can't automate, and a live incident (session 2; + Level 4 checkpoint addendum) | 75 |
| mastery | `mastery.md` | Mastery checkpoint: rebuild from memory | 195 |

Level totals: **L1 365** (incl. setup 30) · **L2 1,295** · **L3 425** · **L4 655** · **Mastery 195** → **2,935 min of new material (48 h 55 min)**. Spaced reviews (4 × 10 min per lesson) are added on top in `plan.md`. `plan.md` also schedules 12 outside-reading items (240 min) from the hub's reading path, so the plan's new-material total is 3,175 min (52 h 55 min), and 4,695 min (78 h 15 min) with the 152 reviews. *(Session 1 totals were L2 1,215 · L3 350 · L4 580 · Mastery 180; session 2 added 230 lesson minutes, 40 reading minutes and 15 mastery minutes. L2.07c is 80 minutes because it also walks two dashboards; by this series' calibration, lessons of its size run 75–85.)*

Rates used: prose 150 wpm; annotated TS/SQL 1 min per 4 lines; annotated CSS 1 min per 8 lines (one declaration per line, many lines are repetitive); quizzes 1 min; cloze 5; blank-page 10–20; flashcards 0.5 each; exercises 10/20/40; checkpoint 20. Buffer ×1.3. The 1,749-line `styles.css` and 674-line `responsive.css` are walked in full across l2-10a/b/c.

## 4. Visual plan (Markdown edition)

Markdown cannot run JavaScript, so the series uses:
- **Mermaid** diagrams (flowcharts, sequence diagrams, state machines, ER diagrams), which GitHub, VS Code and Obsidian render as SVG. These are never ASCII art.
- **LaTeX math** in `$…$` and `$$…$$`, which GitHub renders.
- **Step-through frames.** A numbered table where each row is one frame of the animation: the code line that ran, the state after it, and a "predict" question before the reveal. This replaces animated steppers.
- **`<details>` reveals** for every answer, hint and solution, to keep the effort in recall.

| Lesson | Visuals |
|---|---|
| l1-01 | Architecture flowchart; sequence diagram of one test attempt end to end; build-log timeline |
| l1-02 | Request/response sequence; event propagation flowchart; SPA routing flowchart |
| l1-03 | React render → commit → effect cycle state diagram; step frames of `useState` updates |
| l1-04 | ER diagram of the 4 tables; RLS decision flowchart; OTP sign-in sequence |
| l1-05 | File-dependency flowchart of the first slice; step frames of the flip |
| l2-01 | Pipeline flowchart PDF → JSON → SQL; step frames of the answer-line parser |
| l2-02 | ER diagram with policies; RLS decision per role |
| l2-03 | Sequence diagram start → submit; step frames of grading a 5-question toy attempt with real numbers |
| l2-04 | Module graph; theme resolution state diagram |
| l2-05 | Provider tree; route transition state diagram; splash phase state machine |
| l2-06a | Sheet drag state diagram; ring maths (circumference/offset) |
| l2-06b | SVG coordinate sketch as Mermaid block; steam keyframe timeline |
| l2-07a | OTP state machine (email → code → name → me); auth state sequence |
| l2-07b | Merge algorithm step frames with real timestamps |
| l2-08a | Swipe decision flowchart; step frames of a drag; flip angle → face visibility table |
| l2-08b | Quiz state machine; search highlight frames |
| l2-09a/b/c | Test runner state machine; auto-advance timing sequence; ring offset maths; podium ordering frames |
| l2-10a/b/c | Token cascade flowchart; breakpoint map; deck-height derivation |
| l3-01 | Threat model flowchart; RLS + definer sequence |
| l3-02 | `distinct on` + `rank()` frames on 6 sample rows |
| l3-03 | Pointer event sequence; spring damping maths; AnimatePresence lifecycle; backface frames |
| l3-04 | Contrast ratio derivation with our real colours |
| l3-05 | Critical rendering path flowchart; byte maths for the images |
| l4-01 | Test pyramid flowchart; mutation-check step frames |
| l4-02 | PGlite role-switch sequence; RLS test matrix |
| l4-03 | Playwright project matrix; webServer lifecycle sequence |
| l4-04 | "wait for the transition" timing sequence; swipe event frames |
| l4-05 | Runner test step frames |
| l4-06 | Auth journey sequence with route mocking; cleanup isolation race (sequence) |
| l4-07 | axe/Lighthouse pipeline; flaky-test decision flowchart |
| l4-08 | Deploy pipeline flowchart; alias redirect sequence |
| l2-07c | Before/after flowchart (SMTP → Google); six-hop sequence diagram with the real 302; step frames of a new student's sign-in |
| l3-06 | Four-machine flowchart of the 504; SMTP sequence; nested OAuth flows; PKCE derivation (LaTeX) with real numbers; probe-by-probe step frames |
| l4-09 | Boundary flowchart (what each test covers); step frames of the hand-off test |

## 5. Design brief (Markdown edition)

- **Design read.** A self-taught builder reading in VS Code or on GitHub. Markdown has no custom fonts or colours, so the design lives in structure and voice.
- **Visual world: the café menu of Coffee aur Code.** Every lesson opens with a **recipe card** (a table: time, you need, you'll produce). Bug stories are **incident tickets** with a fixed field order (Symptom · Diagnosis · Root cause · Fix · Lesson). Cheat sheets are titled **"The menu board"**.
- **Signature element.** The **step-through frame table**: one row per moment, a predict question hidden above the reveal. It is the Markdown stand-in for animation and is used in every Level 2 lesson.
- **Content types.** Annotated code is a fenced block, then a numbered "line notes" list keyed by line ranges (what · why · what breaks if changed). Quizzes are numbered questions with options and a `<details>` answer that explains every wrong option. Flashcards are `Q:`/`A:` pairs inside `<details>`. Cloze is a code block with `___` blanks and the answer in `<details>`. Blank-page drills have a "No scrolling up" rule and a checkbox self-check list.
- **Navigation.** Every lesson ends with ← previous · [Hub](README.md) · next →. The hub `README.md` renders as the folder landing page on GitHub.
- **Different from other series.** This is the first series in this workspace.
- **Session 2 extension.** Same café-menu world and section order. New lessons are tagged *Session 2* under their level line; older lessons get a "Session 2 update" blockquote right after their two-sentence summary.
