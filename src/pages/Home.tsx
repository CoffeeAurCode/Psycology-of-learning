import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { CoffeeMug } from "../components/CoffeeMug";
import { Icon } from "../components/Icon";
import { useAuth } from "../lib/auth";
import { useProgress } from "../lib/progress";
import { supabase } from "../lib/supabase";
import { fmtDuration, greeting } from "../lib/format";
import { QUESTIONS, TEST_SIZE, WEEKS, WEEK_TOPICS } from "../data/questions";

type Stats = { best_score: number | null; best_total: number | null; best_duration: number | null; rank: number | null; attempts: number; players: number };

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } } };

export default function Home() {
  const { session, profile } = useAuth();
  const { marks, knownCount } = useProgress();
  const nav = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!session) return setStats(null);
    supabase.rpc("get_my_stats").then(({ data }) => data && setStats(data as Stats));
  }, [session]);

  const perWeek = useMemo(
    () =>
      WEEKS.map((w) => {
        const qs = QUESTIONS.filter((q) => q.week === w);
        const known = qs.filter((q) => marks[q.id]?.s === "known").length;
        return { w, total: qs.length, known };
      }),
    [marks]
  );

  const pct = Math.round((knownCount / QUESTIONS.length) * 100);
  const name = profile?.display_name?.split(" ")[0];

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <div className="home-top">
      <motion.section variants={item} className="hero" style={{ marginTop: 6 }}>
        <p className="hi">
          {greeting()}
          {name ? `, ${name}` : ""} ☕
        </p>
        <h1 className="display">
          Brew your <em>exam prep</em>.
        </h1>
        <p>All {QUESTIONS.length} assignment questions. Swipe, test, climb the ranks.</p>
        <motion.div whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
          <Link to="/study" className="btn primary">
            {knownCount ? "Continue studying" : "Start studying"} <Icon name="arrow" size={18} className="arrow" />
          </Link>
        </motion.div>
        <div className="mug-slot">
          <CoffeeMug size={150} bob edge="#f4eadb" />
        </div>
      </motion.section>

      <motion.div variants={item} className="stats">
        <div className="stat">
          <div className="v tnum">
            {knownCount}
            <small>/{QUESTIONS.length}</small>
          </div>
          <div className="k">Cards mastered</div>
          <div className="bar good" style={{ marginTop: 8, height: 5 }}>
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="stat">
          <div className="v tnum">
            {stats?.best_score ?? "–"}
            {stats?.best_score != null && <small>/{stats.best_total}</small>}
          </div>
          <div className="k">Best score</div>
          <div className="k tnum" style={{ marginTop: 2 }}>
            {stats?.best_duration != null ? `in ${fmtDuration(stats.best_duration)}` : " "}
          </div>
        </div>
        <div className="stat">
          <div className="v tnum">{stats?.rank ? `#${stats.rank}` : "–"}</div>
          <div className="k">Rank</div>
          <div className="k" style={{ marginTop: 2 }}>
            {stats?.players ? `of ${stats.players}` : " "}
          </div>
        </div>
      </motion.div>
      </div>

      <motion.div variants={item} className="section-title">
        <h2>Jump in</h2>
      </motion.div>
      <motion.div variants={item} className="quick">
        <motion.div whileTap={{ scale: 0.97 }}>
          <Link to="/test" className="red">
            <div className="q-ico">
              <Icon name="timer" />
            </div>
            <b>Practice test</b>
            <span>{TEST_SIZE} random questions, timed &amp; ranked</span>
          </Link>
        </motion.div>
        <motion.div whileTap={{ scale: 0.97 }}>
          <Link to="/ranks">
            <div className="q-ico">
              <Icon name="trophy" />
            </div>
            <b>Leaderboard</b>
            <span>Score first, then fastest time</span>
          </Link>
        </motion.div>
      </motion.div>

      <motion.div variants={item} className="section-title">
        <h2>Weeks</h2>
        <span className="caps">{WEEKS.length} weeks · tap to study</span>
      </motion.div>
      <motion.div variants={item} className="weeks">
        {perWeek.map(({ w, total, known }) => (
          <motion.button
            key={w}
            className={`week-tile ${known === total ? "done" : ""}`}
            whileTap={{ scale: 0.96 }}
            onClick={() => nav(`/study?week=${w}`)}
          >
            <div className="wk">
              <b>Week {w}</b>
              <span className="tnum">
                {known}/{total}
              </span>
            </div>
            <div className="topic">{WEEK_TOPICS[w]}</div>
            <div className="bar good" style={{ height: 5 }}>
              <span style={{ width: `${(known / total) * 100}%` }} />
            </div>
          </motion.button>
        ))}
      </motion.div>

      <p className="footer-note">
        Questions from the NPTEL “Psychology of Learning” assignments (IIT Kharagpur, July 2026).
        <br />
        Made with ☕ by Coffee aur Code
      </p>
    </motion.div>
  );
}
