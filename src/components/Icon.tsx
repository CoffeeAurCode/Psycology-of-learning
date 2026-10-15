// Small stroke icon set (24×24, 2px), hand-drawn to stay dependency-free.
const P: Record<string, string[]> = {
  home: ["M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"],
  cards: ["M4 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z", "M8 3h11a2 2 0 0 1 2 2v12"],
  timer: ["M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M12 9v4l2.5 2", "M9 2h6"],
  trophy: ["M8 21h8", "M12 17v4", "M7 4h10v5a5 5 0 0 1-10 0z", "M17 5h3v2a3 3 0 0 1-3 3", "M7 5H4v2a3 3 0 0 0 3 3"],
  user: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"],
  shuffle: ["M16 3h5v5", "M4 20 21 3", "M21 16v5h-5", "M15 15l6 6", "M4 4l5 5"],
  check: ["M5 12.5l4.5 4.5L19 7"],
  x: ["M6 6l12 12", "M18 6 6 18"],
  flip: ["M3 12a9 9 0 0 1 15.5-6.3L21 8", "M21 3v5h-5", "M21 12a9 9 0 0 1-15.5 6.3L3 16", "M3 21v-5h5"],
  left: ["M15 18l-6-6 6-6"],
  right: ["M9 6l6 6-6 6"],
  grid: ["M4 4h6v6H4z", "M14 4h6v6h-6z", "M4 14h6v6H4z", "M14 14h6v6h-6z"],
  flag: ["M5 21V4", "M5 4h11l-2 4 2 4H5"],
  sun: ["M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M12 2v2", "M12 20v2", "M4.9 4.9l1.4 1.4", "M17.7 17.7l1.4 1.4", "M2 12h2", "M20 12h2", "M4.9 19.1l1.4-1.4", "M17.7 6.3l1.4-1.4"],
  moon: ["M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"],
  monitor: ["M3 5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z", "M8 20h8", "M12 16v4"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M20 20l-3.5-3.5"],
  logout: ["M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4", "M10 17l5-5-5-5", "M15 12H3"],
  mail: ["M3 6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z", "M3 7l9 6 9-6"],
  list: ["M8 6h13", "M8 12h13", "M8 18h13", "M3.5 6h.01", "M3.5 12h.01", "M3.5 18h.01"],
  bolt: ["M13 2 4 14h7l-1 8 9-12h-7z"],
  clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3 2"],
  target: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M12 12h.01"],
  arrow: ["M5 12h14", "M13 6l6 6-6 6"],
  sparkle: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", "M19 17l.6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6z"],
  undo: ["M9 14 4 9l5-5", "M4 9h11a5 5 0 0 1 0 10h-3"],
  trash: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13", "M9 7V4h6v3"],
  edit: ["M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z", "M13.5 6.5l4 4"],
  lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4"],
  info: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 11v5", "M12 8h.01"],
  coffee: ["M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z", "M17 11h1.5a2.5 2.5 0 0 1 0 5H17", "M8 2.5c-.8 1 .8 2 0 3", "M12 2.5c-.8 1 .8 2 0 3"],
  medal: ["M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12z", "M8.5 10 6 3h4l2 4", "M15.5 10 18 3h-4l-2 4"],
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, stroke = 2, className }: { name: IconName; size?: number; stroke?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {P[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
