import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import { load, save } from "./storage";
import { supabase } from "./supabase";

export type Mark = "known" | "again";
type Entry = { s: Mark; t: number };
type Marks = Record<number, Entry>;

type ProgressState = {
  marks: Marks;
  mark: (id: number, s: Mark) => void;
  reset: () => Promise<void>;
  knownCount: number;
};

const Ctx = createContext<ProgressState>({ marks: {}, mark: () => {}, reset: async () => {}, knownCount: 0 });
const KEY = "pol.marks";

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [marks, setMarks] = useState<Marks>(() => load<Marks>(KEY, {}));

  useEffect(() => {
    save(KEY, marks);
  }, [marks]);

  // On sign-in: merge cloud and local progress (newest wins), then push local-only changes up.
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    (async () => {
      const { data, error } = await supabase.from("card_progress").select("question_id, status, updated_at");
      if (error || !alive) return;
      const local = load<Marks>(KEY, {});
      const merged: Marks = { ...local };
      for (const r of data as { question_id: number; status: Mark; updated_at: string }[]) {
        const t = Date.parse(r.updated_at);
        if (!merged[r.question_id] || merged[r.question_id].t < t) merged[r.question_id] = { s: r.status, t };
      }
      const remoteT = new Map((data as { question_id: number; updated_at: string }[]).map((r) => [r.question_id, Date.parse(r.updated_at)]));
      const push = Object.entries(local)
        .filter(([id, e]) => (remoteT.get(+id) ?? 0) < e.t)
        .map(([id, e]) => ({ user_id: uid, question_id: +id, status: e.s, updated_at: new Date(e.t).toISOString() }));
      if (push.length) await supabase.from("card_progress").upsert(push);
      if (alive) setMarks(merged);
    })();
    return () => {
      alive = false;
    };
  }, [uid]);

  const mark = useCallback(
    (id: number, s: Mark) => {
      const t = Date.now();
      setMarks((m) => ({ ...m, [id]: { s, t } }));
      if (uid)
        supabase
          .from("card_progress")
          .upsert({ user_id: uid, question_id: id, status: s, updated_at: new Date(t).toISOString() })
          .then(() => {});
    },
    [uid]
  );

  const reset = useCallback(async () => {
    setMarks({});
    if (uid) await supabase.from("card_progress").delete().eq("user_id", uid);
  }, [uid]);

  const knownCount = useMemo(() => Object.values(marks).filter((e) => e.s === "known").length, [marks]);

  return <Ctx.Provider value={{ marks, mark, reset, knownCount }}>{children}</Ctx.Provider>;
}

export const useProgress = () => useContext(Ctx);
