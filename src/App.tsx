import { useEffect, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { AuthProvider, useAuth } from "./lib/auth";
import { ProgressProvider } from "./lib/progress";
import { ThemeProvider, useTheme } from "./lib/theme";
import { Icon, type IconName } from "./components/Icon";
import { Splash } from "./components/Ui";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Study from "./pages/Study";
import Test from "./pages/Test";
import Leaderboard from "./pages/Leaderboard";
import Account from "./pages/Account";

// `long` is the label on the laptop side rail
const TABS: { to: string; label: string; long: string; icon: IconName }[] = [
  { to: "/", label: "Home", long: "Home", icon: "home" },
  { to: "/study", label: "Study", long: "Flashcards", icon: "cards" },
  { to: "/test", label: "Test", long: "Practice test", icon: "timer" },
  { to: "/ranks", label: "Ranks", long: "Leaderboard", icon: "trophy" },
  { to: "/me", label: "Me", long: "My account", icon: "user" },
];

function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const { resolved, setPref } = useTheme();
  return (
    <motion.button
      className={withLabel ? "rail-theme" : "icon-btn"}
      whileTap={{ scale: 0.92 }}
      onClick={() => setPref(resolved === "dark" ? "light" : "dark")}
      aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} mode`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={resolved}
          style={{ display: "grid" }}
          initial={{ y: -14, opacity: 0, rotate: -60 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 14, opacity: 0, rotate: 60 }}
          transition={{ duration: 0.22 }}
        >
          <Icon name={resolved === "dark" ? "sun" : "moon"} size={20} />
        </motion.span>
      </AnimatePresence>
      {withLabel && <span>{resolved === "dark" ? "Light mode" : "Dark mode"}</span>}
    </motion.button>
  );
}

function TopBar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`topbar ${scrolled ? "scrolled" : ""}`}>
      <NavLink to="/" className="brand">
        <motion.img src="/brand/badge-round.webp" width={34} height={34} alt="" whileTap={{ rotate: -20, scale: 0.9 }} />
        <div>
          <div className="brand-title">Psychology of Learning</div>
          <div className="brand-sub">
            Coffee <b>aur</b> Code
          </div>
        </div>
      </NavLink>
      <div className="spacer" />
      <ThemeToggle />
    </header>
  );
}

function TabBar() {
  const { pathname } = useLocation();
  const { session } = useAuth();
  // the running test has its own bottom bar
  if (pathname.startsWith("/test/run")) return null;
  return (
    <nav className="tabbar" aria-label="Main">
      <NavLink to="/" className="rail-brand">
        <img src="/brand/badge-hex.webp" width={48} height={68} alt="Coffee aur Code" />
        <div>
          <div className="brand-title">Psychology of Learning</div>
          <div className="brand-sub">
            Coffee <b>aur</b> Code
          </div>
        </div>
      </NavLink>
      {TABS.map((t) => {
        const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
        return (
          <NavLink key={t.to} to={t.to} className={`tab ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
            {active && <motion.span layoutId="tab-pill" className="tab-pill" transition={{ type: "spring", stiffness: 520, damping: 40 }} />}
            <motion.span animate={{ y: active ? -1 : 0, scale: active ? 1.08 : 1 }} style={{ display: "grid" }}>
              <Icon name={t.icon} size={22} stroke={active ? 2.3 : 2} />
            </motion.span>
            <span className="tab-label short">{t.label}</span>
            <span className="tab-label long">{t.long}</span>
            {t.to === "/me" && !session && !active && <span className="tab-dot" />}
          </NavLink>
        );
      })}
      <div className="rail-foot">
        <ThemeToggle withLabel />
        <p>NPTEL · IIT Kharagpur · July 2026</p>
      </div>
    </nav>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  const key = location.pathname.split("/")[1] || "home";
  useEffect(() => {
    const t: Record<string, string> = {
      home: "Psychology of Learning NPTEL · Flashcards, Quiz & Practice Test",
      study: "Study flashcards · Psychology of Learning NPTEL",
      test: "Practice test · Psychology of Learning NPTEL",
      ranks: "Leaderboard · Psychology of Learning NPTEL",
      me: "Account · Psychology of Learning NPTEL",
    };
    document.title = t[key] ?? t.home;
  }, [key]);
  const width = key === "home" ? "page-wide" : key === "me" ? "page-xs" : "page-narrow";
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={key}
        className={width}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/study" element={<Study />} />
          <Route path="/test/*" element={<Test />} />
          <Route path="/ranks" element={<Leaderboard />} />
          <Route path="/me" element={<Account />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  );
}

// Splash only on the first load of a browser session, and never longer than needed.
const firstLoad = (() => {
  try {
    if (sessionStorage.getItem("pol.splashed")) return false;
    sessionStorage.setItem("pol.splashed", "1");
  } catch {
    /* ignore */
  }
  return true;
})();

function Shell() {
  const { ready } = useAuth();
  const { pathname } = useLocation();
  const running = pathname.startsWith("/test/run");
  const [phase, setPhase] = useState<"show" | "fade" | "gone">(firstLoad ? "show" : "gone");
  const [minDone, setMinDone] = useState(!firstLoad);
  useEffect(() => {
    if (!firstLoad) return;
    const t = setTimeout(() => setMinDone(true), 650);
    const cap = setTimeout(() => setPhase("gone"), 4000); // never block the app
    return () => {
      clearTimeout(t);
      clearTimeout(cap);
    };
  }, []);
  useEffect(() => {
    if (phase !== "show" || !(ready && minDone)) return;
    setPhase("fade");
    const t = setTimeout(() => setPhase("gone"), 450);
    return () => clearTimeout(t);
  }, [ready, minDone, phase]);
  return (
    <>
      {phase !== "gone" && <Splash fading={phase === "fade"} />}
      <div className={`shell ${running ? "no-rail" : ""}`}>
        <TopBar />
        <ErrorBoundary key={pathname}>
          <AnimatedRoutes />
        </ErrorBoundary>
      </div>
      <TabBar />
    </>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AuthProvider>
          <ProgressProvider>
            <BrowserRouter>
              <Shell />
            </BrowserRouter>
            {/* Vercel Web Analytics: cookieless page views (enabled in the Vercel dashboard) */}
            <Analytics />
          </ProgressProvider>
        </AuthProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
