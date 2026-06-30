"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getProfile } from "@repo/data-access/data/profiles";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";

interface Profile {
  id: string;
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
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createBrowserTypedClient> | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  if (!supabaseRef.current && typeof window !== "undefined") {
    supabaseRef.current = createBrowserTypedClient();
  }

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;

    const fetchProfile = async (userId: string) => {
      const profile = await getProfile(supabase, userId);
      if (profile) setProfile(profile as Profile);
    };

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

  return <AuthContext.Provider value={{ user, profile, loading, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
