import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "Server/Integration/Supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    extra?: { username?: string; first_name?: string; last_name?: string }
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInAsDummy: () => Promise<{ error: Error | null }>;
}

const DUMMY_USER_KEY = "dummy-auth-user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
      } else {
        // Restore dummy user if present
        try {
          const raw = localStorage.getItem(DUMMY_USER_KEY);
          if (raw) setUser(JSON.parse(raw) as User);
        } catch { /* ignore */ }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInAsDummy = useCallback(async () => {
    const dummy = {
      id: "dummy-user-0000",
      email: "guest@local.app",
      user_metadata: { display_name: "Guest" },
      app_metadata: { provider: "dummy" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as unknown as User;
    try {
      localStorage.setItem(DUMMY_USER_KEY, JSON.stringify(dummy));
    } catch { /* ignore */ }
    setUser(dummy);
    setSession(null);
    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    displayName: string,
    extra?: { username?: string; first_name?: string; last_name?: string }
  ) => {
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            display_name: displayName || [extra?.first_name, extra?.last_name].filter(Boolean).join(" "),
            username: extra?.username,
            first_name: extra?.first_name,
            last_name: extra?.last_name,
          },
        },
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try { localStorage.removeItem(DUMMY_USER_KEY); } catch { /* ignore */ }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const value = useMemo(() => ({
    user, session, isLoading, signIn, signUp, signOut, signInAsDummy,
  }), [user, session, isLoading, signIn, signUp, signOut, signInAsDummy]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
