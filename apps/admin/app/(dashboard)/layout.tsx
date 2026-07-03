"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getProfileById } from "@repo/data-access/data/profiles";
import { ToastProvider } from "@repo/ui";
import {
  Bell,
  Bike,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Shield,
  Tag,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/toaster";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/riders", label: "Riders", icon: Bike },
  { href: "/staff", label: "Staff", icon: UserPlus },
  { href: "/cashouts", label: "Cashouts", icon: DollarSign },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

const badgePaths = [
  { href: "/orders", statusFilter: "pending", table: "orders" as const, countColumn: "id" as const },
  { href: "/cashouts", statusFilter: "requested", table: "rider_cashouts" as const, countColumn: "id" as const },
  { href: "/riders", statusFilter: "pending_approval", table: "profiles" as const, countColumn: "id" as const },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createBrowserTypedClient> | null>(null);
  if (!supabaseRef.current && typeof window !== "undefined") {
    supabaseRef.current = createBrowserTypedClient();
  }

  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<{ first_name: string; last_name: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notifOpen]);

  const totalNotifs = (badgeCounts["/orders"] || 0) + (badgeCounts["/cashouts"] || 0) + (badgeCounts["/riders"] || 0);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        getProfileById(supabase, data.user.id).then((p) => {
          if (p) setProfile({ first_name: p.first_name, last_name: p.last_name });
        });
      }
    });
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      for (const bp of badgePaths) {
        if (bp.table === "orders") {
          const { count } = await supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("status", bp.statusFilter);
          counts[bp.href] = count || 0;
        } else if (bp.table === "rider_cashouts") {
          const { count } = await supabase
            .from("rider_cashouts")
            .select("*", { count: "exact", head: true })
            .eq("status", bp.statusFilter);
          counts[bp.href] = count || 0;
        } else if (bp.table === "profiles") {
          const { count } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "rider")
            .eq("rider_status", bp.statusFilter);
          counts[bp.href] = count || 0;
        }
      }
      setBadgeCounts(counts);
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleLogout = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  const initials = profile ? `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() : "A";

  const isActiveLink = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <ToastProvider>
      <div className="h-dvh bg-gray-50 flex overflow-hidden">
        <aside
          className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
            sidebarOpen ? "w-64" : "w-20"
          } print:hidden`}
        >
          <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-200">
            <div className="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-brand-500 text-sm font-display truncate">SFH Admin</h1>
                <p className="text-[10px] text-muted-foreground truncate">Management</p>
              </div>
            )}
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = isActiveLink(item.href);
              const Icon = item.icon;
              const badgeCount = badgeCounts[item.href];

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                    isActive
                      ? "bg-brand-500 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  } ${!sidebarOpen ? "justify-center" : ""}`}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                  {badgeCount > 0 && (
                    <span
                      className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold ${
                        isActive ? "text-brand-600 bg-white shadow-sm" : "text-white bg-brand-500"
                      } ${!sidebarOpen ? "absolute -top-1 -right-1" : "ml-auto"}`}
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors ${
                !sidebarOpen ? "justify-center" : ""
              }`}
              title={!sidebarOpen ? "Sign Out" : undefined}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>Sign Out</span>}
            </button>
          </div>

          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="absolute -right-3 top-20 h-6 w-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 shadow-sm hidden lg:flex"
          >
            {sidebarOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="font-bold text-brand-500 text-sm font-display">SFH Admin</h1>
                    <p className="text-[10px] text-muted-foreground">Management</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = isActiveLink(item.href);
                  const Icon = item.icon;
                  const badgeCount = badgeCounts[item.href];

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-500 text-white shadow-md"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{item.label}</span>
                      {badgeCount > 0 && (
                        <span
                          className={`ml-auto inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold ${
                            isActive ? "text-brand-600 bg-white shadow-sm" : "text-white bg-brand-500"
                          }`}
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="px-3 py-4 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-16 flex items-center px-4 gap-4 shadow-sm safe-top print:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex-1" />

            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <Bell className="h-5 w-5 text-gray-600" />
                {totalNotifs > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-brand-500 rounded-full" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="font-bold text-sm">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {totalNotifs > 0 ? (
                      <>
                        {(badgeCounts["/orders"] || 0) > 0 && (
                          <Link href="/orders" onClick={() => setNotifOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                              <ClipboardList className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">New Orders</p>
                              <p className="text-xs text-muted-foreground truncate">{badgeCounts["/orders"]} pending order{(badgeCounts["/orders"] || 0) !== 1 ? 's' : ''}</p>
                            </div>
                          </Link>
                        )}
                        {(badgeCounts["/riders"] || 0) > 0 && (
                          <Link href="/riders" onClick={() => setNotifOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                              <Bike className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">Rider Applications</p>
                              <p className="text-xs text-muted-foreground truncate">{badgeCounts["/riders"]} pending approval</p>
                            </div>
                          </Link>
                        )}
                        {(badgeCounts["/cashouts"] || 0) > 0 && (
                          <Link href="/cashouts" onClick={() => setNotifOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                              <DollarSign className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">Cashout Requests</p>
                              <p className="text-xs text-muted-foreground truncate">{badgeCounts["/cashouts"]} pending request{(badgeCounts["/cashouts"] || 0) !== 1 ? 's' : ''}</p>
                            </div>
                          </Link>
                        )}
                      </>
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No new notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {profile ? `${profile.first_name} ${profile.last_name}` : "Admin"}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
        </div>
      </div>
      <Toaster />
    </ToastProvider>
  );
}
