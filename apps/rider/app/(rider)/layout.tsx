"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getProfileById, updateProfile } from "@repo/data-access/data/profiles";
import { DollarSign, History, Home, LogOut, Signal, User, WifiOff } from "lucide-react";
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
  const [isOnline, setIsOnline] = useState(true);
  const [activeDeliveryCount, setActiveDeliveryCount] = useState(0);

  // Network connectivity monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Active delivery count for badge on Deliveries tab
  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase || !userId) return;

    const fetchActiveCount = async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("rider_id", userId)
        .in("status", ["claimed_by_rider", "out_for_delivery", "near_customer"]);
      setActiveDeliveryCount(count || 0);
    };

    fetchActiveCount();

    // Subscribe to realtime changes for active count
    const channel = supabase
      .channel("active-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `rider_id=eq.${userId}`,
        },
        () => {
          fetchActiveCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Push notification registration
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

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
    <div
      className="min-h-screen flex flex-col"
      style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Connectivity Banner */}
      {!isOnline && (
        <div className="bg-red-500 text-white text-center text-xs py-1.5 flex items-center justify-center gap-1.5 font-medium">
          <WifiOff size={14} />
        </div>
      )}

      <header 
        className="bg-white border-b border-gray-100 px-4 pb-3 sticky top-0 z-30 shadow-sm"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 1rem)' }}
      >
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          {/* Logo / Title */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-brand-600">SFH Rider</span>
          </div>

          {/* Actions & Status */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={toggleAvailability}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shadow-sm ${
                online
                  ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="relative flex h-2.5 w-2.5">
                {online && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    online ? "bg-green-500" : "bg-gray-400"
                  }`}
                ></span>
              </span>
              {online ? "Online" : "Offline"}
            </button>

            <div className="flex items-center gap-3 border-l border-gray-200 pl-3 sm:pl-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-gray-800 leading-none">{riderName}</span>
                <div className="flex items-center gap-1 mt-1">
                  {isOnline ? (
                    <Signal size={12} className="text-green-500" />
                  ) : (
                    <WifiOff size={12} className="text-red-500" />
                  )}
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {isOnline ? "Connected" : "Offline"}
                  </span>
                </div>
              </div>

              {/* Mobile signal indicator (shown when name is hidden) */}
              <div className="sm:hidden flex items-center justify-center">
                {isOnline ? (
                  <Signal size={16} className="text-green-500" />
                ) : (
                  <WifiOff size={16} className="text-red-500" />
                )}
              </div>

              <button
                onClick={handleLogout}
                className="p-2 -mr-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                title="Logout"
              >
                <LogOut size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-30">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const showBadge = item.href === "/deliveries" && activeDeliveryCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 transition relative ${
                  isActive ? "text-brand-600 bg-brand-50" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <div className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none shadow-sm">
                      {activeDeliveryCount}
                    </span>
                  )}
                </div>
                <span className={`text-xs ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
