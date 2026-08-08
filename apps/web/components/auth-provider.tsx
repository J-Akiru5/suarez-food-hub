"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getProfile } from "@repo/data-access/data/profiles";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  street_address: string;
  region_id: string;
  province_id: string;
  town_id: string;
  barangay_id: string;
  zip_code: string;
  role: string;
  avatar_url: string | null;
  rider_status: string;
  is_active: boolean;
}

interface AuthContextValue {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createBrowserTypedClient> | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchProfileRef = useRef<((userId: string) => Promise<void>) | null>(null);

  if (!supabaseRef.current && typeof window !== "undefined") {
    supabaseRef.current = createBrowserTypedClient();
  }

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;

    const fetchProfile = async (userId: string) => {
      // Prefer the server route: it returns every column (region/town/barangay
      // included) and avoids the browser client's CORS failure when the
      // Supabase project only allows the wildcard origin (credentials-mode
      // requests are blocked, so the direct REST call silently returns null).
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setProfile(json.data as Profile);
            return;
          }
        }
      } catch {
        // fall through to the browser client
      }
      const profile = await getProfile(supabase, userId);
      if (profile) setProfile(profile as Profile);
    };
    fetchProfileRef.current = fetchProfile;

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchProfile(user.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push("/");
    router.refresh();
  };

  // Re-fetch the profile after an in-page update (e.g. saving the delivery
  // address at checkout) so the UI reflects the saved values immediately.
  const refreshProfile = async () => {
    const supabase = supabaseRef.current;
    const fetchProfile = fetchProfileRef.current;
    if (!supabase || !user || !fetchProfile) return;
    await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
