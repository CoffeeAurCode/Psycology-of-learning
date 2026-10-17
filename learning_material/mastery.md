# Mastery checkpoint · Rebuild it from memory

> **The final checkpoint** · 195 min in three sittings · then retake after 7 days

| Recipe card | |
|---|---|
| **Time** | 195 min (three sittings of 60, 70 and 65 minutes), plus the optional full rebuild |
| **You need** | All four levels done, an editor, a terminal, Node, and the course PDFs. **Nothing else**: no notes, no lesson pages, no docs, no AI |
| **You'll produce** | Proof that you can build, secure, test and ship the app unaided |

**In two sentences:** This page is the from-memory bar the whole series aims at: if you can do what's below with an empty editor, you've learned the project, not just read about it. It's arranged as a ladder, from one big challenge, to component drills, to explaining it to someone else, to debugging from symptoms, to the master deck, so you can find exactly which rung you're still missing.

---

## 1 · The rebuild challenge

**Rules.** An editor and a terminal. You may read error messages and `--help` output. You may not open this series, the original repository, documentation sites or an AI assistant. Use a new empty folder.

**Time box.** The checkpoint itself is three 60-minute sittings (one per block below). The **full rebuild**, every file of the app, takes most learners 2–4 days of focused work; do it once, after the checkpoint, as the ultimate test.

| Sitting | Task (from the mastery spec in `_outline.md`) | Passing bar |
|---|---|---|
| **A · Data and database** (60 min) | 1. Write the extraction plan for the PDFs and the shape of `questions.json` (ids `week*100 + n`, 0-based answers), and `scripts/gen-seed.mjs` that writes `seed.sql`/`setup.sql`. 2. Write `supabase/schema.sql` from a blank file: 4 tables, RLS on all, the 8 policies, the 4 functions with `security definer`, `search_path` and grants. | The original repository's `npm run test:unit` and `npm run test:db` pass when your `schema.sql` (concatenated with the real `seed.sql` as `setup.sql`) replaces theirs. Explain in one paragraph why a student can't forge a score. |
| **B · The app** (70 min) | 3. Scaffold Vite + React + TypeScript by hand. 4. Write the shell (providers, router, transitions, tab bar/rail, splash, error boundary). 5. Write Google sign-in (`SignIn`, the two client options) and the name step, and list the nine dashboard settings in order. 6. Write the `SwipeCard` with swipe thresholds and the angle-driven flip. 7. Write the runner's state: attempt in storage, auto-advance, flags, resume, submit. 8. Write the token block, the deck's height formula and the side-rail override. | `npx tsc -p . --noEmit` passes on what you wrote. The self-check lists in §2 for B are all ticked. |
| **C · Test and ship** (65 min) | 9. Write `playwright.config.ts`, the support helpers, one test from each of: data, DB, UI (with a transition), live security, a11y. 10. Write `vercel.json`, the ignore files, and the Supabase checklist. 11. Diagnose the 21 symptoms in §4 without looking anything up. 12. Write the Google hand-off test and the five incident probes. | Your config lists all 12 projects with the right `testMatch`; your UI test waits for a state, never a fixed sleep for state; ≥ 18 of 21 diagnoses correct; your hand-off test intercepts `/auth/v1/authorize` before the click. |

**The full rebuild's acceptance test.** Copy the original repository's `tests/` folder into your rebuild. Your rebuild passes: `npm run test:unit` (17), `npm run test:db` (19), and `npx playwright test --project=api --project=pixel-7 --project=iphone-se --project=laptop-chrome-1366`. Class names, accessible names and storage keys are part of the contract the tests check, which is exactly why you had to learn them.

---

## 2 · Component by component (smaller rungs)

Each drill: blank file, no scrolling back, then tick the list honestly. If you miss more than one box, redo that lesson's Rung 2 tomorrow.

<details><summary><b>Drill 1 · The data pipeline (L2.01, L4.01) · 15 min</b></summary>

- [ ] `pdftotext -layout file -`; answers from `Ans.? X= text` lines, joining wrapped lines except section starts
- [ ] ids `week*100 + n`; answers 0-based; true/false exactly `["True","False"]`; week 12 from "Accepted answer is X."
- [ ] Seed generator escapes `'` as `''`; `insert … on conflict (id) do update`; `setup.sql` = schema + seed
- [ ] Data tests: shape, ids in order, seed sync regex `(?:[^']|'')*`, `ENOENT` detection, bidirectional prefix match
</details>

<details><summary><b>Drill 2 · Tables and policies (L2.02) · 15 min</b></summary>

- [ ] `questions` (RLS on, no policies) · `profiles` (3–20 chars, `^[A-Za-z0-9_. -]+$`, unique on `lower(display_name)`) · `test_attempts` (partial index for ranking) · `card_progress` (PK user + question, status check)
- [ ] Policies: profiles read/insert/update own; attempts read own; progress read/insert/update/delete own (8 total)
- [ ] `with check` on every insert/update policy
</details>

<details><summary><b>Drill 3 · The four functions (L2.03, L3.02) · 20 min</b></summary>

- [ ] `start_test`: signed in, has profile, abandon open attempt, `order by random() limit 100`, returns id + ids + `started_at`
- [ ] `submit_test`: `for update` with `user_id = auth.uid()`; not submitted; ≤ 3 h; length check; `generate_subscripts` grading; `clock_timestamp()` duration; rank from the board
- [ ] `get_leaderboard`: `distinct on (user_id)` with 4-key order; `rank() over (score desc, duration asc)`; clamped limit
- [ ] `get_my_stats`; `revoke … from public, anon` then the four grants
</details>

<details><summary><b>Drill 4 · The shell (L2.04, L2.05) · 15 min</b></summary>

- [ ] `main.tsx`: font import, CSS order, `createRoot` in `StrictMode`
- [ ] Provider order: MotionConfig › Theme › Auth › Progress › Router (+ Analytics)
- [ ] Routes with `/test/*`; `AnimatePresence mode="wait"` keyed by first path segment; scroll-to-top with braces
- [ ] Tab bar from one array; pill with `layoutId`; hidden on `/test/run`; splash 3-phase state machine with a 4 s cap; error boundary keyed by path
</details>

<details><summary><b>Drill 5 · Sign-in and sync (L2.07a–c) · 15 min</b></summary>

- [ ] `AuthProvider`: `ready`, deferred profile fetch in `onAuthStateChange`, `signOut` clears both
- [ ] `signInWithOAuth({ provider: "google", options: { redirectTo } })`, `redirectTo` = origin + `/me` + encoded `next`; busy first, never un-busy on success
- [ ] Client options `detectSessionInUrl: true`, `flowType: "pkce"`; `?error` return → fixed message, delete the three keys, keep `next`, `replace: true`
- [ ] Name step with the DB's rules; `?next=` redirect; duplicate → "That name is taken"
- [ ] Progress: local first, fire-and-forget upsert; merge newest wins on sign-in; sign-out resets without crashing
</details>

<details><summary><b>Drill 6 · The deck (L2.08a–b, L3.03) · 15 min</b></summary>

- [ ] `useMotionValue` x; tilt and stamp `useTransform`s; `drag="x"`, `dragSnapToOrigin`; 110 px or 650 px/s
- [ ] `useSpring` angle; face opacity and pointer events from `< 90`; `touch-action: pan-y` on card and scroll area
- [ ] `AnimatePresence custom={dir}` exit variants; undo; hide mastered; keyboard shortcuts with `preventDefault` on Space and Backspace
- [ ] Quiz shuffles only when the pool changes
</details>

<details><summary><b>Drill 7 · The runner and results (L2.09a–c) · 15 min</b></summary>

- [ ] `pol.attempt` schema; clock from server `started_at`; auto-advance; flags; grid; resume on reload; submit sheet; error banner keeps the attempt
- [ ] Results: mistakes = zip + filter (skipped included); ring C·(1 − v); burst ≥ 80%, mascot ≥ 60%
- [ ] Podium 2·1·3 styled by rank; pinned "you" row; refresh on `visibilitychange`
</details>

<details><summary><b>Drill 8 · Styling (L2.10a–c, L3.04) · 15 min</b></summary>

- [ ] Three theme selectors; `color-scheme`; separate `--red-ink` / `--red-fill` / `--tab-ink`
- [ ] `overflow-x: hidden; overflow-x: clip` on `html` and `body`; safe-area padding; `100dvh` with `vh` fallbacks
- [ ] Deck `clamp(340, 100dvh − 440 − inset, 540)` and the short (424) and very short (334) tiers, last in the file
- [ ] Laptop rail: `transform: none`, full height, `margin-left: var(--rail-w)`
</details>

<details><summary><b>Drill 9 · Tests and release (L4.01–L4.08) · 20 min</b></summary>

- [ ] Config: `webServer` build + preview 4174; 12 projects; retries 1; traces on failure; teardown
- [ ] Helpers: `goto` waits for the splash; `currentQuestion` waits for one card; users via admin API, OTP via `generateLink`; per-file deletion
- [ ] PGlite emulation with roles, `auth.uid()` and the table grants
- [ ] `vercel.json` redirect, rewrite, immutable assets; `.gitignore` with `!.env.example` last
</details>

<details><summary><b>Drill 10 · Google sign-in settings and the redirect chain (L2.07c, L3.06) · 15 min</b></summary>

- [ ] Google Cloud: Branding without a logo; authorised domains = the two full hostnames; External + In production; Web client with redirect URI `https://<ref>.supabase.co/auth/v1/callback`
- [ ] Supabase: Google on (ID + secret); Site URL; Redirect URLs `…/**` + localhost; Email off; SMTP off
- [ ] The six hops drawn, the two codes labelled, and who redeems each with what (client secret; PKCE verifier)
- [ ] $c = \operatorname{BASE64URL}(\operatorname{SHA256}(v))$; 43 characters; 56 × 8 = 448 bits; where the verifier is stored
- [ ] What `redirect_uri`, `state`, the client secret, the allow-list and the verifier each stop
</details>

<details><summary><b>Drill 11 · Testing sign-in and running an incident (L4.09) · 15 min</b></summary>

- [ ] `signInPage`: storage key from the hostname, session JSON via `page.evaluate`, reload, wait for ready
- [ ] Hand-off test: route before the click, `fulfill`, `expect.poll`, `redirect_to` = `/me?next=%2Ftest`, `code_challenge`; error half with `unroute`
- [ ] Absence with `toHaveCount(0)`
- [ ] The five probes and what each result means; timeout vs refused vs `220`
- [ ] Bundle fingerprint; the auth runbook; allow-list redaction; `< /dev/null` + `timeout`
</details>

---

## 3 · Explain it back (the Feynman technique)

Write each explanation for a classmate who knows JavaScript but nothing about this project. 300–400 words each, no code longer than three lines. Grade with the rubric.

**E1. "Why can't I just give myself 100 on the leaderboard?"**
<details><summary>Rubric</summary>

- [ ] The browser is untrusted; the publishable key is public on purpose
- [ ] Identity comes from a signed JWT; `auth.uid()` reads it; RLS filters every query
- [ ] No insert/update policy on attempts; scores are computed in a `security definer` function that checks ownership, length, double submit and expiry
- [ ] Time is measured by the server
- [ ] Honest limit: the answers are public study material, so a script could submit a perfect paper instantly; the proposed fix is a minimum duration
</details>

**E2. "How does the card know whether you swiped or just wobbled?"**
<details><summary>Rubric</summary>

- [ ] Pointer events, and `touch-action: pan-y` letting horizontal moves reach JavaScript
- [ ] Drag starts on an animation frame after 3 px
- [ ] Release decision: distance > 110 px **or** velocity > 650 px/s (velocity over ~100 ms)
- [ ] Otherwise it springs back; stamps and tilt are mapped from the offset
- [ ] The flip: an angle spring with ~1.4% overshoot; faces chosen by the angle, not `backface-visibility`
</details>

**E3. "Why does the app look right on an iPhone SE and on a 1920 px monitor?"**
<details><summary>Rubric</summary>

- [ ] Phone-first base plus an override file loaded last; media queries add no specificity, so order matters
- [ ] Tokens, `dvh`, safe areas
- [ ] The deck's height constants are measured chrome (440 / 424 / 334), with tiers for short screens
- [ ] The bottom bar becomes a side rail at 1024 px
- [ ] Verified by 11 device projects and a "nothing under the tab bar" assertion
</details>

**E4. "How do you know the tests themselves are right?"**
<details><summary>Rubric</summary>

- [ ] Three layers and what each proves
- [ ] Mutation checks (one answer changed; two SQL rules weakened) prove the tests can fail
- [ ] Specific error assertions (RLS vs privileges)
- [ ] Waiting for states, realistic input timing, measuring the real property
- [ ] Reading skips and flakes as bugs (the 12 skipped PDF checks, the cleanup race)
</details>

**E5. "Why did sign-up fail with a 504, and why is Google sign-in safe when it all runs in a browser?"**
<details><summary>Rubric</summary>

- [ ] A 504 is a gateway reporting a slow upstream; fast probes ruled out "down" and "paused"
- [ ] The SMTP host was the website: dropped packets on port 465 → GoTrue hangs → the gateway times out (contrast with "refused")
- [ ] Removing email removed the dependency; switching the Email provider off enforces it on the server
- [ ] Two nested flows: Supabase ↔ Google protected by the client secret; app ↔ Supabase protected by PKCE
- [ ] What a stolen code can't do, and what `state` and the redirect allow-lists stop
</details>

---

## 4 · Debug from memory

Each symptom is real (from this build) or a verified failure mode of the stack. Name the cause and the fix before opening the answer.

**D1.** First run in the browser: a blank page and `TypeError: destroy is not a function`.
<details><summary>Cause</summary>An effect written as a concise arrow returned <code>window.scrollTo(...)</code>'s Promise; React called it as cleanup. Use braces (L2.05).</details>

**D2.** *(session 1, email codes)* Nobody can sign in: every real email code is rejected.
<details><summary>Cause</summary>The project sends 8-digit codes; the app cut input to 6. Accept 6–10 (L2.07a).</details>

**D3.** On iPhones the card shows the answer mirrored before you flip it.
<details><summary>Cause</summary>WebKit didn't honour <code>backface-visibility</code> in that nesting; drive face opacity from the angle (L2.08a).</details>

**D4.** A sideways swipe takes the browser back to the previous page.
<details><summary>Cause</summary>Chrome's overscroll history navigation; <code>overscroll-behavior-x: none</code> on <code>html</code> (L2.08a).</details>

**D5.** Swipes work with a mouse but not with a finger on the options area.
<details><summary>Cause</summary>The scroll container claimed the touch gesture; <code>touch-action: pan-y</code> on <code>.fc-scroll</code> (L2.08a, L2.10b).</details>

**D6.** Signing out turns the whole app into a blank page.
<details><summary>Cause</summary><code>AnimatePresence</code> kept the exiting <code>&lt;Me/&gt;</code> mounted for its fade, it re-rendered after <code>profile</code> was cleared, and <code>profile!.display_name</code> threw. Guard after the hooks, clear session and profile together, and add an error boundary (L2.07b).</details>

**D7.** iPhones can pan the page sideways for a moment when a screen slides in.
<details><summary>Cause</summary>A transformed child extends the scrollable area; <code>overflow-x: clip</code> must be on <code>html</code> (and <code>body</code>), not only <code>body</code> (L2.10a).</details>

**D8.** On the iPhone SE the "Got it" button sits under the tab bar.
<details><summary>Cause</summary>The deck's 340 px minimum made the page too tall; short-screen tiers with measured constants (L2.10c).</details>

**D9.** The quiz marks your correct tap as wrong, now and then, right after opening.
<details><summary>Cause</summary>It shuffled twice on mount, replacing the first question; reshuffle only when the pool changes (L2.08b).</details>

**D10.** Tab labels fail axe contrast only on some phones.
<details><summary>Cause</summary>The 86% translucent bar composited over the dark hero; 95% and a darker <code>--tab-ink</code> (L3.04).</details>

**D11.** Mobile Lighthouse performance 81 with TBT 0 ms.
<details><summary>Cause</summary>A render-blocking third-party font stylesheet and oversized PNG logos; self-host the font, WebP at display size, width/height (L3.05).</details>

**D12.** The data tests report `fail 0` but `skipped 12`.
<details><summary>Cause</summary><code>pdftotext -v</code> exits 99; the detection treated any error as "missing". Check <code>ENOENT</code> (L4.01).</details>

**D13.** An image test passes on status 200 but the image is missing in production.
<details><summary>Cause</summary>The SPA rewrite serves <code>index.html</code> for missing files, and the spec defaulted to production where the file wasn't deployed. Check content types; one base URL (L4.03).</details>

**D14.** A Playwright swipe does nothing in WebKit, only in automation.
<details><summary>Cause</summary>All moves and the pointerup landed before an animation frame, so the drag never started; pace moves 16 ms apart (L4.04).</details>

**D15.** The signed-in journey fails at submit only when the full suite runs.
<details><summary>Cause</summary>Another worker's cleanup deleted every <code>e2e-bot-</code> user; delete only your own (L4.06).</details>

**D16.** `git status` stopped showing `.env.example` after linking the Vercel project.
<details><summary>Cause</summary><code>vercel link</code> appended <code>.env*</code> after <code>!.env.example</code>; the last pattern wins (L4.08).</details>

**D17.** A friend's sign-up shows HTTP 504. Health, settings and REST all answer 200 in under a second.
<details><summary>Cause</summary>Custom SMTP pointed at the website (<code>…vercel.app:465</code>); the connection hangs because packets are dropped, so the gateway times out. Fix SMTP with a real provider, or remove email sign-in (L3.06).</details>

**D18.** Google Cloud rejects `vercel.app` in Authorised domains: "Invalid domain: must be a top private domain".
<details><summary>Cause</summary><code>vercel.app</code> (like <code>supabase.co</code>) is on the Public Suffix List. Add the full hostnames <code>psychology-of-learning-nptel.vercel.app</code> and <code>&lt;ref&gt;.supabase.co</code> (L2.07c, L3.06).</details>

**D19.** Back from Google on `/me?next=%2Ftest&code=…`, the student still sees "Continue with Google".
<details><summary>Cause</summary>Nothing exchanged the code: <code>detectSessionInUrl</code> is <code>false</code>. If it's <code>true</code>, the flow finished in a different browser or tab whose storage lacks the matching verifier (L2.07c, L3.06).</details>

**D20.** Google sign-in works, but every student lands on the home page instead of the test.
<details><summary>Cause</summary><code>redirect_to</code> isn't in the Supabase Redirect URLs allow-list, so Supabase falls back to the Site URL. Add <code>https://…vercel.app/**</code> (L2.07c).</details>

**D21.** The Email provider was just switched off. A teammate starts rewriting the test helpers "because admin-minted codes won't work now". What do you do first, and what happens?
<details><summary>Cause</summary>Run <code>api-security.spec.ts</code> first. It passes (13/13): the switch closes the public email path (<code>422 email_provider_disabled</code>), but admin-minted codes still verify. No rewrite needed (L4.09).</details>

---

## 5 · Master deck

Every flashcard from every lesson, in course order. Go through all of them in one sitting the first time (≈ 3 minutes per lesson); afterwards, review only the ones you missed. Keep this deck's schedule separate from the lessons' (it's your exam deck).

**366 cards from 38 lessons.** Open a lesson's group, answer each card aloud before opening it.

<details><summary><b>L1.01 · What we built, the map, and the build log</b> · 8 cards · <a href="l1-01-what-we-built.md">lesson</a></summary>

<details><summary><b>Q:</b> Why does the server, not the browser, compute the score?</summary><b>A:</b> Anything in the browser can be changed by the user. The answer key and the grading live in Postgres, where the client cannot read the key or write attempts directly.</details>
<details><summary><b>Q:</b> Which two tables can a signed-in user write directly?</summary><b>A:</b> <code>profiles</code> (own row) and <code>card_progress</code> (own rows). <code>test_attempts</code> is written only by functions; <code>questions</code> by nobody from the browser.</details>
<details><summary><b>Q:</b> What makes the ranked time cheat-proof?</summary><b>A:</b> It is <code>now() − started_at</code>, both on the database server's clock.</details>
<details><summary><b>Q:</b> What does the publishable key let a stranger do?</summary><b>A:</b> Only what RLS and grants allow anonymous users: read the leaderboard function and attempt sign-in. Nothing private.</details>
<details><summary><b>Q:</b> How many questions are in the pool, and how many in a test?</summary><b>A:</b> 130 in the pool (weeks 0–12 × 10); each test draws 100 at random on the server.</details>
<details><summary><b>Q:</b> How does the app get deployed now?</summary><b>A:</b> <code>git push</code> to <code>main</code>; Vercel's Git integration builds with Vite and publishes.</details>
<details><summary><b>Q:</b> On a laptop, where does the tab bar go?</summary><b>A:</b> It becomes a fixed side rail (≥ 1024 px), restyled by <code>responsive.css</code>.</details>
<details><summary><b>Q:</b> What is the ranking rule?</summary><b>A:</b> Each player's best attempt; higher score first; ties broken by shorter duration.</details>

</details>

<details><summary><b>L1.02 · Prerequisites I: the web platform an app stands on</b> · 8 cards · <a href="l1-02-web-platform.md">lesson</a></summary>

<details><summary><b>Q:</b> What does <code>viewport-fit=cover</code> oblige you to do in CSS?</summary><b>A:</b> Pad content with <code>env(safe-area-inset-*)</code> so it stays out of the notch and home-indicator areas.</details>
<details><summary><b>Q:</b> Why are dark tokens written twice in our CSS?</summary><b>A:</b> Once under <code>prefers-color-scheme: dark</code> for "auto" (unless the user forced light), once under <code>[data-theme="dark"]</code> for an explicit dark choice.</details>
<details><summary><b>Q:</b> What must a <code>useEffect</code> callback return?</summary><b>A:</b> Nothing, or a cleanup function. Never a Promise or any other value.</details>
<details><summary><b>Q:</b> What does <code>pointercancel</code> mean for a swipe?</summary><b>A:</b> The browser took over the gesture (usually to scroll); the page gets no further moves or pointerup.</details>
<details><summary><b>Q:</b> Why wrap <code>localStorage</code> in try/catch?</summary><b>A:</b> It can throw in private modes, when full, or when blocked. Crashing on load is worse than losing persistence.</details>
<details><summary><b>Q:</b> Why does an SPA host need a catch-all rewrite?</summary><b>A:</b> Direct visits or refreshes of client routes reach the server, which has no such file; the rewrite serves index.html so the router can render the route.</details>
<details><summary><b>Q:</b> When is <code>Cache-Control: immutable</code> safe?</summary><b>A:</b> When the filename changes with the content (hashed build assets), so a new version always has a new URL.</details>
<details><summary><b>Q:</b> Why can <code>overflow: hidden</code> on an ancestor break <code>position: sticky</code>?</summary><b>A:</b> It makes that ancestor a scroll container; sticky then sticks relative to it, not the viewport.</details>

</details>

<details><summary><b>L1.03 · Prerequisites II: TypeScript and React, enough to read every line</b> · 9 cards · <a href="l1-03-typescript-react.md">lesson</a></summary>

<details><summary><b>Q:</b> What does a string-literal union type give you?</summary><b>A:</b> A closed set of allowed values checked at compile time (e.g. <code>"known" | "again"</code>).</details>
<details><summary><b>Q:</b> What does <code>as T</code> after <code>JSON.parse</code> actually check?</summary><b>A:</b> Nothing at runtime; it is a label telling the compiler to trust you.</details>
<details><summary><b>Q:</b> Why prefer <code>setX(x => x + 1)</code>?</summary><b>A:</b> It uses the latest queued value, so rapid repeated updates are not lost.</details>
<details><summary><b>Q:</b> When does a <code>useEffect</code> cleanup run?</summary><b>A:</b> Before the effect runs again (deps changed) and when the component unmounts.</details>
<details><summary><b>Q:</b> useRef vs useState?</summary><b>A:</b> Both persist across renders; only state changes trigger a re-render.</details>
<details><summary><b>Q:</b> Why must providers that read other contexts be nested inside them?</summary><b>A:</b> <code>useContext</code> only sees providers above it in the tree.</details>
<details><summary><b>Q:</b> Why must early returns come after all hooks?</summary><b>A:</b> React matches hooks by call order; a conditional return before a hook changes the count between renders.</details>
<details><summary><b>Q:</b> Why does StrictMode double-run effects in development?</summary><b>A:</b> To expose effects that don't clean up properly.</details>
<details><summary><b>Q:</b> Why is the swipe card keyed by <code>id + ":" + pos</code>?</summary><b>A:</b> So undo, which shows the same question at a new position, mounts a fresh card that animates in.</details>

</details>

<details><summary><b>L1.04 · Prerequisites III: SQL, auth, keys and hosting</b> · 9 cards · <a href="l1-04-data-auth-hosting.md">lesson</a></summary>

<details><summary><b>Q:</b> RLS enabled, no policies: what can users read?</summary><b>A:</b> Nothing: zero rows (writes rejected).</details>
<details><summary><b>Q:</b> <code>using</code> vs <code>with check</code>?</summary><b>A:</b> <code>using</code> filters existing rows (select/update/delete); <code>with check</code> validates new or updated rows (insert/update).</details>
<details><summary><b>Q:</b> What does <code>auth.uid()</code> return for anonymous requests?</summary><b>A:</b> <code>null</code>, so <code>auth.uid() = user_id</code> is never true.</details>
<details><summary><b>Q:</b> Why <code>security definer</code> for <code>submit_test</code>?</summary><b>A:</b> It must read the answer key and write attempts that the caller cannot; it runs with the owner's rights and checks the caller itself.</details>
<details><summary><b>Q:</b> Why <code>set search_path = public</code> on definer functions?</summary><b>A:</b> So object names resolve only in <code>public</code>, preventing hijacking via look-alike objects in another schema.</details>
<details><summary><b>Q:</b> Is a JWT secret?</summary><b>A:</b> No, it is signed, not encrypted. The payload is readable by anyone.</details>
<details><summary><b>Q:</b> Which Supabase key bypasses RLS?</summary><b>A:</b> The secret / service-role key. Never ship it to a browser.</details>
<details><summary><b>Q:</b> Why the <code>VITE_</code> prefix?</summary><b>A:</b> Only prefixed variables are exposed to client code, so other secrets aren't bundled by accident.</details>
<details><summary><b>Q:</b> Error codes 23505 and 23514?</summary><b>A:</b> Unique violation; check-constraint violation.</details>

</details>

<details><summary><b>L1.05 · Setup and the first working slice (+ Level 1 checkpoint)</b> · 6 cards · <a href="l1-05-setup-first-slice.md">lesson</a></summary>

<details><summary><b>Q:</b> What does <code>npm run build</code> do before bundling, in this project?</summary><b>A:</b> Runs <code>tsc -p .</code> to type-check; any error fails the build.</details>
<details><summary><b>Q:</b> Why <code>"type": "module"</code> in package.json?</summary><b>A:</b> So JS/TS config files are ES modules and can use <code>import</code>.</details>
<details><summary><b>Q:</b> Why <code>verbatimModuleSyntax</code>?</summary><b>A:</b> Forces <code>import type</code> for type-only imports so per-file compilation (Vite) never imports a non-existent runtime value.</details>
<details><summary><b>Q:</b> Where does <code>index.html</code> live in a Vite app?</summary><b>A:</b> The project root; it is the entry point.</details>
<details><summary><b>Q:</b> Why test with <code>preview</code> before deploying?</summary><b>A:</b> It serves the production build; some bugs exist only after bundling or without the dev server.</details>
<details><summary><b>Q:</b> How do you wrap an index backwards safely?</summary><b>A:</b> <code>(p + d + len) % len</code>, because JS <code>%</code> keeps the sign.</details>

</details>

<details><summary><b>L2.01 · From PDFs to 130 questions: the data pipeline</b> · 8 cards · <a href="l2-01-data-pipeline.md">lesson</a></summary>

<details><summary><b>Q:</b> What is the id of week 12, question 1?</summary><b>A:</b> 1201 (100·12 + 1).</details>
<details><summary><b>Q:</b> Why not sequential ids?</summary><b>A:</b> Inserting a question would shift later ids and corrupt saved progress and attempts.</details>
<details><summary><b>Q:</b> How do you escape a quote inside a SQL string?</summary><b>A:</b> Double it: <code>''</code>.</details>
<details><summary><b>Q:</b> Why <code>new URL(path, import.meta.url)</code> in a Node script?</summary><b>A:</b> Resolves relative to the script file, independent of the working directory.</details>
<details><summary><b>Q:</b> Why does the seed use <code>on conflict do update</code>?</summary><b>A:</b> Idempotent: you can re-run it after fixing data.</details>
<details><summary><b>Q:</b> Which part of a contradictory key did we trust, and how is it recorded?</summary><b>A:</b> The answer text; recorded as <code>answer: 3</code> plus a <code>note</code> on the question.</details>
<details><summary><b>Q:</b> What catches "edited JSON, forgot gen:sql"?</summary><b>A:</b> The unit test "supabase/seed.sql is in sync with questions.json".</details>
<details><summary><b>Q:</b> Why <code>BY_ID</code>?</summary><b>A:</b> O(1) lookup of questions by the ids the server sends.</details>

</details>

<details><summary><b>L2.02 · The database I: tables, constraints and row-level security</b> · 8 cards · <a href="l2-02-tables-and-rls.md">lesson</a></summary>

<details><summary><b>Q:</b> Why no policies on <code>questions</code>?</summary><b>A:</b> So no client can read or write the answer key; only definer functions use it.</details>
<details><summary><b>Q:</b> Why only a select policy on <code>test_attempts</code>?</summary><b>A:</b> Writes must go through <code>start_test</code>/<code>submit_test</code> so score and time are computed by the server.</details>
<details><summary><b>Q:</b> Why <code>drop policy if exists</code> before <code>create policy</code>?</summary><b>A:</b> Postgres has no <code>create or replace policy</code>; this makes the script re-runnable and updates the rule.</details>
<details><summary><b>Q:</b> What does the partial index cover?</summary><b>A:</b> Only submitted attempts, ordered by score desc, duration asc: the leaderboard's shape.</details>
<details><summary><b>Q:</b> How are names unique ignoring case?</summary><b>A:</b> A unique expression index on <code>lower(display_name)</code>.</details>
<details><summary><b>Q:</b> What happens to a user's rows when the user is deleted?</summary><b>A:</b> <code>on delete cascade</code> removes their profile, attempts and progress.</details>
<details><summary><b>Q:</b> RLS-denied delete: error or nothing?</summary><b>A:</b> Nothing: 0 rows affected, no error.</details>
<details><summary><b>Q:</b> Does <code>create table if not exists</code> add new columns?</summary><b>A:</b> No; use <code>alter table … add column if not exists</code>.</details>

</details>

<details><summary><b>L2.03 · The database II: server-side grading and the leaderboard</b> · 9 cards · <a href="l2-03-server-grading.md">lesson</a></summary>

<details><summary><b>Q:</b> Which two values does the client control in a ranked test?</summary><b>A:</b> The decision to start, and the array of chosen options.</details>
<details><summary><b>Q:</b> Why <code>set search_path = public</code>?</summary><b>A:</b> So a definer function can't be tricked into resolving names to attacker-created objects in another schema.</details>
<details><summary><b>Q:</b> Why <code>for update</code> in submit?</summary><b>A:</b> Locks the attempt row so concurrent submissions serialise; the second sees it already submitted.</details>
<details><summary><b>Q:</b> What does <code>array_length</code> return for an empty array?</summary><b>A:</b> NULL. Hence <code>coalesce(…, 0)</code>.</details>
<details><summary><b>Q:</b> How is a skipped answer encoded?</summary><b>A:</b> <code>-1</code>, which never equals a valid 0-based index.</details>
<details><summary><b>Q:</b> What does <code>distinct on (user_id)</code> keep?</summary><b>A:</b> The first row per user in the <code>order by</code>, here the best attempt (score desc, duration asc, earliest).</details>
<details><summary><b>Q:</b> Which functions can <code>anon</code> execute?</summary><b>A:</b> Only <code>get_leaderboard</code>.</details>
<details><summary><b>Q:</b> Why is the rank lookup limit 100,000?</summary><b>A:</b> A cap of 1,000 would make ranks beyond 1,000 come back NULL.</details>
<details><summary><b>Q:</b> Why <code>clock_timestamp()</code> for the duration?</summary><b>A:</b> It is the real current time; <code>now()</code> is frozen at transaction start.</details>

</details>

<details><summary><b>L2.04 · Entry point, config and the small libraries</b> · 9 cards · <a href="l2-04-entry-config-libs.md">lesson</a></summary>

<details><summary><b>Q:</b> How does the app avoid a theme flash?</summary><b>A:</b> A classic inline script in <code>&lt;head&gt;</code> sets <code>data-theme</code> from storage before the body paints.</details>
<details><summary><b>Q:</b> Why put fallback HTML inside <code>#root</code>?</summary><b>A:</b> Crawlers and slow connections see real content; React replaces it on mount.</details>
<details><summary><b>Q:</b> Why must <code>og:image</code> be absolute?</summary><b>A:</b> Link-preview scrapers don't resolve relative URLs.</details>
<details><summary><b>Q:</b> What does <code>manualChunks</code> buy?</summary><b>A:</b> Library code in separately hashed files, cached across deploys.</details>
<details><summary><b>Q:</b> Why is <code>resolved</code> computed, not stored?</summary><b>A:</b> Derived state can't go out of sync with <code>pref</code> and the OS setting.</details>
<details><summary><b>Q:</b> What does <code>detectSessionInUrl: false</code> skip?</summary><b>A:</b> Parsing magic-link tokens from the URL; we use OTP codes.</details>
<details><summary><b>Q:</b> Probability of any order under Fisher–Yates?</summary><b>A:</b> 1/n!.</details>
<details><summary><b>Q:</b> Which tsconfig flags make unused code fail the build?</summary><b>A:</b> <code>noUnusedLocals</code> and <code>noUnusedParameters</code>.</details>
<details><summary><b>Q:</b> What does PostgREST error <code>PGRST202</code> mean here?</summary><b>A:</b> The function doesn't exist, so <code>setup.sql</code> hasn't been run.</details>

</details>

<details><summary><b>L2.05 · The app shell: providers, routes, navigation, splash, error boundary</b> · 8 cards · <a href="l2-05-app-shell.md">lesson</a></summary>

<details><summary><b>Q:</b> What does <code>AnimatePresence</code> add that React lacks?</summary><b>A:</b> It keeps removed children mounted until their exit animation finishes.</details>
<details><summary><b>Q:</b> What does <code>mode="wait"</code> do?</summary><b>A:</b> Mounts the next keyed child only after the previous one finished exiting.</details>
<details><summary><b>Q:</b> How does the tab pill glide between tabs?</summary><b>A:</b> A shared <code>layoutId</code>; Motion animates the single element to its new position.</details>
<details><summary><b>Q:</b> Why did the page go blank on first run?</summary><b>A:</b> <code>useEffect(() => window.scrollTo(...))</code> returned a Promise; React called it as cleanup → <code>destroy is not a function</code>.</details>
<details><summary><b>Q:</b> Why must blocking UI never wait on an animation event?</summary><b>A:</b> Hidden tabs and headless browsers may never fire it; the UI would stay blocked.</details>
<details><summary><b>Q:</b> What does an error boundary not catch?</summary><b>A:</b> Errors in event handlers, async code, and the boundary itself.</details>
<details><summary><b>Q:</b> Why key the boundary by pathname?</summary><b>A:</b> Navigating remounts it, clearing the error state.</details>
<details><summary><b>Q:</b> Why is the TopBar's scroll listener passive?</summary><b>A:</b> It promises not to <code>preventDefault</code>, letting the browser scroll without waiting.</details>

</details>

<details><summary><b>L2.06a · The UI kit: sheets, switches, segmented control, rings, confetti</b> · 8 cards · <a href="l2-06a-ui-kit.md">lesson</a></summary>

<details><summary><b>Q:</b> Formula for the ring's dash offset?</summary><b>A:</b> offset = C·(1 − v), with C = 2πr and r = (size − stroke)/2.</details>
<details><summary><b>Q:</b> Why rotate the ring SVG −90°?</summary><b>A:</b> SVG strokes start at 3 o'clock; rotating starts the progress at 12.</details>
<details><summary><b>Q:</b> Ease-out cubic formula?</summary><b>A:</b> e(p) = 1 − (1 − p)³.</details>
<details><summary><b>Q:</b> When does the sheet close on drag end?</summary><b>A:</b> Offset > 110 px or downward velocity > 600 px/s.</details>
<details><summary><b>Q:</b> Why per-instance <code>layoutId</code> in Segmented?</summary><b>A:</b> Equal layoutIds are treated as one element; two controls would share and fling one pill.</details>
<details><summary><b>Q:</b> What role and attribute make a toggle accessible?</summary><b>A:</b> <code>role="switch"</code> with <code>aria-checked</code> on a real button.</details>
<details><summary><b>Q:</b> What does <code>&gt;&gt;&gt; 0</code> do in the hash?</summary><b>A:</b> Truncates to an unsigned 32-bit integer.</details>
<details><summary><b>Q:</b> Why does <code>useToast</code> return <code>as const</code>?</summary><b>A:</b> To type the result as a tuple, so destructuring gets precise types.</details>

</details>

<details><summary><b>L2.06b · The animated mug, the icon set and the Home page</b> · 8 cards · <a href="l2-06b-mug-icons-home.md">lesson</a></summary>

<details><summary><b>Q:</b> Two steps of the logo cut-out?</summary><b>A:</b> Flood-fill near-white from the edges to transparent; then keep only the largest connected foreground blob.</details>
<details><summary><b>Q:</b> Why redraw the mug as SVG?</summary><b>A:</b> The bitmap had baked-in steam and a white handle hole; SVG is animatable, themeable and crisp.</details>
<details><summary><b>Q:</b> What does <code>S</code> do in a path?</summary><b>A:</b> A smooth cubic curve whose first control point mirrors the previous curve's last.</details>
<details><summary><b>Q:</b> Why <code>useId</code> in CoffeeMug?</summary><b>A:</b> Unique gradient and clip ids per instance.</details>
<details><summary><b>Q:</b> What makes icons take the text colour?</summary><b>A:</b> <code>stroke="currentColor"</code>.</details>
<details><summary><b>Q:</b> What does <code>staggerChildren</code> do?</summary><b>A:</b> Delays each child's variant animation by a fixed step after the previous one.</details>
<details><summary><b>Q:</b> Why <code> </code> in empty stat lines?</summary><b>A:</b> Keeps tile heights equal before data arrives (no layout jump).</details>
<details><summary><b>Q:</b> What happens to steam under reduced motion?</summary><b>A:</b> Animations collapse to ~0 ms and steam is shown fully drawn and opaque.</details>

</details>

<details><summary><b>L2.07a · Auth state and email-code sign-in</b> · 8 cards · <a href="l2-07a-auth-sign-in.md">lesson</a></summary>

<details><summary><b>Q:</b> What does <code>ready</code> prevent?</summary><b>A:</b> A flash of the signed-out UI before the stored session and profile are loaded.</details>
<details><summary><b>Q:</b> Why <code>maybeSingle()</code> for the profile?</summary><b>A:</b> New users have no row; zero rows must be <code>null</code>, not an error.</details>
<details><summary><b>Q:</b> Why defer work in <code>onAuthStateChange</code>?</summary><b>A:</b> Awaiting Supabase calls inside the callback can deadlock on its internal lock.</details>
<details><summary><b>Q:</b> What was the "nobody can sign in" root cause?</summary><b>A:</b> The app truncated codes to 6 digits; the project sends 8.</details>
<details><summary><b>Q:</b> Which OTP lengths does the app accept now?</summary><b>A:</b> 6–10; auto-submits at <code>VITE_OTP_LENGTH</code> (default 8).</details>
<details><summary><b>Q:</b> What does <code>autoComplete="one-time-code"</code> give users?</summary><b>A:</b> One-tap fill of the code from Mail/Messages above the keyboard.</details>
<details><summary><b>Q:</b> Why <code>noValidate</code> on the email form?</summary><b>A:</b> So the app's own message shows consistently instead of each browser's native popup.</details>
<details><summary><b>Q:</b> What does <code>?next=/test</code> do?</summary><b>A:</b> After session + profile exist, Account navigates there with <code>replace: true</code>.</details>

</details>

<details><summary><b>L2.07c · Google sign-in, line by line (session 2)</b> · 13 cards · <a href="l2-07c-google-sign-in.md">lesson</a></summary>
<details><summary><b>Q:</b> What finally caused the 504 on sign-up?</summary><b>A:</b> Custom SMTP pointed at the website (<code>psychology-of-learning-nptel.vercel.app:465</code>), which has no mail server, so sending the code email hung until the gateway timed out.</details>
<details><summary><b>Q:</b> In "Sign in with Google" through Supabase, who receives Google's authorisation code?</summary><b>A:</b> Supabase (at <code>/auth/v1/callback</code>). The app only ever receives Supabase's own code.</details>
<details><summary><b>Q:</b> What does <code>detectSessionInUrl: true</code> do?</summary><b>A:</b> On start-up, supabase-js exchanges a <code>?code=</code> in the URL for a session and removes it from the address bar.</details>
<details><summary><b>Q:</b> What does the PKCE verifier prove?</summary><b>A:</b> That whoever exchanges the code is the same browser that started the sign-in; only that tab has the verifier.</details>
<details><summary><b>Q:</b> Which URL is the Google client's authorised redirect URI?</summary><b>A:</b> <code>https://kehcsupmruaskpgdvzaj.supabase.co/auth/v1/callback</code>.</details>
<details><summary><b>Q:</b> What happens when <code>redirect_to</code> isn't in Supabase's allow-list?</summary><b>A:</b> Sign-in works, but the user lands on the Site URL instead.</details>
<details><summary><b>Q:</b> Why can't you authorise <code>vercel.app</code> in Google Cloud?</summary><b>A:</b> It's a public suffix; only a top private domain (suffix + one label) like <code>psychology-of-learning-nptel.vercel.app</code> can be authorised.</details>
<details><summary><b>Q:</b> Why is <code>?next</code> passed through <code>encodeURIComponent</code>?</summary><b>A:</b> It's a URL inside another URL's query; encoding keeps characters like <code>/</code>, <code>&amp;</code>, <code>#</code> from breaking the outer URL.</details>
<details><summary><b>Q:</b> Why does the error cleanup use <code>replace: true</code>?</summary><b>A:</b> So Back doesn't return to the error URL and show the message again.</details>
<details><summary><b>Q:</b> Why a fixed error message, not <code>error_description</code>?</summary><b>A:</b> URL text is attacker-controlled; displaying it would let anyone put words on your page.</details>
<details><summary><b>Q:</b> Where does the Google client secret live?</summary><b>A:</b> Only in the Supabase dashboard (Providers → Google). Never in the repo or a <code>VITE_</code> variable.</details>
<details><summary><b>Q:</b> How do you turn email sign-in off where it's enforced?</summary><b>A:</b> Supabase → Sign In / Providers → Email off; the API then answers <code>422 email_provider_disabled</code>.</details>
<details><summary><b>Q:</b> What's the first diagnostic for "Access blocked" on one account?</summary><b>A:</b> Check whether others can sign in (users table, your own curl of the chain), then get Google's "error details" for that account.</details>

</details>

<details><summary><b>L2.07b · Leaderboard names, the account page and progress sync</b> · 8 cards · <a href="l2-07b-account-progress.md">lesson</a></summary>

<details><summary><b>Q:</b> What does "local-first" mean for marks?</summary><b>A:</b> State and localStorage are the primary copy; the cloud is merged in on sign-in and updated in the background.</details>
<details><summary><b>Q:</b> Merge rule per card?</summary><b>A:</b> Keep whichever copy has the newer timestamp; add missing ones.</details>
<details><summary><b>Q:</b> Which local entries are pushed after the merge?</summary><b>A:</b> Those the cloud lacks or has with an older timestamp.</details>
<details><summary><b>Q:</b> Why <code>.then(() => {})</code> after the upsert?</summary><b>A:</b> Supabase builders are lazy; nothing is sent until awaited or then-ed.</details>
<details><summary><b>Q:</b> Why did sign-out blank the app?</summary><b>A:</b> The exiting <code>&lt;Me/&gt;</code> re-rendered with <code>profile = null</code> and dereferenced it via <code>profile!</code>; the render error unmounted the root.</details>
<details><summary><b>Q:</b> Three layers of the sign-out fix?</summary><b>A:</b> A guard in Me after hooks; signOut clears session and profile together; an app-wide ErrorBoundary.</details>
<details><summary><b>Q:</b> Known limitation of the sync?</summary><b>A:</b> Resets don't propagate to other devices' local copies (no tombstones).</details>
<details><summary><b>Q:</b> Why <code>minWidth: 0</code> on the email column?</summary><b>A:</b> Flex items default to min-width auto; 0 lets them shrink so the ellipsis works.</details>

</details>

<details><summary><b>L2.08a · Flashcards I: the deck, the swipe card and the flip</b> · 9 cards · <a href="l2-08a-flashcard-deck.md">lesson</a></summary>

<details><summary><b>Q:</b> Why is the deck a snapshot?</summary><b>A:</b> So marking a card (with "hide mastered" on) can't remove it or shift indexes mid-session.</details>
<details><summary><b>Q:</b> Swipe decision rule?</summary><b>A:</b> |offset.x| > 110 px or |velocity.x| > 650 px/s, in that direction; otherwise spring back.</details>
<details><summary><b>Q:</b> How does the exiting card know which way to fly?</summary><b>A:</b> <code>AnimatePresence custom={dir}</code> feeds the exit variant function.</details>
<details><summary><b>Q:</b> Why angle-driven face opacity?</summary><b>A:</b> WebKit showed the back face mirrored through the front; <code>backface-visibility</code> wasn't reliable in this layout.</details>
<details><summary><b>Q:</b> Fix for "swipe goes back a page"?</summary><b>A:</b> <code>html { overscroll-behavior-x: none }</code>.</details>
<details><summary><b>Q:</b> Fix for "touch swipe ignored over the options"?</summary><b>A:</b> <code>touch-action: pan-y</code> (+ <code>overscroll-behavior: contain</code>) on <code>.fc-scroll</code>.</details>
<details><summary><b>Q:</b> Why does tapping flip but dragging not?</summary><b>A:</b> Motion's <code>onTap</code> is cancelled once the pointer moves past a small threshold.</details>
<details><summary><b>Q:</b> What does undo do to the mark?</summary><b>A:</b> Nothing; it moves back one card. The next decision overwrites the mark.</details>
<details><summary><b>Q:</b> Why preventDefault on Backspace?</summary><b>A:</b> Safari otherwise navigates back.</details>

</details>

<details><summary><b>L2.08b · Flashcards II: the Study page, deck finished, quiz mode and the searchable list</b> · 7 cards · <a href="l2-08b-quiz-and-list.md">lesson</a></summary>

<details><summary><b>Q:</b> Why is the week in the URL but the mode in storage?</summary><b>A:</b> The week is shareable navigation state (deep links); the mode is a personal preference.</details>
<details><summary><b>Q:</b> What caused the quiz's first question to swap?</summary><b>A:</b> An effect meant for pool changes also ran on mount and reshuffled.</details>
<details><summary><b>Q:</b> How do you run an effect only on changes, not on mount?</summary><b>A:</b> Keep the previous value in a ref and skip when it's unchanged.</details>
<details><summary><b>Q:</b> What does a wrong quiz answer do besides scoring?</summary><b>A:</b> Adds the card to <code>missed</code> and marks it "again" for flashcard review.</details>
<details><summary><b>Q:</b> Why highlight with slicing instead of innerHTML?</summary><b>A:</b> React escapes text, so user input can't inject HTML (no XSS).</details>
<details><summary><b>Q:</b> What does <code>display: contents</code> do?</summary><b>A:</b> Removes the wrapper's box so its children lay out as children of the parent.</details>
<details><summary><b>Q:</b> Why does the Study child remount on week change?</summary><b>A:</b> <code>key={mode + week}</code> gives each week a fresh deck/quiz.</details>

</details>

<details><summary><b>L2.09a · The ranked test I: intro, attempt storage and starting a test</b> · 6 cards · <a href="l2-09a-test-intro.md">lesson</a></summary>

<details><summary><b>Q:</b> Which start time ranks you?</summary><b>A:</b> <code>started_at</code> from Postgres <code>now()</code>; <code>client_started</code> only drives the on-screen timer.</details>
<details><summary><b>Q:</b> Why store the attempt in localStorage immediately?</summary><b>A:</b> So reloads, background kills or accidental exits don't lose answers.</details>
<details><summary><b>Q:</b> Why mirror the 3 h expiry on the client?</summary><b>A:</b> To avoid offering "Resume" for an attempt the server would reject on submit.</details>
<details><summary><b>Q:</b> What does <code>path="run"</code> mean under <code>/test/*</code>?</summary><b>A:</b> <code>/test/run</code>; nested route paths are relative.</details>
<details><summary><b>Q:</b> Order of the intro's checks?</summary><b>A:</b> Configured → auth ready → session → profile → pending attempt → start.</details>
<details><summary><b>Q:</b> What does Result carry besides the server's fields?</summary><b>A:</b> The attempt's question_ids and answers, for the review list.</details>

</details>

<details><summary><b>L2.09b · The ranked test II: the runner</b> · 7 cards · <a href="l2-09b-test-runner.md">lesson</a></summary>

<details><summary><b>Q:</b> How is the attempt kept safe across reloads?</summary><b>A:</b> All changes go through <code>setA</code>; one effect mirrors <code>a</code> to localStorage; mount reads it back.</details>
<details><summary><b>Q:</b> Why does auto-advance check <code>cur.pos === p</code>?</summary><b>A:</b> To avoid advancing if the user already moved during the 320 ms.</details>
<details><summary><b>Q:</b> How do you un-answer a question?</summary><b>A:</b> Tap the selected option again.</details>
<details><summary><b>Q:</b> What does the leave sheet warn about?</summary><b>A:</b> Answers are saved but the (server) clock keeps running.</details>
<details><summary><b>Q:</b> What happens on submit success?</summary><b>A:</b> Save the result (+ order + answers), delete the attempt, and navigate to results with replace.</details>
<details><summary><b>Q:</b> Why no right/wrong colours during the test?</summary><b>A:</b> Exam realism, and the client doesn't have the key.</details>
<details><summary><b>Q:</b> Swipe threshold between questions?</summary><b>A:</b> ±70 px offset (the card barely moves: elastic 0.25).</details>

</details>

<details><summary><b>L2.09c · The ranked test III: results and the leaderboard</b> · 7 cards · <a href="l2-09c-results-leaderboard.md">lesson</a></summary>

<details><summary><b>Q:</b> How is the mistakes list built?</summary><b>A:</b> Zip question_ids, your answers and correct answers by position; keep where yours ≠ correct (skipped included).</details>
<details><summary><b>Q:</b> Thresholds for burst and mascot?</summary><b>A:</b> Burst ≥ 80%; mascot ≥ 60%.</details>
<details><summary><b>Q:</b> Podium column order?</summary><b>A:</b> top[1] · top[0] · top[2] (second, first, third).</details>
<details><summary><b>Q:</b> Why style the podium by rank?</summary><b>A:</b> Honest ties: equal ranks get equal medals and heights.</details>
<details><summary><b>Q:</b> How does the board stay fresh?</summary><b>A:</b> Refetch on <code>visibilitychange</code> to visible, plus a refresh button.</details>
<details><summary><b>Q:</b> Why cap the list's stagger delay?</summary><b>A:</b> So long boards don't take seconds to finish animating in.</details>
<details><summary><b>Q:</b> Loading vs empty states?</summary><b>A:</b> <code>rows === null</code> → loader; <code>[]</code> → "No scores yet".</details>

</details>

<details><summary><b>L2.10a · Styling I: tokens, themes, base and the shell</b> · 12 cards · <a href="l2-10a-tokens-base-shell.md">lesson</a></summary>

<details><summary><b>Q:</b> What three selectors implement System / Light / Dark?</summary><b>A:</b> <code>:root</code> (light); <code>@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }</code>; <code>:root[data-theme="dark"]</code>.</details>
<details><summary><b>Q:</b> Why does the dark block appear twice?</summary><b>A:</b> CSS can't OR a media query with an attribute selector, so the same declarations go under both.</details>
<details><summary><b>Q:</b> What does <code>color-scheme</code> change?</summary><b>A:</b> The browser's built-in colours: scrollbars, form controls, default background.</details>
<details><summary><b>Q:</b> Why <code>color-mix(in srgb, var(--bg) 82%, transparent)</code> and not <code>rgba(var(--bg), .82)</code>?</summary><b>A:</b> <code>--bg</code> is a hex string; <code>rgba()</code> needs separate channels. <code>color-mix</code> accepts any colour.</details>
<details><summary><b>Q:</b> <code>overflow-x: clip</code> vs <code>hidden</code>?</summary><b>A:</b> Both hide overflow; only <code>hidden</code> makes a scroll container, which breaks <code>position: sticky</code> inside and can still be scrolled by code or touch.</details>
<details><summary><b>Q:</b> Why write <code>overflow-x</code> twice in one rule?</summary><b>A:</b> Fallback: browsers that don't know <code>clip</code> drop that line and keep <code>hidden</code>.</details>
<details><summary><b>Q:</b> What does <code>viewport-fit=cover</code> require from the CSS?</summary><b>A:</b> Padding with <code>env(safe-area-inset-*)</code> so content clears the notch and home indicator.</details>
<details><summary><b>Q:</b> <code>100vh</code> vs <code>100dvh</code> on a phone?</summary><b>A:</b> <code>vh</code> assumes the address bar is hidden (too tall while it shows); <code>dvh</code> follows the visible height.</details>
<details><summary><b>Q:</b> Shell bottom padding formula?</summary><b>A:</b> <code>--tab-h</code> + 28 px + <code>env(safe-area-inset-bottom)</code>.</details>
<details><summary><b>Q:</b> Why four red tokens?</summary><b>A:</b> Brand red is 4.40:1 on cream (fails small text). Separate tokens for text (<code>--red-ink</code>), button fill (<code>--red-fill</code>) and tint (<code>--red-soft</code>).</details>
<details><summary><b>Q:</b> Why does the brand link need <code>min-width: 0</code>?</summary><b>A:</b> Flex items won't shrink below their content by default; on 280 px screens the header would overflow.</details>
<details><summary><b>Q:</b> What does <code>.tnum</code> fix?</summary><b>A:</b> Digits of different widths make timers and scores jiggle; tabular numerals are equal width.</details>

</details>

<details><summary><b>L2.10b · Styling II: every component</b> · 12 cards · <a href="l2-10b-component-styles.md">lesson</a></summary>

<details><summary><b>Q:</b> Name five of the ten patterns.</summary><b>A:</b> Surface; centred box; fill layer; row; stack; sticky frosted header; adaptive grid; truncate; state class swaps tokens; fixed + centred.</details>
<details><summary><b>Q:</b> Why do <code>.sheet</code> and <code>.toast</code> get their −50% from Motion, not CSS?</summary><b>A:</b> Motion writes the whole inline <code>transform</code>; a CSS transform would be overwritten as soon as it animates.</details>
<details><summary><b>Q:</b> Why <code>minmax(0, 1fr)</code> instead of <code>1fr</code>?</summary><b>A:</b> <code>1fr</code> = <code>minmax(auto, 1fr)</code>, which won't shrink below content; on tiny screens the grid overflows.</details>
<details><summary><b>Q:</b> What does <code>isolation: isolate</code> do on the hero?</summary><b>A:</b> Creates a stacking context so <code>z-index: -1</code> pseudo-elements sit above the hero's background, not behind it.</details>
<details><summary><b>Q:</b> Why must the deck have an explicit height?</summary><b>A:</b> All cards are absolutely positioned, so they give the deck no height.</details>
<details><summary><b>Q:</b> Where must <code>perspective</code> go?</summary><b>A:</b> On an ancestor of the element that rotates (the deck).</details>
<details><summary><b>Q:</b> What does <code>touch-action: pan-y</code> on the scroll area fix?</summary><b>A:</b> Scroll containers claim all touch gestures; <code>pan-y</code> leaves horizontal drags for the swipe.</details>
<details><summary><b>Q:</b> Why does <code>.otp</code> add <code>0.32em</code> to its left padding?</summary><b>A:</b> Letter-spacing adds space after the last digit too, shifting centred text left; the padding re-centres it.</details>
<details><summary><b>Q:</b> Formula for the number of <code>auto-fill</code> columns?</summary><b>A:</b> n = ⌊(W + g) / (m + g)⌋.</details>
<details><summary><b>Q:</b> Why 0.001 ms and not <code>animation: none</code> under reduced motion?</summary><b>A:</b> End events still fire, so code waiting for <code>animationend</code>/<code>transitionend</code> doesn't hang.</details>
<details><summary><b>Q:</b> Why is the podium's middle column <code>1.12fr</code> with <code>align-items: end</code>?</summary><b>A:</b> A wider winner column, and different block heights standing on one floor.</details>
<details><summary><b>Q:</b> When is <code>outline: none</code> acceptable?</summary><b>A:</b> Only with a visible replacement focus style right next to it (here <code>.input:focus</code>).</details>

</details>

<details><summary><b>L2.10c · Styling III: the responsive layer (+ Level 2 checkpoint)</b> · 11 cards · <a href="l2-10c-responsive.md">lesson</a></summary>

<details><summary><b>Q:</b> Do media queries add specificity?</summary><b>A:</b> No. With equal selectors, the later rule in the file wins, so more specific situations go later.</details>
<details><summary><b>Q:</b> Where does the 440 in <code>100dvh − 440px</code> come from?</summary><b>A:</b> The measured height of everything above the deck (232) plus everything below it to the screen edge (208) on the base layout.</details>
<details><summary><b>Q:</b> Why did the 340 px <code>clamp</code> minimum cause the tab-bar bug?</summary><b>A:</b> Any viewport shorter than 340 + 440 = 780 px gets a deck taller than the space left, pushing the buttons under the bar.</details>
<details><summary><b>Q:</b> Which media feature limits hover effects to mice?</summary><b>A:</b> <code>(hover: hover) and (pointer: fine)</code>.</details>
<details><summary><b>Q:</b> How does the tab bar become a rail?</summary><b>A:</b> Fixed left/top/bottom 0, <code>transform: none</code>, rail width, flex column, no radius, shadow or blur, right border; tabs become rows; labels swap; foot pushed down with <code>margin-top: auto</code>.</details>
<details><summary><b>Q:</b> Why <code>font-size: 0</code> for landscape tab labels instead of <code>display: none</code>?</summary><b>A:</b> The text stays in the accessibility tree, so links keep their names.</details>
<details><summary><b>Q:</b> What does <code>@supports not (height: 100dvh)</code> protect?</summary><b>A:</b> Old Safari drops any declaration containing <code>dvh</code>; without the fallback the deck has no height.</details>
<details><summary><b>Q:</b> Why stack the hero on 1024–1179 px laptops?</summary><b>A:</b> As one of two grid columns it's only ~600 px wide and the heading runs under the absolutely positioned mug.</details>
<details><summary><b>Q:</b> How should text-vs-art overlap be measured?</summary><b>A:</b> Text extents (DOM Range rects) against the visible art, not element boxes.</details>
<details><summary><b>Q:</b> Why does <code>.home-top .hero</code> need <code>!important</code>?</summary><b>A:</b> To beat an inline <code>style</code> margin set in <code>Home.tsx</code>.</details>
<details><summary><b>Q:</b> What is <code>.shell.no-rail</code> for?</summary><b>A:</b> During a running test the rail isn't rendered, so the shell drops its left margin.</details>

</details>

<details><summary><b>L3.01 · Under the hood: the security model</b> · 12 cards · <a href="l3-01-security-model.md">lesson</a></summary>

<details><summary><b>Q:</b> Where do the role and user id of an API request come from?</summary><b>A:</b> The signed JWT. PostgREST verifies it, sets the role, and stores the claims; <code>auth.uid()</code> reads <code>sub</code>.</details>
<details><summary><b>Q:</b> RLS on, no policy for <code>select</code>: what does a select return?</summary><b>A:</b> An empty result, no error (default deny).</details>
<details><summary><b>Q:</b> What does a blocked <code>update</code> return?</summary><b>A:</b> Success on zero rows (<code>data: []</code>, no error).</details>
<details><summary><b>Q:</b> <code>USING</code> vs <code>WITH CHECK</code>?</summary><b>A:</b> <code>USING</code> picks which existing rows are visible/targetable; <code>WITH CHECK</code> validates the new row on insert/update.</details>
<details><summary><b>Q:</b> Why can a definer function read the answer key?</summary><b>A:</b> It runs as the owner of the tables, and owners aren't subject to RLS.</details>
<details><summary><b>Q:</b> What must every definer function do itself?</summary><b>A:</b> Check identity (<code>auth.uid()</code>), return only safe columns, pin <code>search_path</code>, and be granted only to the right roles.</details>
<details><summary><b>Q:</b> Why <code>revoke … from public</code>?</summary><b>A:</b> Postgres grants <code>EXECUTE</code> on new functions to <code>PUBLIC</code> by default.</details>
<details><summary><b>Q:</b> Error code for "permission denied" / RLS insert violation?</summary><b>A:</b> 42501. Check constraint 23514, unique 23505.</details>
<details><summary><b>Q:</b> How do you find tables with RLS off?</summary><b>A:</b> <code>pg_class</code> where <code>relkind = 'r'</code>, schema <code>public</code>, <code>not relrowsecurity</code>; or Supabase's Security Advisor.</details>
<details><summary><b>Q:</b> What does <code>set search_path = public</code> not prevent?</summary><b>A:</b> Temp-table shadowing: <code>pg_temp</code> is still searched first unless listed last.</details>
<details><summary><b>Q:</b> P(guess an 8-digit code in k tries)?</summary><b>A:</b> k / 10⁸.</details>
<details><summary><b>Q:</b> What doesn't the server guarantee about a score?</summary><b>A:</b> That a human chose the answers unaided. The key is public study material, so a script can submit a perfect paper instantly.</details>

</details>

<details><summary><b>L3.02 · Under the hood: ranking maths and SQL internals</b> · 12 cards · <a href="l3-02-ranking-sql.md">lesson</a></summary>

<details><summary><b>Q:</b> What does <code>distinct on (k)</code> keep?</summary><b>A:</b> The first row of each group of equal <code>k</code>, in the query's <code>order by</code>, which must start with <code>k</code>.</details>
<details><summary><b>Q:</b> rank vs dense_rank vs row_number on 1st, 1st, next?</summary><b>A:</b> 1, 1, 3 · 1, 1, 2 · 1, 2, 3.</details>
<details><summary><b>Q:</b> Formula for <code>rank()</code>?</summary><b>A:</b> 1 + the number of rows strictly better.</details>
<details><summary><b>Q:</b> Why <code>order by i</code> inside <code>array_agg</code>?</summary><b>A:</b> Joins don't guarantee order; the correct-answer array must follow the test's question order.</details>
<details><summary><b>Q:</b> What does <code>for update</code> do in <code>submit_test</code>?</summary><b>A:</b> Locks the attempt row so a concurrent second submit waits, then sees it already submitted.</details>
<details><summary><b>Q:</b> P(a question is in a 100-of-130 test)?</summary><b>A:</b> 100/130 ≈ 0.77.</details>
<details><summary><b>Q:</b> Expected overlap of two tests?</summary><b>A:</b> 100²/130 ≈ 77 questions.</details>
<details><summary><b>Q:</b> Tests needed to see all 130 with > 90% chance?</summary><b>A:</b> 5 (P ≈ 0.918).</details>
<details><summary><b>Q:</b> Expected score from pure guessing?</summary><b>A:</b> ≈ 27 ± 4.4 (120 four-option and 10 two-option questions).</details>
<details><summary><b>Q:</b> Why is <code>get_my_stats</code> ~3–4× the leaderboard's cost?</summary><b>A:</b> It calls <code>get_leaderboard</code> four times; a single CTE fixes it.</details>
<details><summary><b>Q:</b> Complexity of the leaderboard?</summary><b>A:</b> O(Nₐ log Nₐ) for the per-user sort, plus O(U log U) for ranking.</details>
<details><summary><b>Q:</b> Danger of an inner join from positions to <code>questions</code>?</summary><b>A:</b> A missing question drops a position, shifting the correct-answer array.</details>

</details>

<details><summary><b>L3.03 · Under the hood: gestures, springs, 3D and scrolling</b> · 12 cards · <a href="l3-03-gestures-3d.md">lesson</a></summary>

<details><summary><b>Q:</b> When does Motion actually start a drag?</summary><b>A:</b> On the next animation frame after the pointer has moved ≥ 3 px.</details>
<details><summary><b>Q:</b> Why can a synthetic swipe do nothing?</summary><b>A:</b> If all moves and the pointerup land before a frame, the drag never starts and <code>onDragEnd</code> isn't called.</details>
<details><summary><b>Q:</b> How does Motion estimate release velocity?</summary><b>A:</b> Displacement over roughly the last 100 ms of pointer samples.</details>
<details><summary><b>Q:</b> Damping ratio formula?</summary><b>A:</b> ζ = c / (2√(k m)); Motion's mass defaults to 1.</details>
<details><summary><b>Q:</b> Overshoot formula?</summary><b>A:</b> exp(−ζπ / √(1 − ζ²)).</details>
<details><summary><b>Q:</b> The flip spring's ζ and overshoot?</summary><b>A:</b> 0.806 and 1.4% (≈ 2.5°).</details>
<details><summary><b>Q:</b> Below what damping would the flip flicker (k = 260)?</summary><b>A:</b> About 7 (ζ ≈ 0.2155, 50% overshoot).</details>
<details><summary><b>Q:</b> Perspective scale formula?</summary><b>A:</b> s = p / (p − z).</details>
<details><summary><b>Q:</b> Why <code>custom</code> on <code>AnimatePresence</code>?</summary><b>A:</b> Exiting children keep stale props; <code>custom</code> passes the current value to their exit variants.</details>
<details><summary><b>Q:</b> Which overflow values create a scroll container?</summary><b>A:</b> <code>auto</code>, <code>scroll</code> and <code>hidden</code> (not <code>clip</code> or <code>visible</code>).</details>
<details><summary><b>Q:</b> <code>overscroll-behavior: contain</code> vs <code>none</code>?</summary><b>A:</b> Both stop chaining; <code>contain</code> keeps the element's own bounce, <code>none</code> removes all boundary effects.</details>
<details><summary><b>Q:</b> What does a passive listener promise?</summary><b>A:</b> It won't call <code>preventDefault()</code>, so the browser can scroll without waiting for JavaScript.</details>

</details>

<details><summary><b>L3.04 · Under the hood: viewports, contrast maths and accessibility</b> · 12 cards · <a href="l3-04-viewports-contrast.md">lesson</a></summary>

<details><summary><b>Q:</b> <code>vh</code>, <code>svh</code>, <code>lvh</code>, <code>dvh</code>?</summary><b>A:</b> vh = lvh (bars retracted); svh = bars expanded; dvh = current, updating as bars slide.</details>
<details><summary><b>Q:</b> Does the iOS keyboard change <code>dvh</code>?</summary><b>A:</b> No; it shrinks the visual viewport only.</details>
<details><summary><b>Q:</b> Relative luminance weights?</summary><b>A:</b> 0.2126 R + 0.7152 G + 0.0722 B, on linearised channels.</details>
<details><summary><b>Q:</b> Contrast ratio formula?</summary><b>A:</b> (L_light + 0.05) / (L_dark + 0.05).</details>
<details><summary><b>Q:</b> AA thresholds?</summary><b>A:</b> 4.5:1 normal text; 3:1 large text (≥ 24 px, or ≥ 18.66 px bold) and UI components.</details>
<details><summary><b>Q:</b> Painted colour of a translucent layer?</summary><b>A:</b> α·top + (1 − α)·behind, per channel.</details>
<details><summary><b>Q:</b> Why did the tab labels fail only on some devices?</summary><b>A:</b> The 86% bar was over the dark hero there; the composite background dropped the ratio to 4.26.</details>
<details><summary><b>Q:</b> Why not soften text with <code>opacity</code>?</summary><b>A:</b> The painted colour differs from the token, so token checks lie; use a passing colour token.</details>
<details><summary><b>Q:</b> What does <code>scrollable-region-focusable</code> require?</summary><b>A:</b> A scrolling region must be keyboard-reachable (focusable itself or containing focusable content).</details>
<details><summary><b>Q:</b> Why toggle <code>tabIndex</code> between the two faces?</summary><b>A:</b> So Tab reaches the visible face's scroll area and never the hidden one.</details>
<details><summary><b>Q:</b> Two things axe can't judge?</summary><b>A:</b> Whether names are meaningful; whether focus is visible; logical order; contrast over images.</details>
<details><summary><b>Q:</b> Why wait before an axe scan?</summary><b>A:</b> Mid-fade elements are partly transparent, so measured colours are wrong.</details>

</details>

<details><summary><b>L3.05 · Under the hood: performance and Lighthouse (+ Level 3 checkpoint)</b> · 12 cards · <a href="l3-05-performance.md">lesson</a></summary>

<details><summary><b>Q:</b> What blocks first paint in this app?</summary><b>A:</b> The CSS (and, before the fix, the third-party font stylesheet). Module scripts are deferred.</details>
<details><summary><b>Q:</b> Why does LCP wait for JavaScript here?</summary><b>A:</b> It's client-rendered: the hero heading doesn't exist until React runs.</details>
<details><summary><b>Q:</b> Lighthouse 12 weights?</summary><b>A:</b> TBT 30, LCP 25, CLS 25, FCP 10, Speed Index 10.</details>
<details><summary><b>Q:</b> Mobile throttling settings?</summary><b>A:</b> 150 ms RTT, ≈ 1.6 Mbps, 4× CPU slowdown (simulated).</details>
<details><summary><b>Q:</b> Transfer-time model?</summary><b>A:</b> t ≈ n·RTT + 8B / W.</details>
<details><summary><b>Q:</b> Layout shift formula?</summary><b>A:</b> impact fraction × distance fraction; CLS is the worst burst.</details>
<details><summary><b>Q:</b> Why can hashed assets be <code>immutable</code>?</summary><b>A:</b> New content means a new file name, so a cached copy is never stale.</details>
<details><summary><b>Q:</b> What does <code>unicode-range</code> do for fonts?</summary><b>A:</b> The browser downloads only the subsets whose characters appear on the page (here, only latin).</details>
<details><summary><b>Q:</b> Why did self-hosting the font help so much?</summary><b>A:</b> It removed a render-blocking request to a third-party origin (DNS + TLS + CSS + font on extra origins).</details>
<details><summary><b>Q:</b> Why give images <code>width</code> and <code>height</code>?</summary><b>A:</b> The browser reserves their box, so nothing shifts when they load.</details>
<details><summary><b>Q:</b> Is an image in a <code>display: none</code> parent downloaded?</summary><b>A:</b> Yes, unless it has <code>loading="lazy"</code>.</details>
<details><summary><b>Q:</b> Why does best practices show 96 locally but 100 in production?</summary><b>A:</b> Locally <code>/_vercel/insights/script.js</code> is a 404; Vercel serves it in production.</details>

</details>

<details><summary><b>L3.06 · Under the hood: OAuth, PKCE, and why sign-up timed out (session 2)</b> · 14 cards · <a href="l3-06-oauth-pkce-504.md">lesson</a></summary>
<details><summary><b>Q:</b> Who writes a 504, and about whom?</summary><b>A:</b> A gateway or proxy, about its upstream, which accepted the request but didn't answer in time.</details>
<details><summary><b>Q:</b> 502 vs 504?</summary><b>A:</b> 502: the upstream answered badly or the connection broke. 504: the upstream didn't answer in time.</details>
<details><summary><b>Q:</b> Why did SMTP to the website time out rather than fail fast?</summary><b>A:</b> Vercel's edge drops packets to non-web ports; no reset comes back, so the client waits until its timeout.</details>
<details><summary><b>Q:</b> Ports for email submission and their TLS modes?</summary><b>A:</b> 465 implicit TLS; 587 STARTTLS. (25 is server-to-server relay.)</details>
<details><summary><b>Q:</b> Why can't you send as <code>noreply@…vercel.app</code>?</summary><b>A:</b> You don't control <code>vercel.app</code>'s DNS, so you can't publish SPF/DKIM/DMARC for it; receivers reject or junk it.</details>
<details><summary><b>Q:</b> The PKCE S256 formula?</summary><b>A:</b> challenge = BASE64URL(SHA256(ASCII(verifier))).</details>
<details><summary><b>Q:</b> Why is an S256 challenge 43 characters?</summary><b>A:</b> 256 bits ÷ 6 bits per base64 character = 42.67 → 43 (44 with one <code>=</code>, which base64url drops).</details>
<details><summary><b>Q:</b> Entropy of supabase-js's verifier?</summary><b>A:</b> 56 random bytes (low byte of each Uint32) = 448 bits, written as 112 hex characters.</details>
<details><summary><b>Q:</b> What attack does PKCE stop?</summary><b>A:</b> Authorisation code interception: a stolen code can't be exchanged without the verifier.</details>
<details><summary><b>Q:</b> What does <code>state</code> stop?</summary><b>A:</b> Forged callbacks (login CSRF): completing a sign-in your browser never started.</details>
<details><summary><b>Q:</b> Public vs confidential client?</summary><b>A:</b> A public client (browser app) can't keep a secret; a confidential client (a server like Supabase Auth) can.</details>
<details><summary><b>Q:</b> What is a top private domain?</summary><b>A:</b> A public suffix plus one label, e.g. <code>psychology-of-learning-nptel.vercel.app</code>.</details>
<details><summary><b>Q:</b> Flow started in Chrome, finished in another browser: result?</summary><b>A:</b> No verifier there → exchange fails → signed out, though Supabase may already have created the user.</details>
<details><summary><b>Q:</b> Why does Google refuse sign-in inside WhatsApp's browser?</summary><b>A:</b> Embedded webviews are blocked by Google's OAuth policy (<code>disallowed_useragent</code>), because the host app could read input.</details>

</details>

<details><summary><b>L4.01 · Test it I: testing strategy and the data-integrity tests</b> · 10 cards · <a href="l4-01-testing-strategy-data.md">lesson</a></summary>

<details><summary><b>Q:</b> What does each test layer prove?</summary><b>A:</b> Data: content correct and consistent. DB: RLS, grants, grading, ranking. Browser: what users see and do, on 11 devices, plus live security and accessibility.</details>
<details><summary><b>Q:</b> Why a pyramid shape?</summary><b>A:</b> Many fast, precise tests at the bottom; few slow, broad ones at the top. Lower failures point straight at the cause.</details>
<details><summary><b>Q:</b> What is a mutation check?</summary><b>A:</b> Deliberately break the code or data, confirm the tests fail, then restore.</details>
<details><summary><b>Q:</b> How do you tell "not installed" from "exited non-zero" in <code>execFileSync</code>?</summary><b>A:</b> <code>e.code === "ENOENT"</code> vs a numeric <code>e.status</code>.</details>
<details><summary><b>Q:</b> What does <code>pdftotext -v</code> exit with?</summary><b>A:</b> 99, even though it's installed.</details>
<details><summary><b>Q:</b> Why <code>new URL("../../", import.meta.url)</code>?</summary><b>A:</b> Paths relative to the test file, independent of the current directory.</details>
<details><summary><b>Q:</b> What does <code>(?:[^']|'')*</code> match?</summary><b>A:</b> A SQL string body: non-quotes or doubled quotes.</details>
<details><summary><b>Q:</b> Why compare answers with <code>startsWith</code> both ways?</summary><b>A:</b> PDF lines can carry extra text (a page header) or be cut short; one must be a prefix of the other.</details>
<details><summary><b>Q:</b> Why test seed sync?</summary><b>A:</b> The key exists in JSON (flashcards) and SQL (grading); drift would make them disagree.</details>
<details><summary><b>Q:</b> What should you read besides <code>fail</code> in a test summary?</summary><b>A:</b> <code>skipped</code>, and each skip's reason.</details>

</details>

<details><summary><b>L4.02 · Test it II: database tests in PGlite with simulated Supabase roles</b> · 10 cards · <a href="l4-02-database-tests.md">lesson</a></summary>

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

</details>

<details><summary><b>L4.03 · Test it III: Playwright foundations: config, helpers, teardown, HTTP checks</b> · 11 cards · <a href="l4-03-playwright-foundations.md">lesson</a></summary>

<details><summary><b>Q:</b> What is a Playwright project?</summary><b>A:</b> A named configuration (device, spec files); every matching test runs once per project.</details>
<details><summary><b>Q:</b> Why 264 Playwright tests (253 before session 2)?</summary><b>A:</b> 20 api + 17 ui × 11 + 6 a11y × 9 + 1 auth × 3. Session 2 added one UI test (the Google hand-off).</details>
<details><summary><b>Q:</b> What does <code>webServer</code> do?</summary><b>A:</b> Builds and serves the production build on 4174, waits for it, reuses one already running.</details>
<details><summary><b>Q:</b> What does <code>retries: 1</code> report when a retry passes?</summary><b>A:</b> "Flaky".</details>
<details><summary><b>Q:</b> How are test users created without emails?</summary><b>A:</b> Admin <code>createUser({ email_confirm: true })</code>; the code comes from <code>generateLink(...).properties.email_otp</code>.</details>
<details><summary><b>Q:</b> Why <code>@example.com</code>?</summary><b>A:</b> A reserved domain that can never receive mail.</details>
<details><summary><b>Q:</b> Why per-file cleanup plus global teardown?</summary><b>A:</b> Parallel-safe cleanup of your own users, plus a safety net for crashes.</details>
<details><summary><b>Q:</b> Why check content type, not just status, for files?</summary><b>A:</b> The SPA rewrite returns <code>index.html</code> with 200 for any missing file.</details>
<details><summary><b>Q:</b> How should a secret scanner match?</summary><b>A:</b> By the secret's value, or its full shape (prefix + length), never the bare prefix.</details>
<details><summary><b>Q:</b> What does Git Bash do to <code>/study</code> as an argument?</summary><b>A:</b> Converts it to <code>C:/Program Files/Git/study</code>; disable with <code>MSYS_NO_PATHCONV=1</code>.</details>
<details><summary><b>Q:</b> Why must every spec share one base URL?</summary><b>A:</b> Otherwise a file can silently test production (or another build) instead of the code under test.</details>

</details>

<details><summary><b>L4.04 · Test it IV: UI tests for navigation, layout and flashcards</b> · 10 cards · <a href="l4-04-ui-tests-nav-cards.md">lesson</a></summary>

<details><summary><b>Q:</b> What's a web-first assertion?</summary><b>A:</b> An <code>await expect(locator)…</code> that retries until the condition holds or the timeout expires.</details>
<details><summary><b>Q:</b> When use <code>expect.poll</code>?</summary><b>A:</b> When the state isn't DOM text or attributes, e.g. a computed transform.</details>
<details><summary><b>Q:</b> How does the test know the card is flipped?</summary><b>A:</b> <code>DOMMatrix(transform).m11 = cos θ &lt; 0</code>.</details>
<details><summary><b>Q:</b> Why pace the mouse moves 16 ms apart?</summary><b>A:</b> Motion starts drags on animation frames; moves must span frames like a finger's.</details>
<details><summary><b>Q:</b> Why does the touch test run only on Chromium touch projects?</summary><b>A:</b> CDP <code>Input.dispatchTouchEvent</code> is Chromium-only and needs a touch device profile.</details>
<details><summary><b>Q:</b> What two bugs does the touch test guard?</summary><b>A:</b> Swipes swallowed by the scroll area, and the swipe triggering browser back.</details>
<details><summary><b>Q:</b> Why a dialog handler in <code>beforeEach</code>?</summary><b>A:</b> The running test's <code>beforeunload</code> prompt would block navigation.</details>
<details><summary><b>Q:</b> Why check sideways scroll at 0 and 600 ms?</summary><b>A:</b> The wobble exists only during entry animations; sample during and after.</details>
<details><summary><b>Q:</b> Why prefer <code>getByRole</code> for controls?</summary><b>A:</b> It finds them as assistive tech does, so losing the accessible name fails the test.</details>
<details><summary><b>Q:</b> What does the "Got it above the tab bar" check compare?</summary><b>A:</b> The button's bottom edge with the bar's top edge (+1 px), on phones and tablets.</details>

</details>

<details><summary><b>L4.05 · Test it V: UI tests for quiz, list, theme, test runner and results</b> · 9 cards · <a href="l4-05-ui-tests-quiz-runner.md">lesson</a></summary>

<details><summary><b>Q:</b> How does the quiz test know the right answer when the order is random?</summary><b>A:</b> It reads the question from the screen and looks it up in <code>questions.json</code>.</details>
<details><summary><b>Q:</b> What is state injection?</summary><b>A:</b> Writing the app's own storage keys (with its real schema) before loading a screen.</details>
<details><summary><b>Q:</b> How do you wait for replaced content?</summary><b>A:</b> Wait for the old content to be gone: <code>not.toHaveText(old)</code>.</details>
<details><summary><b>Q:</b> What two bugs hid behind the quiz failure?</summary><b>A:</b> The app shuffled twice on mount; the test read the card sliding out.</details>
<details><summary><b>Q:</b> Why does the runner test expect a banner on submit?</summary><b>A:</b> The injected attempt can't be submitted; the runner must show the error and keep the attempt.</details>
<details><summary><b>Q:</b> What does <code>.or()</code> do on locators?</summary><b>A:</b> Matches either locator, so the assertion passes if either is visible.</details>
<details><summary><b>Q:</b> 754,000 ms on screen?</summary><b>A:</b> <code>12:34</code>.</details>
<details><summary><b>Q:</b> Why is the theme oracle the body background colour?</summary><b>A:</b> It's what users see, independent of how the theme is implemented.</details>
<details><summary><b>Q:</b> Why can a debug spec find "No tests"?</summary><b>A:</b> Its file name doesn't match any project's <code>testMatch</code>.</details>

</details>

<details><summary><b>L4.06 · Test it VI: live security tests and the signed-in journey</b> · 10 cards · <a href="l4-06-live-security-auth.md">lesson</a></summary>

<details><summary><b>Q:</b> What does the journey fake, and what is real?</summary><b>A:</b> Only "send code" is faked (no email); the code, verification, session and every database call are real.</details>
<details><summary><b>Q:</b> How is an email code obtained without email?</summary><b>A:</b> Admin <code>generateLink</code> → <code>properties.email_otp</code>.</details>
<details><summary><b>Q:</b> Why assert <code>error</code> null on anonymous reads?</summary><b>A:</b> To distinguish RLS denial (no error, no rows) from a broken key or missing table.</details>
<details><summary><b>Q:</b> Error codes: privilege, check, unique?</summary><b>A:</b> 42501, 23514, 23505.</details>
<details><summary><b>Q:</b> Why does the key check matter?</summary><b>A:</b> Pasting the secret key into <code>VITE_SUPABASE_ANON_KEY</code> would ship it to every browser.</details>
<details><summary><b>Q:</b> What caused the Firefox journey to fail at submit?</summary><b>A:</b> Another worker's cleanup deleted all <code>e2e-bot-</code> users, including the one in use.</details>
<details><summary><b>Q:</b> Rule for cleanup in parallel runs?</summary><b>A:</b> Destroy only what you created; sweep by pattern only in global teardown.</details>
<details><summary><b>Q:</b> What caused the 8-minute wait for "Next"?</summary><b>A:</b> An extra Next click after an auto-advancing answer skipped a question, so the loop reached the last question early.</details>
<details><summary><b>Q:</b> What does <code>page.on("pageerror")</code> add?</summary><b>A:</b> Fails the journey on uncaught exceptions even if the next assertion happens to pass.</details>
<details><summary><b>Q:</b> Journey expected numbers?</summary><b>A:</b> 94 answered, 6 unanswered, score 90, 10 to review, 50/100 at the reload.</details>

</details>

<details><summary><b>L4.07 · Test it VII: accessibility audits, Lighthouse and flaky-test forensics</b> · 10 cards · <a href="l4-07-a11y-lighthouse-flaky.md">lesson</a></summary>

<details><summary><b>Q:</b> Which axe impacts fail the suite?</summary><b>A:</b> Serious and critical.</details>
<details><summary><b>Q:</b> Which WCAG tags are scanned?</summary><b>A:</b> wcag2a, wcag2aa, wcag21a, wcag21aa.</details>
<details><summary><b>Q:</b> Why <code>addInitScript</code> for the theme?</summary><b>A:</b> It runs before the app's scripts, so the first paint is in the forced theme.</details>
<details><summary><b>Q:</b> How many a11y scan runs?</summary><b>A:</b> 3 tests × 2 themes × 9 projects = 54.</details>
<details><summary><b>Q:</b> Four kinds of test failure?</summary><b>A:</b> Deterministic, timing, shared state, environment.</details>
<details><summary><b>Q:</b> First two commands for a suspected flake?</summary><b>A:</b> <code>--retries=0 --repeat-each=N</code>, then <code>--workers=1</code>.</details>
<details><summary><b>Q:</b> Why test the production build headlessly?</summary><b>A:</b> No dev reloads, no background-tab throttling, same files as users.</details>
<details><summary><b>Q:</b> What do hidden Chrome tabs do to animations?</summary><b>A:</b> Stop <code>requestAnimationFrame</code> and throttle timers, so animations appear frozen.</details>
<details><summary><b>Q:</b> Why pin the Lighthouse version?</summary><b>A:</b> Scoring curves change between versions; comparisons need the same one.</details>
<details><summary><b>Q:</b> Why open Lighthouse JSON as UTF-8 in Python on Windows?</summary><b>A:</b> The default cp1252 codec can't decode some characters in the report.</details>

</details>

<details><summary><b>L4.08 · Ship it: deploy from Git and operate (+ Level 4 checkpoint)</b> · 12 cards · <a href="l4-08-deploy-operate.md">lesson</a></summary>

<details><summary><b>Q:</b> What does the `vercel.json` redirect do?</summary><b>A:</b> Requests on the short domain get a permanent (308) redirect to the same path on the main domain.</details>
<details><summary><b>Q:</b> Why the SPA rewrite?</summary><b>A:</b> So deep links and reloads serve <code>index.html</code> and React Router handles the path.</details>
<details><summary><b>Q:</b> What gets <code>immutable</code> caching?</summary><b>A:</b> Only <code>/assets/*</code>, Vite's hashed files.</details>
<details><summary><b>Q:</b> When do <code>VITE_</code> env changes take effect?</summary><b>A:</b> At the next build; they're inlined into the bundle.</details>
<details><summary><b>Q:</b> Why <code>.vercelignore</code> in a Git-deployed project?</summary><b>A:</b> CLI deploys upload the working folder, including untracked secrets.</details>
<details><summary><b>Q:</b> Which <code>.gitignore</code> pattern wins?</summary><b>A:</b> The last one that matches.</details>
<details><summary><b>Q:</b> What did <code>vercel link</code> add to <code>.gitignore</code>, and the effect?</summary><b>A:</b> <code>.env*</code> after <code>!.env.example</code>, re-ignoring the template.</details>
<details><summary><b>Q:</b> Risk of no framework preset?</summary><b>A:</b> Source files served (HTML pointing at <code>/src/main.tsx</code>), 200 everywhere, app never runs.</details>
<details><summary><b>Q:</b> How to verify a deploy beyond status codes?</summary><b>A:</b> The HTML references a hashed <code>/assets/index-*.js</code>; then <code>npm run test:prod</code>.</details>
<details><summary><b>Q:</b> Supabase settings the repo can't set?</summary><b>A:</b> Running <code>setup.sql</code>, email templates with <code>{{ .Token }}</code>, OTP length, Site URL, SMTP.</details>
<details><summary><b>Q:</b> Why is <code>/me</code> not in the sitemap?</summary><b>A:</b> It's the account page; nothing worth indexing.</details>
<details><summary><b>Q:</b> What is a maskable icon?</summary><b>A:</b> An icon with safe padding so the OS can crop it to its own shape.</details>

</details>


<details><summary><b>L4.09 · Test it and run it: a sign-in you can't automate, and a live incident (session 2)</b> · 12 cards · <a href="l4-09-auth-tests-incident-ops.md">lesson</a></summary>
<details><summary><b>Q:</b> Why can't the tests drive Google's login page?</summary><b>A:</b> Bot detection, real credentials and 2-step verification in CI, and Google's terms. Test your side of the boundary instead.</details>
<details><summary><b>Q:</b> What does the hand-off test assert?</summary><b>A:</b> The authorize request has <code>provider=google</code>, <code>redirect_to</code> = <code>/me?next=%2Ftest</code>, and a PKCE <code>code_challenge</code>; and the error return shows the message and keeps <code>next</code>.</details>
<details><summary><b>Q:</b> supabase-js's session storage key?</summary><b>A:</b> <code>sb-${hostname.split(".")[0]}-auth-token</code>, e.g. <code>sb-kehcsupmruaskpgdvzaj-auth-token</code>.</details>
<details><summary><b>Q:</b> Why reload after writing the session to storage?</summary><b>A:</b> The client reads storage only at start-up.</details>
<details><summary><b>Q:</b> What does session injection not prove?</summary><b>A:</b> The Google redirect chain and the PKCE exchange.</details>
<details><summary><b>Q:</b> How do you assert an element is absent from the page?</summary><b>A:</b> <code>expect(locator).toHaveCount(0)</code>.</details>
<details><summary><b>Q:</b> Why do admin-minted codes still work with the Email provider off?</summary><b>A:</b> The switch closes public email sign-in; minting via the admin API (secret key) and verifying still issue a session.</details>
<details><summary><b>Q:</b> The five probes, in order?</summary><b>A:</b> Timed health/settings/REST; settings flags; the failing endpoint with a throwaway address; masked user listing; the dependency's port.</details>
<details><summary><b>Q:</b> Deny-list vs allow-list redaction?</summary><b>A:</b> Deny-list hides names you predicted (and leaks the rest); allow-list shows only what you know is safe.</details>
<details><summary><b>Q:</b> Two habits that stop automation from hanging?</summary><b>A:</b> <code>&lt; /dev/null</code> (no stdin) and <code>timeout N</code> (a deadline).</details>
<details><summary><b>Q:</b> How do you prove a deploy is what users get?</summary><b>A:</b> Fetch the live HTML, find the hashed entry chunk, grep it for a user-visible string unique to the new version.</details>
<details><summary><b>Q:</b> First move on a flaky test after your change?</summary><b>A:</b> Read where it failed (<code>error-context.md</code>, screenshot, trace) before assuming your change caused it.</details>

</details>

---

## 6 · Readiness checklist

Tick only what you could do **today, without notes**.

- [ ] I can extract the 130 questions and regenerate the seed, and prove every answer against the PDFs.
- [ ] I can write `schema.sql` with RLS on all four tables, the 8 policies and the 4 functions, and explain why scores can't be forged, and what the server doesn't guarantee.
- [ ] I can scaffold Vite + React + TypeScript by hand and write the shell with providers, routes, transitions, the tab bar/rail, the splash and an error boundary.
- [ ] I can set up Google-only sign-in (Google Cloud and Supabase settings) and build `SignIn` with the right client options, a name step, and progress sync with "newest wins".
- [ ] I can explain the session-2 504 hop by hop, derive a PKCE challenge, and say what each OAuth guard stops.
- [ ] I can build the swipe deck with a Safari-safe flip, undo, hide-mastered, shuffle, quiz and search.
- [ ] I can build the ranked test with a server start time, auto-advance, flags, a grid, resume, a submit sheet, results and the podium.
- [ ] I can style it with tokens for light and dark, from a 280 px fold to 1920 px, with safe areas and `dvh`, and pass axe.
- [ ] I can write the data, PGlite, Playwright (11 devices), live security, signed-in journey and a11y tests, and read Lighthouse.
- [ ] I can deploy from Git to Vercel with the right `vercel.json`, env vars and Supabase settings, and verify production.
- [ ] I can test a sign-in I can't automate, run the five incident probes, and prove a deploy is live.
- [ ] I can diagnose all 21 symptoms in §4 from the symptom alone.

## 7 · Done?

- [ ] **Mastery checkpoint passed** (sittings A, B and C met their passing bars).
- [ ] **Retake in 7 days** (put it in your calendar now): repeat §4 and the drills you found hardest. Memory that survives a week without review is memory you own.
- [ ] **Optional**: the full rebuild against the original tests.

---
← [L4.09 A sign-in you can't automate, and a live incident](l4-09-auth-tests-incident-ops.md) · [Hub](README.md) · [Study plan](plan.md)
