import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CoffeeMug } from "./CoffeeMug";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`wordmark ${className}`} aria-label="Coffee aur Code">
      <span className="w1">COFFEE</span>
      <span className="w2">AUR</span>
      <span className="w3">CODE</span>
    </div>
  );
}

export function Splash({ fading = false }: { fading?: boolean }) {
  return (
    <div className={`splash ${fading ? "fading" : ""}`} aria-hidden={fading}>
      <CoffeeMug size={120} filling edge="#f4eadb" />
      <Wordmark />
    </div>
  );
}

export function Loader({ label = "Brewing…" }: { label?: string }) {
  return (
    <div className="empty">
      <CoffeeMug size={84} filling />
      <span>{label}</span>
    </div>
  );
}

/** Bottom sheet (drag down or tap the scrim to close). */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="sheet"
            role="dialog"
            aria-modal="true"
            initial={{ y: "100%", x: "-50%" }}
            animate={{ y: 0, x: "-50%" }}
            exit={{ y: "100%", x: "-50%" }}
            transition={{ type: "spring", damping: 32, stiffness: 360 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => (info.offset.y > 110 || info.velocity.y > 600) && onClose()}
          >
            <div className="grab" />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button className="toggle" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className={`switch ${on ? "on" : ""}`} />
      {label}
    </button>
  );
}

/** Segmented control with a sliding pill. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  id: string;
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Count up to a number (for scores). */
export function CountUp({ to, duration = 1.1 }: { to: number; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{n}</>;
}

/** Circular progress ring that draws itself in. */
export function Ring({
  value,
  size = 190,
  stroke = 14,
  color = "#ef3a42",
  track = "rgba(244,234,219,.12)",
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, value))) }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      />
    </svg>
  );
}

/** Coffee beans + sparks bursting out (celebration). */
export function BeanBurst({ count = 26 }: { count?: number }) {
  const [parts] = useState(() =>
    Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const d = 110 + Math.random() * 120;
      return {
        x: Math.cos(a) * d,
        y: Math.sin(a) * d - 40,
        r: Math.random() * 540 - 270,
        kind: i % 3, // 0 bean, 1 red spark, 2 cream spark
        s: 0.7 + Math.random() * 0.6,
        delay: Math.random() * 0.15,
      };
    })
  );
  return (
    <div aria-hidden style={{ position: "absolute", left: "50%", top: "42%", pointerEvents: "none", zIndex: 2 }}>
      {parts.map((p, i) => (
        <motion.div
          key={i}
          style={{ position: "absolute" }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.3 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 120], opacity: [1, 1, 0], rotate: p.r, scale: p.s }}
          transition={{ duration: 1.6, delay: 0.5 + p.delay, ease: "easeOut" }}
        >
          {p.kind === 0 ? (
            <svg width="16" height="20" viewBox="0 0 16 20">
              <ellipse cx="8" cy="10" rx="7" ry="9.5" fill="#7a4220" />
              <path d="M8 1.5 C 4 7, 12 13, 8 18.5" stroke="#3a1e0c" strokeWidth="1.6" fill="none" />
            </svg>
          ) : (
            <span style={{ display: "block", width: 9, height: 9, borderRadius: 3, background: p.kind === 1 ? "#ef3a42" : "#f4eadb" }} />
          )}
        </motion.div>
      ))}
    </div>
  );
}

export function Toast({ msg }: { msg: string | null }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          className="toast"
          role="status"
          initial={{ opacity: 0, y: 20, x: "-50%", scale: 0.95 }}
          animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
          exit={{ opacity: 0, y: 10, x: "-50%" }}
        >
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2200);
    return () => clearTimeout(t);
  }, [msg]);
  return [msg, setMsg] as const;
}

/** Deterministic warm colour for a player's avatar. */
export function avatarColor(name: string) {
  const palette = ["#f4eadb", "#ef3a42", "#e8b36b", "#c9d6a3", "#9fc7d8", "#e6a2b4", "#d9c2f0", "#f2c879"];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

export const initials = (name: string) =>
  name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("") || "?";
