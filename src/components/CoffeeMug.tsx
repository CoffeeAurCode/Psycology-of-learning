import { useId, type CSSProperties } from "react";

/**
 * The Coffee aur Code mug, redrawn as SVG so the steam can animate.
 * `filling` makes the coffee level pour up and down (used as the loader).
 */
export function CoffeeMug({
  size = 140,
  steam = true,
  filling = false,
  bob = false,
  edge,
  className = "",
}: {
  size?: number;
  steam?: boolean;
  filling?: boolean;
  bob?: boolean;
  /** outline colour; defaults to the theme (dark on light, cream on dark) */
  edge?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className={`${bob ? "mug-bob" : ""} ${className}`}
      width={size}
      height={size * 1.15}
      viewBox="0 0 200 230"
      role="img"
      aria-label="Steaming coffee mug"
      style={edge ? ({ "--mug-edge": edge } as CSSProperties) : undefined}
    >
      <defs>
        <linearGradient id={`coffee-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b5652b" />
          <stop offset="1" stopColor="#6e3514" />
        </linearGradient>
        <linearGradient id={`shine-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`cup-${id}`}>
          <ellipse cx="96" cy="104" rx="52" ry="10" />
        </clipPath>
      </defs>

      {/* shadow */}
      <ellipse cx="100" cy="214" rx="74" ry="9" fill="#000" opacity="0.22" />

      {/* steam */}
      {steam && (
        <g className="steam" fill="none" strokeLinecap="round">
          <path className="s1" d="M78 92 C 64 74, 92 64, 78 44 S 72 20, 84 8" stroke="var(--mug-edge)" strokeWidth="13" />
          <path className="s1" d="M78 92 C 64 74, 92 64, 78 44 S 72 20, 84 8" stroke="#e3262e" strokeWidth="8" />
          <path className="s2" d="M100 96 C 88 76, 116 66, 100 46 S 94 22, 108 4" stroke="var(--mug-edge)" strokeWidth="13" />
          <path className="s2" d="M100 96 C 88 76, 116 66, 100 46 S 94 22, 108 4" stroke="#f4eadb" strokeWidth="8" />
          <path className="s3" d="M120 92 C 110 76, 134 68, 120 50 S 116 30, 126 18" stroke="var(--mug-edge)" strokeWidth="12" />
          <path className="s3" d="M120 92 C 110 76, 134 68, 120 50 S 116 30, 126 18" stroke="#e3262e" strokeWidth="7" />
        </g>
      )}

      {/* handle */}
      <path d="M152 124 C 192 120, 194 184, 146 182" fill="none" stroke="var(--mug-edge)" strokeWidth="26" strokeLinecap="round" />
      <path d="M152 124 C 192 120, 194 184, 146 182" fill="none" stroke="#15110f" strokeWidth="18" strokeLinecap="round" />
      <path d="M154 130 C 180 130, 182 174, 150 174" fill="none" stroke="#f4eadb" strokeWidth="3" strokeLinecap="round" opacity="0.6" />

      {/* body */}
      <path
        d="M36 104 L 156 104 L 150 186 C 149 200, 138 208, 124 208 L 68 208 C 54 208, 43 200, 42 186 Z"
        fill="#15110f"
        stroke="var(--mug-edge)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M50 116 L 56 186 C 57 194, 62 198, 68 199" fill="none" stroke={`url(#shine-${id})`} strokeWidth="10" strokeLinecap="round" />

      {/* rim + coffee */}
      <ellipse cx="96" cy="104" rx="60" ry="14" fill="#15110f" stroke="var(--mug-edge)" strokeWidth="5" />
      <ellipse cx="96" cy="104" rx="60" ry="14" fill="none" stroke="#f4eadb" strokeWidth="2" opacity="0.35" />
      <g clipPath={`url(#cup-${id})`}>
        <rect className={filling ? "coffee-fill" : ""} x="40" y="92" width="112" height="24" fill={`url(#coffee-${id})`} />
        <ellipse cx="84" cy="101" rx="16" ry="3" fill="#e0a36a" opacity="0.35" />
      </g>

      {/* </> */}
      <g fill="none" stroke="#f4eadb" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M80 140 L 64 154 L 80 168" />
        <path d="M112 140 L 128 154 L 112 168" />
        <path d="M102 134 L 90 174" />
      </g>
    </svg>
  );
}
