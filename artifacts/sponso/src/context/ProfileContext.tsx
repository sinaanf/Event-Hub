import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { getAccessToken } from "@/context/AuthContext";

export type UserRole = "organiser" | "salesperson";

export type UserProfile = {
  id: string | null;
  user_role: UserRole;
  user_name: string | null;
};

type ProfileContextType = {
  profile: UserProfile;
  effectiveRole: UserRole;
  loading: boolean;
  toggleViewAs: () => void;
  refetch: () => Promise<void>;
};

const DEFAULT_PROFILE: UserProfile = {
  id: null,
  user_role: "salesperson",
  user_name: null,
};

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [viewOverride, setViewOverride] = useState<UserRole | null>(null);

  async function fetchProfile() {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setProfile({
            id: data.id ?? null,
            user_role: data.user_role === "organiser" ? "organiser" : "salesperson",
            user_name: data.user_name ?? null,
          });
          setViewOverride(null);
        }
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (session) {
      setLoading(true);
      fetchProfile();
    } else {
      setProfile(DEFAULT_PROFILE);
      setViewOverride(null);
      setLoading(false);
    }
  }, [session?.access_token]);

  function toggleViewAs() {
    const base = viewOverride ?? profile.user_role;
    setViewOverride(base === "organiser" ? "salesperson" : "organiser");
  }

  const effectiveRole: UserRole = viewOverride ?? profile.user_role;

  return (
    <ProfileContext.Provider
      value={{ profile, effectiveRole, loading, toggleViewAs, refetch: fetchProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}
