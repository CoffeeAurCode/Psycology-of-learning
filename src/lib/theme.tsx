import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { load, save } from "./storage";

export type ThemePref = "system" | "light" | "dark";

const Ctx = createContext<{ pref: ThemePref; setPref: (p: ThemePref) => void; resolved: "light" | "dark" }>({
  pref: "system",
  setPref: () => {},
  resolved: "dark",
});

const media = () => window.matchMedia("(prefers-color-scheme: dark)");

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => load<ThemePref>("pol.theme", "system"));
  const [systemDark, setSystemDark] = useState(() => media().matches);

  useEffect(() => {
    const m = media();
    const on = () => setSystemDark(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);

  const resolved = pref === "system" ? (systemDark ? "dark" : "light") : pref;

  useEffect(() => {
    const root = document.documentElement;
    if (pref === "system") delete root.dataset.theme;
    else root.dataset.theme = pref;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#0e0c0b" : "#f6f0e6");
  }, [pref, resolved]);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    save("pol.theme", p);
  };

  return <Ctx.Provider value={{ pref, setPref, resolved }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
