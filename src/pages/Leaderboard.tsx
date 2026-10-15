import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Icon } from "../components/Icon";
import { Loader, avatarColor, initials } from "../components/Ui";
import { CoffeeMug } from "../components/CoffeeMug";
import { useAuth } from "../lib/auth";
import { friendlyError, isConfigured, supabase } from "../lib/supabase";
import { fmtDuration } from "../lib/format";

type Row = {
  rank: number;
  user_id: string;
  display_name: string;
  score: number;
  total: number;
  duration_ms: number;
  attempts: number;
  submitted_at: string;
};

const MEDAL = ["var(--gold)", "var(--silver)", "var(--bronze)"];

export default function Leaderboard() {
  const { session } = useAuth();
  const me = session?.user.id;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [spin, setSpin] = useState(0);

  const fetchRows = useCallback(async () => {
    if (!isConfigured) return setErr("Leaderboard needs Supabase to be configured.");
    const { data, error } = await supabase.rpc("get_leaderboard", { p_limit: 200 });
    if (error) setErr(friendlyError(error));
    else {
      setErr(null);
      setRows(data as Row[]);
    }
  }, []);

  useEffect(() => {
    fetchRows();
    const onFocus = () => document.visibilityState === "visible" && fetchRows();
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [fetchRows]);

  const top = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];
  const mine = rows?.find((r) => r.user_id === me);

  return (
    <div>
      <div className="page-head row between" style={{ alignItems: "flex-end" }}>
        <div>
          <span className="caps">Leaderboard</span>
          <h1 className="display">Top brewers</h1>
          <p>Best attempt per player · score, then time</p>
        </div>
        <motion.button
          className="icon-btn"
          aria-label="Refresh"
          animate={{ rotate: spin * 360 }}
          transition={{ duration: 0.6 }}
          onClick={() => {
            setSpin((s) => s + 1);
            fetchRows();
          }}
        >
          <Icon name="flip" size={19} />
        </motion.button>
      </div>

      {err && <div className="banner">{err}</div>}
      {!rows && !err && <Loader label="Fetching the rankings…" />}

      {rows && rows.length === 0 && (
        <div className="card pad empty">
          <CoffeeMug size={96} />
          <b style={{ color: "var(--ink)" }}>No scores yet</b>
          The top spot is up for grabs.
          <Link to="/test" className="btn red">
            Take the first test
          </Link>
        </div>
      )}

      {top.length > 0 && (
        <div className="podium">
          {[top[1], top[0], top[2]].map((r, col) => {
            if (!r) return <div key={col} />;
            const place = r.rank;
            const h = place === 1 ? 118 : place === 2 ? 88 : 68;
            const color = MEDAL[Math.min(place, 3) - 1];
            return (
              <motion.div
                key={r.user_id}
                className={`pod ${place === 1 ? "first" : ""}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: [0.15, 0, 0.3][col], type: "spring", stiffness: 200, damping: 20 }}
              >
                <div className="avatar" style={{ background: avatarColor(r.display_name), outline: `3px solid ${color}` }}>
                  {place === 1 && (
                    <motion.img
                      className="crown"
                      src="/brand/badge-round.webp"
                      width={34}
                      height={34}
                      alt=""
                      initial={{ y: -10, rotate: -20, opacity: 0 }}
                      animate={{ y: 0, rotate: 0, opacity: 1 }}
                      transition={{ delay: 0.6, type: "spring" }}
                    />
                  )}
                  {initials(r.display_name)}
                </div>
                <div className="name">
                  {r.display_name}
                  {r.user_id === me && <span className="red"> (you)</span>}
                </div>
                <div className="sc tnum">
                  {r.score}/{r.total} · {fmtDuration(r.duration_ms)}
                </div>
                <motion.div
                  className="block"
                  style={{ background: color }}
                  initial={{ height: 0 }}
                  animate={{ height: h }}
                  transition={{ delay: 0.2 + [0.15, 0, 0.3][col], duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  {place}
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="stack" style={{ gap: 8 }}>
        {rest.map((r, i) => (
          <motion.div
            key={r.user_id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 12) * 0.035 + 0.3 }}
          >
            <LbRow r={r} me={r.user_id === me} />
          </motion.div>
        ))}
      </div>

      {mine && mine.rank > 3 && (
        <div className="me-pin">
          <LbRow r={mine} me />
        </div>
      )}

      {rows && session && !mine && rows.length > 0 && (
        <div className="card pad" style={{ marginTop: 14, textAlign: "center" }}>
          You're not on the board yet.{" "}
          <Link to="/test" className="red" style={{ fontWeight: 700 }}>
            Take a test →
          </Link>
        </div>
      )}
    </div>
  );
}

function LbRow({ r, me }: { r: Row; me: boolean }) {
  return (
    <div className={`lb-row ${me ? "me" : ""}`}>
      <span className="rk">{r.rank}</span>
      <span className="av" style={{ background: avatarColor(r.display_name) }}>
        {initials(r.display_name)}
      </span>
      <span className="nm">
        <b>
          {r.display_name}
          {me && <span className="red"> · you</span>}
        </b>
        <span>
          {r.attempts} attempt{r.attempts === 1 ? "" : "s"}
        </span>
      </span>
      <span className="pts">
        <b>
          {r.score}
          <span>/{r.total}</span>
        </b>
        <span className="tnum">{fmtDuration(r.duration_ms)}</span>
      </span>
    </div>
  );
}
