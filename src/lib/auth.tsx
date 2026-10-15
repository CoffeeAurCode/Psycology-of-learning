import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isConfigured, supabase } from "./supabase";

export type Profile = { id: string; display_name: string };

type AuthState = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  ready: false,
  session: null,
  profile: null,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) return setProfile(null);
    const { data } = await supabase.from("profiles").select("id, display_name").eq("id", uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await fetchProfile(data.session?.user.id);
      if (alive) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // don't await inside the callback (supabase-js deadlock guidance)
      setTimeout(() => fetchProfile(s?.user.id), 0);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const value: AuthState = {
    ready,
    session,
    profile,
    refreshProfile: () => fetchProfile(session?.user.id),
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
