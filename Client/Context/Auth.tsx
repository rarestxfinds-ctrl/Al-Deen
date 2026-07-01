import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "Server/Integration/Supabase/client";

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
  ) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  signInAsDummy: () => Promise<{ error: Error | null }>;
}

const DUMMY_USER_KEY = "dummy-auth-user";
const LOCAL_SIGNUP_USER_KEY = "local-signup-user";
const LOCAL_PASSWORD_PREFIX = "local-auth-password:";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreLocalUser = useCallback(() => {
    try {
      const raw = localStorage.getItem(LOCAL_SIGNUP_USER_KEY) || localStorage.getItem(DUMMY_USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser(restoreLocalUser());
      setSession(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const releaseLoading = window.setTimeout(() => {
      if (mounted) {
        setUser((current) => current ?? restoreLocalUser());
        setIsLoading(false);
      }
    }, 2500);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setSession(session);
        if (session?.user) {
          try {
            localStorage.removeItem(DUMMY_USER_KEY);
            localStorage.removeItem(LOCAL_SIGNUP_USER_KEY);
          } catch { /* ignore */ }
          setUser(session.user);
        } else {
          setUser(restoreLocalUser());
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        setSession(session);
        setUser(session.user);
      } else {
        setUser(restoreLocalUser());
      }
      setIsLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setUser(restoreLocalUser());
      setSession(null);
      setIsLoading(false);
    }).finally(() => clearTimeout(releaseLoading));

    return () => {
      mounted = false;
      clearTimeout(releaseLoading);
      subscription.unsubscribe();
    };
  }, [restoreLocalUser]);

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
      localStorage.removeItem(LOCAL_SIGNUP_USER_KEY);
      localStorage.setItem(DUMMY_USER_KEY, JSON.stringify(dummy));
    } catch { /* ignore */ }
    setUser(dummy);
    setSession(null);
    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      if (!isSupabaseConfigured) {
        const raw = localStorage.getItem(LOCAL_SIGNUP_USER_KEY);
        const savedPassword = localStorage.getItem(`${LOCAL_PASSWORD_PREFIX}${email.toLowerCase()}`);
        if (!raw || savedPassword !== password) throw new Error("Invalid login credentials");
        const localUser = JSON.parse(raw) as User;
        setSession(null);
        setUser(localUser);
        return { error: null };
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      try {
        localStorage.removeItem(DUMMY_USER_KEY);
        localStorage.removeItem(LOCAL_SIGNUP_USER_KEY);
      } catch { /* ignore */ }
      setSession(data.session);
      setUser(data.user);
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
      if (!isSupabaseConfigured) {
        const localUser = {
          id: `local-${crypto.randomUUID?.() ?? Date.now()}`,
          email,
          user_metadata: {
            display_name: displayName || [extra?.first_name, extra?.last_name].filter(Boolean).join(" "),
            username: extra?.username,
            first_name: extra?.first_name,
            last_name: extra?.last_name,
          },
          app_metadata: { provider: "local" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as unknown as User;
        localStorage.setItem(LOCAL_SIGNUP_USER_KEY, JSON.stringify(localUser));
        localStorage.setItem(`${LOCAL_PASSWORD_PREFIX}${email.toLowerCase()}`, password);
        setSession(null);
        setUser(localUser);
        return { error: null, needsEmailConfirmation: false };
      }
      const { data, error } = await supabase.auth.signUp({
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

      if (data.session) {
        try {
          localStorage.removeItem(DUMMY_USER_KEY);
          localStorage.removeItem(LOCAL_SIGNUP_USER_KEY);
        } catch { /* ignore */ }
        await supabase.auth.setSession(data.session);
        setSession(data.session);
        setUser(data.session.user);
        return { error: null, needsEmailConfirmation: false };
      }

      if (data.user) {
        const localUser = data.user as User;
        try {
          localStorage.removeItem(DUMMY_USER_KEY);
          localStorage.setItem(LOCAL_SIGNUP_USER_KEY, JSON.stringify(localUser));
        } catch { /* ignore */ }
        setSession(null);
        setUser(localUser);
        return { error: null, needsEmailConfirmation: true };
      }

      const retry = await supabase.auth.signInWithPassword({ email, password });
      if (retry.error) throw retry.error;
      setSession(retry.data.session);
      setUser(retry.data.user);
      return { error: null, needsEmailConfirmation: false };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(DUMMY_USER_KEY);
      localStorage.removeItem(LOCAL_SIGNUP_USER_KEY);
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(LOCAL_PASSWORD_PREFIX)) localStorage.removeItem(key);
      });
    } catch { /* ignore */ }
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
