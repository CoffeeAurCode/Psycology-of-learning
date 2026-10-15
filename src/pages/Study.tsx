import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type PanInfo } from "motion/react";
import { Icon } from "../components/Icon";
import { CoffeeMug } from "../components/CoffeeMug";
import { Segmented, Switch } from "../components/Ui";
import { LETTERS, QUESTIONS, WEEKS, WEEK_TOPICS, numberInWeek, type Question } from "../data/questions";
import { useProgress, type Mark } from "../lib/progress";
import { haptic, shuffle as shuffleArr } from "../lib/format";
import { load, save } from "../lib/storage";

type Mode = "cards" | "quiz" | "list";

export default function Study() {
  const [params, setParams] = useSearchParams();
  const weekParam = params.get("week");
  const week: number | "all" = weekParam != null && WEEKS.includes(+weekParam) ? +weekParam : "all";
  const [mode, setMode] = useState<Mode>(() => load<Mode>("pol.studyMode", "cards"));
  useEffect(() => {
    save("pol.studyMode", mode);
  }, [mode]);

  const setWeek = (w: number | "all") => {
    const p = new URLSearchParams(params);
    if (w === "all") p.delete("week");
    else p.set("week", String(w));
    setParams(p, { replace: true });
  };

  const pool = useMemo(() => (week === "all" ? QUESTIONS : QUESTIONS.filter((q) => q.week === week)), [week]);

  return (
    <div>
      <div className="page-head compact">
        <h1 className="display">{week === "all" ? "All weeks" : `Week ${week}`}</h1>
        <p>{week === "all" ? `${pool.length} questions` : `${WEEK_TOPICS[week]} · ${pool.length} questions`}</p>
      </div>

      <WeekChips week={week} setWeek={setWeek} />

      <div style={{ margin: "12px 0 4px" }}>
        <Segmented<Mode>
          id="study-mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "cards", label: <><Icon name="cards" size={17} /> Cards</> },
            { value: "quiz", label: <><Icon name="bolt" size={17} /> Quiz</> },
            { value: "list", label: <><Icon name="list" size={17} /> List</> },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={mode + String(week)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {mode === "cards" && <Cards pool={pool} />}
          {mode === "quiz" && <Quiz pool={pool} />}
          {mode === "list" && <ListView pool={pool} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function WeekChips({ week, setWeek }: { week: number | "all"; setWeek: (w: number | "all") => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector(".chip.on")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [week]);
  return (
    <div className="chips" ref={ref}>
      <button className={`chip ${week === "all" ? "on" : ""}`} onClick={() => setWeek("all")}>
        All <span className="count">{QUESTIONS.length}</span>
      </button>
      {WEEKS.map((w) => (
        <button key={w} className={`chip ${week === w ? "on" : ""}`} onClick={() => setWeek(w)}>
          Week {w}
        </button>
      ))}
    </div>
  );
}

/* =====================================================================
   Flashcards — swipe right = got it, left = again, tap = flip
   ===================================================================== */
function Cards({ pool }: { pool: Question[] }) {
  const { marks, mark } = useProgress();
  const [shuffled, setShuffled] = useState(() => load("pol.shuffle", false));
  const [hideKnown, setHideKnown] = useState(() => load("pol.hideKnown", false));
  const [deck, setDeck] = useState<Question[]>([]);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dir, setDir] = useState(0);
  const [session, setSession] = useState({ known: 0, again: 0 });

  // build the deck from a snapshot of progress, so marking cards doesn't reshuffle mid-session
  const build = useCallback(
    (onlyIds?: Set<number>) => {
      let d = pool.filter((q) => (onlyIds ? onlyIds.has(q.id) : !hideKnown || marks[q.id]?.s !== "known"));
      if (shuffled) d = shuffleArr(d);
      setDeck(d);
      setPos(0);
      setFlipped(false);
      setSession({ known: 0, again: 0 });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, hideKnown, shuffled]
  );
  useEffect(() => {
    build();
  }, [build]);
  useEffect(() => {
    save("pol.shuffle", shuffled);
  }, [shuffled]);
  useEffect(() => {
    save("pol.hideKnown", hideKnown);
  }, [hideKnown]);

  const current = deck[pos];
  const againIds = useRef(new Set<number>());

  const decide = useCallback(
    (m: Mark) => {
      if (!current) return;
      haptic(m === "known" ? 10 : 18);
      setDir(m === "known" ? 1 : -1);
      mark(current.id, m);
      if (m === "again") againIds.current.add(current.id);
      else againIds.current.delete(current.id);
      setSession((s) => ({ ...s, [m === "known" ? "known" : "again"]: s[m === "known" ? "known" : "again"] + 1 }));
      setFlipped(false);
      setPos((p) => p + 1);
    },
    [current, mark]
  );

  const undo = () => {
    if (pos === 0) return;
    setDir(0);
    setFlipped(false);
    setPos((p) => p - 1);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") decide("known");
      else if (e.key === "ArrowLeft") decide("again");
      else if (e.key === "Backspace") {
        e.preventDefault(); // Safari would otherwise navigate back
        undo();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const done = deck.length > 0 && pos >= deck.length;

  return (
    <div>
      <div className="deck">
        {deck.length === 0 ? (
          <div className="fc-face" style={{ alignItems: "center", justifyContent: "center", textAlign: "center", gap: 10 }}>
            <CoffeeMug size={96} />
            <b>Everything here is mastered.</b>
            <span className="muted">Turn off “Hide mastered” to review them again.</span>
          </div>
        ) : done ? (
          <DeckDone
            known={session.known}
            again={session.again}
            onRestart={() => build()}
            onReviewAgain={againIds.current.size ? () => build(new Set(againIds.current)) : undefined}
          />
        ) : (
          <>
            {deck.slice(pos + 1, pos + 3).map((q, i) => (
              <motion.div
                key={q.id}
                className="fc-ghost"
                initial={false}
                animate={{ scale: 1 - (i + 1) * 0.045, y: (i + 1) * 14, opacity: 1 - (i + 1) * 0.25 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ zIndex: 1 - i }}
              />
            ))}
            <AnimatePresence custom={dir} initial={false}>
              {current && (
                <SwipeCard
                  key={current.id + ":" + pos}
                  q={current}
                  index={pos}
                  total={deck.length}
                  flipped={flipped}
                  status={marks[current.id]?.s}
                  onFlip={() => setFlipped((f) => !f)}
                  onDecide={decide}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {!done && deck.length > 0 && (
        <>
          <div className="deck-foot">
            <span className="tnum">
              {pos + 1} / {deck.length}
            </span>
            <span className="tnum">
              <span style={{ color: "var(--good)" }}>✓ {session.known}</span> · <span style={{ color: "var(--bad)" }}>↻ {session.again}</span>
            </span>
          </div>
          <div className="bar" style={{ marginBottom: 14, height: 5 }}>
            <span style={{ width: `${(pos / deck.length) * 100}%` }} />
          </div>
          <div className="deck-controls">
            <motion.button className="round" whileTap={{ scale: 0.9 }} onClick={undo} disabled={pos === 0} aria-label="Previous card">
              <Icon name="undo" />
            </motion.button>
            <motion.button className="btn again" whileTap={{ scale: 0.95 }} onClick={() => decide("again")}>
              <Icon name="x" size={20} /> Again
            </motion.button>
            <motion.button className="btn got" whileTap={{ scale: 0.95 }} onClick={() => decide("known")}>
              <Icon name="check" size={20} /> Got it
            </motion.button>
            <motion.button className="round" whileTap={{ scale: 0.9, rotate: 90 }} onClick={() => setFlipped((f) => !f)} aria-label="Flip card">
              <Icon name="flip" />
            </motion.button>
          </div>
        </>
      )}

      <p className="kbd-hint">
        <kbd>Space</kbd> flip · <kbd>→</kbd> got it · <kbd>←</kbd> again · <kbd>Backspace</kbd> undo
      </p>
      <div className="row between" style={{ marginTop: 18, flexWrap: "wrap", gap: 12 }}>
        <Switch on={shuffled} onChange={setShuffled} label="Shuffle" />
        <Switch on={hideKnown} onChange={setHideKnown} label="Hide mastered" />
      </div>
    </div>
  );
}

function SwipeCard({
  q,
  index,
  total,
  flipped,
  status,
  onFlip,
  onDecide,
}: {
  q: Question;
  index: number;
  total: number;
  flipped: boolean;
  status?: Mark;
  onFlip: () => void;
  onDecide: (m: Mark) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const goodOpacity = useTransform(x, [30, 120], [0, 1]);
  // Flip: show exactly one face based on the angle. Safari doesn't reliably honour
  // backface-visibility here, so we never rely on it alone.
  const rotateY = useSpring(flipped ? 180 : 0, { stiffness: 260, damping: 26 });
  useEffect(() => {
    rotateY.set(flipped ? 180 : 0);
  }, [flipped, rotateY]);
  const frontOpacity = useTransform(rotateY, (v) => (v < 90 ? 1 : 0));
  const backOpacity = useTransform(rotateY, (v) => (v < 90 ? 0 : 1));
  const frontEvents = useTransform(rotateY, (v) => (v < 90 ? "auto" : "none"));
  const backEvents = useTransform(rotateY, (v) => (v < 90 ? "none" : "auto"));
  const badOpacity = useTransform(x, [-120, -30], [1, 0]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 110 || info.velocity.x > 650) onDecide("known");
    else if (info.offset.x < -110 || info.velocity.x < -650) onDecide("again");
  };

  return (
    <motion.div
      className="fc"
      style={{ x, rotate, zIndex: 5 }}
      drag="x"
      dragSnapToOrigin
      dragElastic={0.9}
      onDragEnd={onDragEnd}
      onTap={onFlip}
      initial={{ scale: 0.94, y: 14, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit="exit"
      variants={{
        exit: (d: number) =>
          d === 0
            ? { opacity: 0, scale: 0.94, transition: { duration: 0.15 } }
            : { x: d * 520, rotate: d * 24, opacity: 0, transition: { duration: 0.36, ease: [0.4, 0, 0.2, 1] } },
      }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      role="button"
      aria-label={flipped ? "Answer side. Tap to flip back." : "Question side. Tap to reveal the answer."}
    >
      <motion.div className="fc-stamp good" style={{ opacity: goodOpacity }}>
        GOT IT
      </motion.div>
      <motion.div className="fc-stamp bad" style={{ opacity: badOpacity }}>
        AGAIN
      </motion.div>
      <motion.div className="fc-inner" style={{ rotateY }}>
        {/* front */}
        <motion.div className="fc-face fc-front" style={{ opacity: frontOpacity, pointerEvents: frontEvents }} aria-hidden={flipped}>
          <div className="fc-meta">
            <span className="tag">
              W{q.week} · Q{numberInWeek(q)}
            </span>
            <span>{status === "known" ? "✓ mastered" : status === "again" ? "↻ reviewing" : `${index + 1} of ${total}`}</span>
          </div>
          <div className="fc-scroll" tabIndex={flipped ? -1 : 0} aria-label="Question and options">
            <p className="fc-q">{q.q}</p>
            <ul className="fc-opts">
              {q.options.map((o, i) => (
                <li key={i}>
                  <span className="L">{LETTERS[i]}</span>
                  {o}
                </li>
              ))}
            </ul>
          </div>
          <div className="fc-hint">
            <Icon name="flip" size={14} /> Tap to reveal · swipe → got it, ← again
          </div>
        </motion.div>
        {/* back */}
        <motion.div className="fc-face fc-back" style={{ opacity: backOpacity, pointerEvents: backEvents }} aria-hidden={!flipped}>
          <div className="fc-meta">
            <span className="tag">
              W{q.week} · Q{numberInWeek(q)}
            </span>
            <span>Answer</span>
          </div>
          <div className="fc-scroll" tabIndex={flipped ? 0 : -1} aria-label="Answer">
            <p className="fc-small-q">{q.q}</p>
            <div className="fc-answer-label">Correct answer</div>
            <div className="fc-answer">
              <span style={{ color: "#ef3a42" }}>{LETTERS[q.answer]}.</span> {q.options[q.answer]}
            </div>
            <ul className="fc-opts">
              {q.options.map((o, i) => (
                <li key={i} className={i === q.answer ? "correct" : ""}>
                  <span className="L">{LETTERS[i]}</span>
                  {o}
                </li>
              ))}
            </ul>
            {q.note && <div className="fc-note">Note: {q.note}</div>}
          </div>
          <div className="fc-hint">Swipe → if you knew it · ← to see it again</div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function DeckDone({ known, again, onRestart, onReviewAgain }: { known: number; again: number; onRestart: () => void; onReviewAgain?: () => void }) {
  return (
    <motion.div
      className="fc-face"
      style={{ alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12 }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <motion.img src="/brand/mascot.webp" width={120} height={131} alt="" style={{ width: 120 }} initial={{ rotate: -10, y: 20 }} animate={{ rotate: [-10, 6, 0], y: 0 }} transition={{ duration: 0.8 }} />
      <h2 className="display" style={{ margin: 0, fontSize: "1.6rem" }}>
        Deck done!
      </h2>
      <p className="muted" style={{ margin: 0 }}>
        <b style={{ color: "var(--good)" }}>{known}</b> got it · <b style={{ color: "var(--bad)" }}>{again}</b> to review
      </p>
      <div className="stack" style={{ width: "100%", maxWidth: 300, marginTop: 6 }}>
        {onReviewAgain && (
          <button className="btn red block" onClick={onReviewAgain}>
            Review the {again} “again” cards
          </button>
        )}
        <button className={`btn block ${onReviewAgain ? "" : "primary"}`} onClick={onRestart}>
          Restart deck
        </button>
      </div>
    </motion.div>
  );
}

/* =====================================================================
   Quick quiz (unranked) — instant feedback
   ===================================================================== */
function Quiz({ pool }: { pool: Question[] }) {
  const { mark } = useProgress();
  const [order, setOrder] = useState(() => shuffleArr(pool));
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<Question[]>([]);

  const restart = (qs = pool) => {
    setOrder(shuffleArr(qs));
    setPos(0);
    setPicked(null);
    setScore(0);
    setMissed([]);
  };
  // reshuffle only when the week changes (not on mount, which would swap the first question)
  const lastPool = useRef(pool);
  useEffect(() => {
    if (lastPool.current === pool) return;
    lastPool.current = pool;
    restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  const q = order[pos];
  const pick = (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    if (i === q.answer) {
      setScore((s) => s + 1);
      haptic(10);
    } else {
      setMissed((m) => [...m, q]);
      mark(q.id, "again");
      haptic(30);
    }
  };
  const next = () => {
    setPicked(null);
    setPos((p) => p + 1);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const i = "1234".indexOf(e.key) >= 0 ? "1234".indexOf(e.key) : "abcd".indexOf(e.key.toLowerCase());
      if (i >= 0 && q && i < q.options.length) pick(i);
      else if ((e.key === "Enter" || e.key === "ArrowRight") && picked !== null) next();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  if (!q) {
    const pct = Math.round((score / order.length) * 100);
    return (
      <div className="q-card" style={{ marginTop: 14, textAlign: "center" }}>
        <CoffeeMug size={90} />
        <h2 className="display" style={{ margin: "8px 0 4px" }}>
          {score}/{order.length}
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {pct >= 90 ? "Espresso-strong. 🔥" : pct >= 70 ? "Nicely brewed!" : "Needs another cup. Keep going!"}
        </p>
        <div className="stack">
          {missed.length > 0 && (
            <button className="btn red block" onClick={() => restart(missed)}>
              Retry the {missed.length} you missed
            </button>
          )}
          <button className="btn block" onClick={() => restart()}>
            New round
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div className="deck-foot">
        <span className="tnum">
          {pos + 1} / {order.length}
        </span>
        <span className="tnum">Score {score}</span>
      </div>
      <div className="bar" style={{ marginBottom: 12, height: 5 }}>
        <span style={{ width: `${(pos / order.length) * 100}%` }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={q.id} className="q-card" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.22 }}>
          <span className="tag">
            W{q.week} · Q{numberInWeek(q)}
          </span>
          <p className="q-text">{q.q}</p>
          <div className="opts">
            {q.options.map((o, i) => {
              const state = picked === null ? "" : i === q.answer ? "correct" : i === picked ? "wrong" : "dim";
              return (
                <motion.button
                  key={i}
                  className={`opt ${state}`}
                  onClick={() => pick(i)}
                  whileTap={picked === null ? { scale: 0.97 } : undefined}
                  animate={state === "wrong" ? { x: [0, -8, 8, -5, 5, 0] } : state === "correct" ? { scale: [1, 1.03, 1] } : {}}
                  transition={{ duration: 0.4 }}
                  disabled={picked !== null}
                >
                  <span className="L">{LETTERS[i]}</span>
                  {o}
                  {state === "correct" && <Icon name="check" className="mark" />}
                  {state === "wrong" && <Icon name="x" className="mark" />}
                </motion.button>
              );
            })}
          </div>
          {q.note && picked !== null && <p className="muted" style={{ fontSize: ".82rem", fontStyle: "italic" }}>Note: {q.note}</p>}
        </motion.div>
      </AnimatePresence>
      <p className="kbd-hint">
        <kbd>1</kbd>–<kbd>4</kbd> answer · <kbd>Enter</kbd> next
      </p>
      <AnimatePresence>
        {picked !== null && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginTop: 12 }}>
            <button className="btn primary block" onClick={next}>
              {pos + 1 < order.length ? "Next question" : "See score"} <Icon name="arrow" size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* =====================================================================
   Searchable list of every Q&A
   ===================================================================== */
function ListView({ pool }: { pool: Question[] }) {
  const [term, setTerm] = useState("");
  const t = term.trim().toLowerCase();
  const items = useMemo(
    () => (t ? pool.filter((q) => (q.q + " " + q.options.join(" ")).toLowerCase().includes(t)) : pool),
    [pool, t]
  );
  const hl = (s: string) => {
    if (!t) return s;
    const i = s.toLowerCase().indexOf(t);
    if (i < 0) return s;
    return (
      <>
        {s.slice(0, i)}
        <mark>{s.slice(i, i + t.length)}</mark>
        {s.slice(i + t.length)}
      </>
    );
  };
  let last = -1;
  return (
    <div style={{ marginTop: 14 }}>
      <div className="search">
        <Icon name="search" size={20} />
        <input className="input" placeholder="Search questions & answers" value={term} onChange={(e) => setTerm(e.target.value)} type="search" />
      </div>
      <p className="muted" style={{ fontSize: ".85rem", margin: "10px 2px" }}>
        {items.length} question{items.length === 1 ? "" : "s"}
      </p>
      <div className="stack" style={{ gap: 8 }}>
        {items.map((q) => {
          const head = q.week !== last;
          last = q.week;
          return (
            <div key={q.id} style={{ display: "contents" }}>
              {head && (
                <div className="week-head">
                  <b>Week {q.week}</b>
                  <span className="muted" style={{ fontSize: ".82rem" }}>
                    {WEEK_TOPICS[q.week]}
                  </span>
                </div>
              )}
              <div className="qa">
                <p>
                  <span className="muted">{numberInWeek(q)}.</span> {hl(q.q)}
                </p>
                <div className="a">
                  <Icon name="check" size={18} />
                  <span>
                    {LETTERS[q.answer]}. {hl(q.options[q.answer])}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {!items.length && (
          <div className="empty">
            <Icon name="search" size={28} />
            Nothing matches “{term}”.
          </div>
        )}
      </div>
    </div>
  );
}
