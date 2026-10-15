import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "../components/Icon";
import { CoffeeMug } from "../components/CoffeeMug";
import { BeanBurst, CountUp, Ring, Sheet } from "../components/Ui";
import { BY_ID, LETTERS, QUESTIONS, TEST_SIZE, numberInWeek } from "../data/questions";
import { useAuth } from "../lib/auth";
import { friendlyError, isConfigured, supabase } from "../lib/supabase";
import { fmtDuration, haptic, ordinal } from "../lib/format";
import { load, save } from "../lib/storage";

type Attempt = {
  attempt_id: string;
  question_ids: number[];
  started_at: string; // server time
  client_started: number; // Date.now() at start, for the on-screen timer
  answers: (number | null)[];
  flags: number[];
  pos: number;
};

type Result = {
  score: number;
  total: number;
  duration_ms: number;
  correct: number[];
  rank: number | null;
  players: number;
  question_ids: number[];
  answers: (number | null)[];
};

const ATTEMPT_KEY = "pol.attempt";
const RESULT_KEY = "pol.lastResult";
const EXPIRY_MS = 3 * 60 * 60 * 1000;

const loadAttempt = () => {
  const a = load<Attempt | null>(ATTEMPT_KEY, null);
  if (a && Date.now() - a.client_started > EXPIRY_MS) {
    save(ATTEMPT_KEY, null);
    return null;
  }
  return a;
};

export default function Test() {
  return (
    <Routes>
      <Route index element={<Intro />} />
      <Route path="run" element={<Run />} />
      <Route path="result" element={<ResultView />} />
      <Route path="*" element={<Intro />} />
    </Routes>
  );
}

/* =====================================================================
   Intro
   ===================================================================== */
function Intro() {
  const { session, profile, ready } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pending = loadAttempt();
  const last = load<Result | null>(RESULT_KEY, null);

  const start = async () => {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.rpc("start_test");
    setBusy(false);
    if (error) return setErr(friendlyError(error));
    const d = data as { attempt_id: string; question_ids: number[]; started_at: string };
    const a: Attempt = {
      ...d,
      client_started: Date.now(),
      answers: d.question_ids.map(() => null),
      flags: [],
      pos: 0,
    };
    save(ATTEMPT_KEY, a);
    haptic(20);
    nav("/test/run");
  };

  return (
    <div>
      <div className="page-head">
        <span className="caps">Practice test</span>
        <h1 className="display">
          {TEST_SIZE} questions.
          <br />
          <span className="red">One clock.</span>
        </h1>
        <p>Drawn at random from all {QUESTIONS.length} assignment questions.</p>
      </div>

      <div className="card pad">
        <ul className="rules">
          <li>
            <span className="ri">
              <Icon name="shuffle" size={20} />
            </span>
            <div>
              <b>{TEST_SIZE} random questions</b>
              <span>A new mix every attempt, all from the assignments.</span>
            </div>
          </li>
          <li>
            <span className="ri">
              <Icon name="clock" size={20} />
            </span>
            <div>
              <b>Timed by the server</b>
              <span>The clock starts when you tap Start and stops on Submit.</span>
            </div>
          </li>
          <li>
            <span className="ri">
              <Icon name="trophy" size={20} />
            </span>
            <div>
              <b>Ranked: score first, then time</b>
              <span>Your best attempt counts. Retake as often as you like.</span>
            </div>
          </li>
          <li>
            <span className="ri">
              <Icon name="flag" size={20} />
            </span>
            <div>
              <b>Skip, flag &amp; come back</b>
              <span>Jump to any question from the grid before submitting.</span>
            </div>
          </li>
        </ul>
      </div>

      <div className="stack" style={{ marginTop: 16 }}>
        {!isConfigured ? (
          <div className="banner">
            <Icon name="info" size={18} /> Tests need Supabase. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
          </div>
        ) : !ready ? null : !session ? (
          <>
            <Link to="/me?next=/test" className="btn primary block">
              <Icon name="mail" size={19} /> Sign in with email to start
            </Link>
            <p className="muted" style={{ textAlign: "center", fontSize: ".85rem", margin: 0 }}>
              No password. We'll email you a sign-in code.
            </p>
          </>
        ) : !profile ? (
          <Link to="/me?next=/test" className="btn primary block">
            Pick a leaderboard name first <Icon name="arrow" size={18} />
          </Link>
        ) : pending ? (
          <>
            <motion.button className="btn red block" whileTap={{ scale: 0.97 }} onClick={() => nav("/test/run")}>
              Resume test · {pending.answers.filter((a) => a !== null).length}/{pending.question_ids.length} answered
            </motion.button>
            <button className="btn block" onClick={start} disabled={busy}>
              {busy ? "Brewing a fresh test…" : "Start over with new questions"}
            </button>
          </>
        ) : (
          <motion.button className="btn red block" whileTap={{ scale: 0.97 }} onClick={start} disabled={busy} style={{ minHeight: 58, fontSize: "1.05rem" }}>
            {busy ? (
              <>
                <CoffeeMug size={26} steam={false} filling /> Brewing your test…
              </>
            ) : (
              <>
                <Icon name="bolt" size={20} /> Start test
              </>
            )}
          </motion.button>
        )}
        {err && <div className="banner">{err}</div>}
        {last && session && (
          <Link to="/test/result" className="btn ghost block">
            Last result: {last.score}/{last.total} in {fmtDuration(last.duration_ms)} <Icon name="right" size={18} />
          </Link>
        )}
      </div>
    </div>
  );
}

/* =====================================================================
   Running test
   ===================================================================== */
function Run() {
  const nav = useNavigate();
  const [a, setA] = useState<Attempt | null>(() => loadAttempt());
  const [now, setNow] = useState(Date.now());
  const [gridOpen, setGridOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    if (!a) nav("/test", { replace: true });
  }, [a, nav]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (a) save(ATTEMPT_KEY, a);
  }, [a]);

  // warn before closing the tab mid-test
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const go = useCallback(
    (to: number) => {
      setA((cur) => {
        if (!cur) return cur;
        const pos = Math.max(0, Math.min(cur.question_ids.length - 1, to));
        setDir(pos >= cur.pos ? 1 : -1);
        return { ...cur, pos };
      });
    },
    []
  );

  const choose = (i: number) => {
    if (!a) return;
    haptic(8);
    const answers = a.answers.slice();
    answers[a.pos] = answers[a.pos] === i ? null : i;
    setA({ ...a, answers });
    // quick auto-advance to keep momentum (you can always go back)
    if (answers[a.pos] !== null && a.pos < a.question_ids.length - 1) {
      const p = a.pos;
      setTimeout(() => {
        setDir(1);
        setA((cur) => (cur && cur.pos === p ? { ...cur, pos: p + 1 } : cur));
      }, 320);
    }
  };

  const toggleFlag = () => {
    if (!a) return;
    haptic(8);
    const flags = a.flags.includes(a.pos) ? a.flags.filter((f) => f !== a.pos) : [...a.flags, a.pos];
    setA({ ...a, flags });
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!a || gridOpen || submitOpen) return;
      const i = "1234".indexOf(e.key) >= 0 ? "1234".indexOf(e.key) : "abcd".indexOf(e.key.toLowerCase());
      const q = BY_ID.get(a.question_ids[a.pos]);
      if (i >= 0 && q && i < q.options.length) choose(i);
      else if (e.key === "ArrowRight") go(a.pos + 1);
      else if (e.key === "ArrowLeft") go(a.pos - 1);
      else if (e.key.toLowerCase() === "f") toggleFlag();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const answered = useMemo(() => a?.answers.filter((x) => x !== null).length ?? 0, [a]);

  if (!a) return null;
  const q = BY_ID.get(a.question_ids[a.pos])!;
  const total = a.question_ids.length;
  const isLast = a.pos === total - 1;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.rpc("submit_test", {
      p_attempt: a.attempt_id,
      p_answers: a.answers.map((x) => (x === null ? -1 : x)),
    });
    setBusy(false);
    if (error) return setErr(friendlyError(error));
    const r = data as Omit<Result, "question_ids" | "answers">;
    save(RESULT_KEY, { ...r, question_ids: a.question_ids, answers: a.answers });
    save(ATTEMPT_KEY, null);
    haptic(40);
    nav("/test/result", { replace: true, state: { fresh: true } });
  };

  return (
    <div>
      <div className="test-top">
        <div className="row between">
          <button className="btn sm ghost" onClick={() => setQuitOpen(true)} style={{ paddingLeft: 4 }}>
            <Icon name="x" size={18} /> Exit
          </button>
          <span className="timer" aria-label="Elapsed time">
            <span className="dot" />
            {fmtDuration(now - a.client_started)}
          </span>
          <button className="btn sm" onClick={() => setSubmitOpen(true)}>
            Submit
          </button>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <div className="bar" style={{ flex: 1, height: 6 }}>
            <span style={{ width: `${(answered / total) * 100}%` }} />
          </div>
          <span className="tnum muted" style={{ fontSize: ".82rem", fontWeight: 700 }}>
            {answered}/{total}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={a.pos}
          className="q-card"
          custom={dir}
          initial={{ x: dir * 48, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: dir * -48, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragEnd={(_, info) => {
            if (info.offset.x < -70) go(a.pos + 1);
            else if (info.offset.x > 70) go(a.pos - 1);
          }}
          style={{ touchAction: "pan-y" }}
        >
          <div className="row between">
            <span className="tag">
              Question {a.pos + 1} of {total}
            </span>
            {a.flags.includes(a.pos) && (
              <span className="tag" style={{ color: "var(--red)", background: "var(--red-soft)" }}>
                <Icon name="flag" size={13} /> Flagged
              </span>
            )}
          </div>
          <p className="q-text">{q.q}</p>
          <div className="opts">
            {q.options.map((o, i) => (
              <motion.button key={i} className={`opt ${a.answers[a.pos] === i ? "sel" : ""}`} whileTap={{ scale: 0.97 }} onClick={() => choose(i)}>
                <span className="L">{LETTERS[i]}</span>
                {o}
                {a.answers[a.pos] === i && (
                  <motion.span className="mark" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Icon name="check" size={20} />
                  </motion.span>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="kbd-hint">
        <kbd>1</kbd>–<kbd>4</kbd> answer · <kbd>←</kbd> <kbd>→</kbd> move · <kbd>F</kbd> flag
      </p>

      <div className="test-nav">
        <motion.button className="round" whileTap={{ scale: 0.9 }} onClick={() => go(a.pos - 1)} disabled={a.pos === 0} aria-label="Previous question">
          <Icon name="left" />
        </motion.button>
        <motion.button className={`round ${a.flags.includes(a.pos) ? "flag-on" : ""}`} whileTap={{ scale: 0.9 }} onClick={toggleFlag} aria-label="Flag question">
          <Icon name="flag" />
        </motion.button>
        {isLast ? (
          <motion.button className="btn red" whileTap={{ scale: 0.96 }} onClick={() => setSubmitOpen(true)}>
            Submit test
          </motion.button>
        ) : (
          <motion.button className="btn primary" whileTap={{ scale: 0.96 }} onClick={() => go(a.pos + 1)}>
            Next <Icon name="right" size={18} />
          </motion.button>
        )}
        <motion.button className="round" whileTap={{ scale: 0.9 }} onClick={() => setGridOpen(true)} aria-label="All questions">
          <Icon name="grid" />
        </motion.button>
      </div>

      <Sheet open={gridOpen} onClose={() => setGridOpen(false)}>
        <h3>Jump to a question</h3>
        <div className="legend">
          <span>
            <i style={{ background: "var(--primary)" }} />
            Answered ({answered})
          </span>
          <span>
            <i style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)" }} />
            Unanswered ({total - answered})
          </span>
          <span>
            <i style={{ background: "var(--red)", borderRadius: "50%" }} />
            Flagged ({a.flags.length})
          </span>
        </div>
        <div className="qgrid">
          {a.question_ids.map((_, i) => (
            <button
              key={i}
              className={`${a.answers[i] !== null ? "ans" : ""} ${i === a.pos ? "cur" : ""} ${a.flags.includes(i) ? "flag" : ""}`}
              onClick={() => {
                go(i);
                setGridOpen(false);
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={submitOpen} onClose={() => !busy && setSubmitOpen(false)}>
        <h3>Submit your test?</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          You answered <b style={{ color: "var(--ink)" }}>{answered}</b> of {total}
          {total - answered > 0 && (
            <>
              . <b style={{ color: "var(--red)" }}>{total - answered} unanswered</b> will count as wrong
            </>
          )}
          .{a.flags.length > 0 && ` ${a.flags.length} flagged.`}
        </p>
        {err && (
          <div className="banner" style={{ marginBottom: 12 }}>
            {err}
          </div>
        )}
        <div className="stack">
          <button className="btn red block" onClick={submit} disabled={busy}>
            {busy ? "Grading…" : `Submit at ${fmtDuration(now - a.client_started)}`}
          </button>
          {total - answered > 0 && (
            <button
              className="btn block"
              onClick={() => {
                setSubmitOpen(false);
                go(a.answers.findIndex((x) => x === null));
              }}
            >
              Go to first unanswered
            </button>
          )}
        </div>
      </Sheet>

      <Sheet open={quitOpen} onClose={() => setQuitOpen(false)}>
        <h3>Leave the test?</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Your answers are saved on this device and you can resume, but the clock keeps running.
        </p>
        <div className="stack">
          <button className="btn primary block" onClick={() => setQuitOpen(false)}>
            Keep going
          </button>
          <button className="btn block" onClick={() => nav("/test")}>
            Leave for now
          </button>
        </div>
      </Sheet>
    </div>
  );
}

/* =====================================================================
   Result
   ===================================================================== */
function ResultView() {
  const r = load<Result | null>(RESULT_KEY, null);
  const [showAll, setShowAll] = useState(false);
  if (!r)
    return (
      <div className="empty">
        <CoffeeMug size={90} />
        No result yet.
        <Link to="/test" className="btn primary">
          Take a test
        </Link>
      </div>
    );

  const pct = r.score / r.total;
  const mood =
    pct >= 0.95 ? "Legendary brew! ☕🔥" : pct >= 0.85 ? "Excellent! Nearly perfect." : pct >= 0.7 ? "Solid. A few more cards to go." : pct >= 0.5 ? "Getting there. Keep swiping!" : "Time for another cup and a review.";
  const wrong = r.question_ids
    .map((id, i) => ({ q: BY_ID.get(id)!, you: r.answers[i], right: r.correct?.[i] ?? BY_ID.get(id)!.answer }))
    .filter((x) => x.you !== x.right);

  return (
    <div>
      <motion.div className="result" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 22 }}>
        {pct >= 0.8 && <BeanBurst />}
        <motion.img
          className="mascot"
          src="/brand/mascot.webp"
          width={74}
          height={81}
          alt=""
          initial={{ scale: 0, rotate: -30, y: 30 }}
          animate={{ scale: 1, rotate: 0, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.9 }}
          style={{ display: pct >= 0.6 ? "block" : "none" }}
        />
        <span className="caps" style={{ color: "#a8998a" }}>
          Your score
        </span>
        <div className="ring-wrap" style={{ marginTop: 10 }}>
          <Ring value={pct} />
          <div className="ring-num">
            <b className="tnum">
              <CountUp to={r.score} />
            </b>
            <span>out of {r.total}</span>
          </div>
        </div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} style={{ margin: "14px 0 0", fontWeight: 700 }}>
          {mood}
        </motion.p>
        <div className="result-stats">
          <div>
            <b className="tnum">{fmtDuration(r.duration_ms)}</b>
            <span>Time</span>
          </div>
          <div>
            <b className="tnum">{Math.round(pct * 100)}%</b>
            <span>Accuracy</span>
          </div>
          <div>
            <b className="tnum">{r.rank ? ordinal(r.rank) : "–"}</b>
            <span>{r.players ? `of ${r.players} players` : "Rank"}</span>
          </div>
        </div>
      </motion.div>

      <div className="stack" style={{ marginTop: 14 }}>
        <Link to="/ranks" className="btn primary block">
          <Icon name="trophy" size={19} /> See the leaderboard
        </Link>
        <Link to="/test" className="btn block">
          <Icon name="flip" size={19} /> Take another test
        </Link>
      </div>

      <div className="section-title">
        <h2>Review mistakes</h2>
        <span className="caps">{wrong.length} to review</span>
      </div>
      {wrong.length === 0 ? (
        <div className="card pad" style={{ textAlign: "center" }}>
          Perfect paper. Nothing to review! 🎉
        </div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {(showAll ? wrong : wrong.slice(0, 8)).map(({ q, you, right }) => (
            <div key={q.id} className="review-item">
              <span className="tag" style={{ marginBottom: 8 }}>
                W{q.week} · Q{numberInWeek(q)}
              </span>
              <p style={{ marginTop: 8 }}>{q.q}</p>
              <div className="ra you">
                <Icon name="x" size={17} />
                {you === null || you === undefined || you < 0 ? <i>Skipped</i> : `${LETTERS[you]}. ${q.options[you]}`}
              </div>
              <div className="ra ok">
                <Icon name="check" size={17} />
                {LETTERS[right]}. {q.options[right]}
              </div>
            </div>
          ))}
          {!showAll && wrong.length > 8 && (
            <button className="btn block" onClick={() => setShowAll(true)}>
              Show all {wrong.length}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
