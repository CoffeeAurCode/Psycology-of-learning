import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "../components/Icon";
import { Segmented, Sheet, Toast, avatarColor, initials, useToast } from "../components/Ui";
import { useAuth } from "../lib/auth";
import { useProgress } from "../lib/progress";
import { useTheme, type ThemePref } from "../lib/theme";
import { friendlyError, isConfigured, supabase } from "../lib/supabase";
import { QUESTIONS } from "../data/questions";

// Supabase "Email OTP length" (Auth → Providers → Email). This project uses 8.
// Codes of 6–10 digits are accepted; we auto-submit once OTP_LENGTH digits are typed or pasted.
const OTP_LENGTH = Number(import.meta.env.VITE_OTP_LENGTH ?? 8);
const OTP_MIN = 6;
const OTP_MAX = 10;
const NAME_RE = /^[A-Za-z0-9_. -]{3,20}$/;

export default function Account() {
  const { session, profile, ready } = useAuth();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const next = params.get("next");

  // once fully set up, send them back where they came from
  useEffect(() => {
    if (session && profile && next) nav(next, { replace: true });
  }, [session, profile, next, nav]);

  if (!isConfigured)
    return (
      <div>
        <Head title="Account" sub="Sign-in is not configured" />
        <div className="banner">
          <Icon name="info" size={18} /> Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign-in.
        </div>
        <Preferences />
      </div>
    );

  if (!ready) return null;

  return (
    <AnimatePresence mode="wait">
      {!session ? (
        <motion.div key="signin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <SignIn />
        </motion.div>
      ) : !profile ? (
        <motion.div key="name" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ChooseName />
        </motion.div>
      ) : (
        <motion.div key="me" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Me />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Head({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="page-head">
      <span className="caps">Account</span>
      <h1 className="display">{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
  );
}

/* ---------------- Google, or email → one-time code ---------------- */
const OAUTH_ERROR_PARAMS = ["error", "error_code", "error_description"];

function SignIn() {
  const [params, setParams] = useSearchParams();
  const [step, setStep] = useState<"start" | "email" | "code">("start");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  // Supabase sends people back with ?error=… if they cancel on Google's screen
  const [err, setErr] = useState<string | null>(() => (params.has("error") ? "Google sign-in didn't finish. Please try again." : null));
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!OAUTH_ERROR_PARAMS.some((k) => params.has(k))) return;
    const p = new URLSearchParams(params);
    OAUTH_ERROR_PARAMS.forEach((k) => p.delete(k));
    setParams(p, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const google = async () => {
    setBusy(true);
    setErr(null);
    const next = params.get("next");
    const redirectTo = `${window.location.origin}/me${next ? `?next=${encodeURIComponent(next)}` : ""}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    // on success the browser is already leaving for Google, so stay "busy"
    if (error) {
      setBusy(false);
      setErr(friendlyError(error));
    }
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(em)) return setErr("Enter a valid email address.");
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithOtp({ email: em, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) return setErr(friendlyError(error));
    setEmail(em);
    setStep("code");
    setCooldown(60);
    setTimeout(() => codeRef.current?.focus(), 350);
  };

  const verify = async (token: string) => {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    setBusy(false);
    if (error) {
      setErr(friendlyError(error));
      setCode("");
    }
  };

  const onCode = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, OTP_MAX);
    setCode(digits);
    if (digits.length === OTP_LENGTH && !busy) verify(digits);
  };

  return (
    <div>
      <div className="auth-hero">
        <motion.img src="/brand/badge-hex.webp" width={128} height={180} alt="Coffee aur Code" initial={{ y: 20, opacity: 0, rotate: -6 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 16 }} />
      </div>
      <AnimatePresence mode="wait">
        {step === "start" ? (
          <motion.div key="start" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} className="stack">
            <SignInIntro />
            <button className="btn block" disabled={busy} onClick={google}>
              <GoogleLogo /> {busy ? "Opening Google…" : "Continue with Google"}
            </button>
            {err && <div className="err">{err}</div>}
            <button
              className="btn sm ghost block"
              disabled={busy}
              onClick={() => {
                setStep("email");
                setErr(null);
              }}
            >
              <Icon name="mail" size={16} /> Use email instead
            </button>
            <PrivacyNote />
          </motion.div>
        ) : step === "email" ? (
          <motion.form key="email" onSubmit={send} noValidate initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} className="stack">
            <SignInIntro />
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" className="input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            {err && <div className="err">{err}</div>}
            <button className="btn primary block" disabled={busy}>
              {busy ? "Sending…" : "Email me a code"} <Icon name="arrow" size={18} />
            </button>
            <p className="muted" style={{ fontSize: ".8rem", textAlign: "center", margin: 0 }}>
              No password needed. New here? This creates your account.
            </p>
            <button
              type="button"
              className="btn sm ghost block"
              onClick={() => {
                setStep("start");
                setErr(null);
              }}
            >
              <Icon name="left" size={16} /> Back to Google sign-in
            </button>
          </motion.form>
        ) : (
          <motion.div key="code" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} className="stack">
            <div style={{ textAlign: "center" }}>
              <h1 className="display" style={{ fontSize: "1.8rem", margin: "8px 0 6px" }}>
                Check your inbox
              </h1>
              <p className="muted" style={{ margin: 0 }}>
                We sent a {OTP_LENGTH}-digit code to <b style={{ color: "var(--ink)" }}>{email}</b>
              </p>
            </div>
            <div className="field">
              <label htmlFor="code" className="sr-only">
                Code
              </label>
              <input
                ref={codeRef}
                id="code"
                className="input otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={"•".repeat(OTP_LENGTH)}
                value={code}
                onChange={(e) => onCode(e.target.value)}
                maxLength={OTP_MAX}
              />
            </div>
            {err && <div className="err">{err}</div>}
            <button className="btn primary block" disabled={busy || code.length < OTP_MIN} onClick={() => verify(code)}>
              {busy ? "Checking…" : "Verify & sign in"}
            </button>
            <div className="row between">
              <button
                className="btn sm ghost"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setErr(null);
                }}
              >
                <Icon name="left" size={16} /> Change email
              </button>
              <button className="btn sm ghost" disabled={cooldown > 0 || busy} onClick={() => send()}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
            <p className="muted" style={{ fontSize: ".8rem", textAlign: "center", margin: 0 }}>
              Can't find it? Check spam or promotions.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <Preferences />
    </div>
  );
}

/* ---------------- display name ---------------- */
function NameForm({ initial = "", onDone, cta }: { initial?: string; onDone: () => void; cta: string }) {
  const { session, refreshProfile } = useAuth();
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim().replace(/\s+/g, " ");
    if (!NAME_RE.test(n)) return setErr("3–20 characters: letters, numbers, spaces, . _ -");
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("profiles").upsert({ id: session!.user.id, display_name: n });
    setBusy(false);
    if (error) return setErr(friendlyError(error));
    await refreshProfile();
    onDone();
  };

  return (
    <form onSubmit={submit} className="stack">
      <div className="field">
        <label htmlFor="dn">Leaderboard name</label>
        <input id="dn" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="e.g. Espresso Ananya" autoFocus autoComplete="nickname" />
        <span className="muted" style={{ fontSize: ".8rem" }}>
          Shown publicly on the leaderboard. Your email is never shown.
        </span>
      </div>
      {err && <div className="err">{err}</div>}
      <button className="btn primary block" disabled={busy}>
        {busy ? "Saving…" : cta}
      </button>
    </form>
  );
}

function ChooseName() {
  const { signOut } = useAuth();
  return (
    <div>
      <div className="auth-hero">
        <motion.img src="/brand/mascot.webp" width={120} height={131} alt="" style={{ width: 120 }} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 240, damping: 14 }} />
      </div>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h1 className="display" style={{ fontSize: "1.8rem", margin: "8px 0 6px" }}>
          You're in! ☕
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          Pick the name other students will see on the leaderboard.
        </p>
      </div>
      <NameForm onDone={() => {}} cta="Let's go" />
      <button className="btn ghost block" style={{ marginTop: 8 }} onClick={signOut}>
        Use a different account
      </button>
    </div>
  );
}

/* ---------------- signed-in profile ---------------- */
function Me() {
  const { session, profile, signOut } = useAuth();
  const { knownCount, reset } = useProgress();
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [toast, setToast] = useToast();
  // can briefly render during the sign-out transition, after the profile is cleared
  if (!session || !profile) return null;
  const name = profile.display_name;

  return (
    <div>
      <Head title="Your account" />
      <div className="card pad row" style={{ gap: 14 }}>
        <motion.div
          className="av"
          style={{ width: 60, height: 60, borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: 900, fontSize: "1.4rem", color: "#120f0e", background: avatarColor(name), flex: "none" }}
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
        >
          {initials(name)}
        </motion.div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "1.15rem", fontStretch: "112%" }}>{name}</div>
          <div className="muted" style={{ fontSize: ".85rem", overflow: "hidden", textOverflow: "ellipsis" }}>
            {session.user.email}
          </div>
          <div className="muted" style={{ fontSize: ".8rem", marginTop: 2 }}>
            {knownCount}/{QUESTIONS.length} cards mastered · synced
          </div>
        </div>
        <button className="icon-btn" onClick={() => setEditOpen(true)} aria-label="Edit name">
          <Icon name="edit" size={19} />
        </button>
      </div>

      <Preferences />

      <div className="section-title">
        <h2>Data</h2>
      </div>
      <div className="card">
        <button className="list-row" onClick={() => setResetOpen(true)}>
          <Icon name="trash" />
          <span className="grow">
            Reset flashcard progress
            <small>Clears “Got it / Again” marks on all devices</small>
          </span>
        </button>
        <div className="list-row">
          <Icon name="lock" />
          <span className="grow">
            What we store
            <small>
              Your email, leaderboard name, test scores &amp; times, and which flashcards you marked. With Google sign-in, also the name and photo Google shares. No password, no phone, no location.
            </small>
          </span>
        </div>
        <button className="list-row" onClick={signOut}>
          <Icon name="logout" />
          <span className="grow">Sign out</span>
        </button>
      </div>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)}>
        <h3>Change your name</h3>
        <NameForm
          initial={name}
          cta="Save name"
          onDone={() => {
            setEditOpen(false);
            setToast("Name updated");
          }}
        />
      </Sheet>
      <Sheet open={resetOpen} onClose={() => setResetOpen(false)}>
        <h3>Reset all flashcard progress?</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Your {knownCount} mastered cards go back to unseen. Test scores and leaderboard stay.
        </p>
        <div className="stack">
          <button
            className="btn red block"
            onClick={async () => {
              await reset();
              setResetOpen(false);
              setToast("Progress reset");
            }}
          >
            Reset progress
          </button>
          <button className="btn block" onClick={() => setResetOpen(false)}>
            Cancel
          </button>
        </div>
      </Sheet>
      <Toast msg={toast} />
    </div>
  );
}

function SignInIntro() {
  return (
    <div style={{ textAlign: "center" }}>
      <h1 className="display" style={{ fontSize: "1.8rem", margin: "8px 0 6px" }}>
        Pull up a chair
      </h1>
      <p className="muted" style={{ margin: 0 }}>
        Sign in to save progress, take ranked tests and get on the leaderboard.
      </p>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

function PrivacyNote() {
  return (
    <p className="muted" style={{ fontSize: ".75rem", textAlign: "center", margin: 0 }}>
      We store only your email, leaderboard name, test scores and flashcard progress. Your email is never shown to others.
    </p>
  );
}

function Preferences() {
  const { pref, setPref } = useTheme();
  return (
    <>
      <div className="section-title">
        <h2>Appearance</h2>
      </div>
      <Segmented<ThemePref>
        id="theme"
        value={pref}
        onChange={setPref}
        options={[
          { value: "system", label: <><Icon name="monitor" size={17} /> Auto</> },
          { value: "light", label: <><Icon name="sun" size={17} /> Light</> },
          { value: "dark", label: <><Icon name="moon" size={17} /> Dark</> },
        ]}
      />
    </>
  );
}
