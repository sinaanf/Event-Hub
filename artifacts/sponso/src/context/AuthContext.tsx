import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type AuthUser = { id: string; email: string };

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
};

type AuthContextType = {
  session: AuthSession | null;
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = "sinoo_session";

function loadStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s: AuthSession = JSON.parse(raw);
    if (s.expires_at * 1000 < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(loadStoredSession);
  const [loading, setLoading] = useState(false);

  function saveSession(data: AuthSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    setSession(data);
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }

  const refreshToken = useCallback(async (rt: string) => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (res.ok) {
        saveSession(await res.json());
      } else {
        clearSession();
      }
    } catch {
      clearSession();
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    const msLeft = session.expires_at * 1000 - Date.now() - 60_000;
    if (msLeft <= 0) {
      refreshToken(session.refresh_token);
      return;
    }
    const timer = setTimeout(() => refreshToken(session.refresh_token), msLeft);
    return () => clearTimeout(timer);
  }, [session?.access_token, refreshToken]);

  async function signIn(email: string, password: string): Promise<string | null> {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Sign in failed";
      saveSession(data);
      return null;
    } catch {
      return "Network error. Please try again.";
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    if (session) {
      fetch("/api/auth/signout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => {});
    }
    clearSession();
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.access_token ?? null;
  } catch {
    return null;
  }
}
