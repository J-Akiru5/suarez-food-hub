"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getProfileById, updateProfile } from "@repo/data-access/data/profiles";
import { DollarSign, History, Home, LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/deliveries", label: "Deliveries", icon: History },
  { href: "/earnings", label: "Earnings", icon: DollarSign },
  { href: "/profile", label: "Profile", icon: User },
];

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createBrowserTypedClient> | null>(null);
  if (!supabaseRef.current && typeof window !== "undefined") {
    supabaseRef.current = createBrowserTypedClient();
  }
  const [riderName, setRiderName] = useState("Rider");
  const [online, setOnline] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const data = await getProfileById(supabase, user.id);
        if (data) {
          setRiderName(data.first_name || data.last_name || "Rider");
          setOnline(data.is_active ?? false);
        }
      }
    };
    fetchProfile();
  }, []);

  const toggleAvailability = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase || !userId) return;
    const next = !online;
    setOnline(next);
    await updateProfile(supabase, userId, { is_active: next });
  }, [online, userId]);

  const handleLogout = async () => {
    if (online) {
      const supabase = supabaseRef.current;
      if (supabase && userId) {
        await updateProfile(supabase, userId, { is_active: false });
      }
    }
    const supabase = supabaseRef.current;
    if (!supabase) return;
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <header className="bg-white border-b border-gray-200 px-4 py-3 safe-top sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAvailability}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                online ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-gray-400"}`} />
              {online ? "Online" : "Offline"}
            </button>
            <span className="text-lg font-bold text-brand-600">SFH Rider</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{riderName}</span>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-brand-50 rounded-full transition text-brand-600"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-30">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 transition ${
                  isActive ? "text-brand-600 bg-brand-50" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-xs ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
