import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";

const STORAGE_KEY = "lovable-admin-session";

interface AdminContextType {
  isAdmin: boolean;
  signIn: (username: string, password: string) => { ok: boolean; error?: string };
  signOut: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      setIsAdmin(localStorage.getItem(STORAGE_KEY) === "1");
    } catch { /* ignore */ }
  }, []);

  const signIn = useCallback((username: string, password: string) => {
    if (username === "admin" && password === "admin") {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
      setIsAdmin(true);
      return { ok: true };
    }
    return { ok: false, error: "Invalid credentials" };
  }, []);

  const signOut = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setIsAdmin(false);
  }, []);

  const value = useMemo(() => ({ isAdmin, signIn, signOut }), [isAdmin, signIn, signOut]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}