"use client";

import { cn } from "@repo/utils";
import { Bell, ChevronDown, LogOut, Package, ShoppingCart, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useAuth } from "./auth-provider";

export interface AuthNavbarProps {
  showCartIcon?: boolean;
  cartItemCount?: number;
  onCartClick?: () => void;
  className?: string;
  kioskMode?: boolean;
}

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/menu" },
  { label: "How to Order", href: "/how-to-order" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const AuthNavbar = React.forwardRef<HTMLElement, AuthNavbarProps>(
  ({ showCartIcon = true, cartItemCount = 0, onCartClick, className, kioskMode }, ref) => {
    const { user, profile, loading, signOut } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Notification state
    const [notifOpen, setNotifOpen] = React.useState(false);
    const [notifications, setNotifications] = React.useState<any[]>([]);
    const notifRef = React.useRef<HTMLDivElement>(null);
    const supabaseRef = React.useRef<any>(null);

    // Close notification dropdown on outside click
    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
          setNotifOpen(false);
        }
      };
      if (notifOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [notifOpen]);

    // Fetch notifications
    const fetchNotifications = React.useCallback(async () => {
      if (!supabaseRef.current || !user) return;
      const { data } = await supabaseRef.current
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setNotifications(data);
    }, [user]);

    // Lazy-load createBrowserTypedClient on mount
    React.useEffect(() => {
      if (typeof window === "undefined") return;
      import("@repo/data-access/client").then((mod) => {
        supabaseRef.current = mod.createBrowserTypedClient();
      });
    }, []);

    // Fetch notifications & poll
    React.useEffect(() => {
      if (!user) return;
      const timer = setTimeout(() => fetchNotifications(), 500);
      const interval = setInterval(fetchNotifications, 15000);
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }, [user, fetchNotifications]);

    // Realtime subscription for new notifications
    React.useEffect(() => {
      if (!supabaseRef.current || !user) return;
      const channel = supabaseRef.current
        .channel("customer-notifications")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          () => {
            fetchNotifications();
          },
        )
        .subscribe();
      return () => {
        if (supabaseRef.current) supabaseRef.current.removeChannel(channel);
      };
    }, [user, fetchNotifications]);

    const unreadNotifs = notifications.filter((n: any) => !n.read).length;

    function formatNotifTime(dateStr: string) {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    }

    function getNotifIcon(type: string) {
      if (type === "order_update") return { icon: Package, bg: "bg-brand-100", color: "text-brand-600" };
      return { icon: Bell, bg: "bg-gray-100", color: "text-gray-600" };
    }

    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setDropdownOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
    const avatarLetter = displayName.charAt(0).toUpperCase();

    if (kioskMode) {
      console.warn("kioskMode is deprecated. Using default AuthNavbar instead.");
    }

    return (
      <header
        ref={ref}
        className={cn(
          "fixed top-0 left-0 right-0 z-[999] bg-cream/90 backdrop-blur-xl border-b border-black/5 shadow-sm",
          className,
        )}
      >
        <nav className="w-full max-w-[1280px] mx-auto flex items-center justify-between px-6 py-3 relative">
          <a href="/" className="flex items-center gap-3 flex-shrink-0 no-underline group">
            <div className="w-12 h-12 relative flex items-center justify-center transition-transform group-hover:scale-105">
              <img src="/logo.png" alt="Suarez Food Hub Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <span
              className="hidden sm:inline text-lg font-bold text-near-black"
              style={{ fontFamily: "var(--playfair-display)" }}
            >
              Suarez Food Hub
            </span>
          </a>

          <ul className="hidden md:flex items-center gap-2 m-0 p-0 list-none absolute left-1/2 transform -translate-x-1/2">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className={cn(
                    "text-[15px] font-medium transition-all px-5 py-2.5 rounded-full",
                    pathname === link.href
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-near-black/80 hover:text-near-black hover:bg-black/5",
                  )}
                  style={{ fontFamily: "var(--plus-jakarta-sans)" }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4 ml-auto">
            {showCartIcon && (
              <button
                type="button"
                onClick={onCartClick}
                className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/50 hover:bg-white/80 transition-colors shadow-sm border-none cursor-pointer"
              >
                <ShoppingCart className="w-5 h-5 text-near-black" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                )}
              </button>
            )}

            {/* Notification Bell */}
            {user && (
              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/50 hover:bg-white/80 transition-colors shadow-sm border-none cursor-pointer"
                >
                  <Bell className="w-5 h-5 text-near-black" />
                  {unreadNotifs > 0 && (
                    <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {unreadNotifs > 99 ? "99+" : unreadNotifs}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div
                    className="fixed left-4 right-4 md:absolute md:left-auto md:right-0 mt-2 md:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[9999]"
                    style={{ animation: "slideDown 0.2s ease-out", top: "64px" }}
                  >
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="m-0 font-bold text-sm text-near-black">Notifications</h3>
                      <div className="flex items-center gap-2">
                        {unreadNotifs > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!supabaseRef.current) return;
                              await supabaseRef.current
                                .from("notifications")
                                .update({ read: true })
                                .eq("user_id", user.id)
                                .is("read", false);
                              setNotifications((prev: any[]) => prev.map((n: any) => ({ ...n, read: true })));
                            }}
                            className="text-[10px] font-medium text-brand-600 hover:text-brand-700 bg-transparent border-none cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!supabaseRef.current) return;
                              await supabaseRef.current.from("notifications").delete().eq("user_id", user.id);
                              setNotifications([]);
                            }}
                            className="text-[10px] font-medium text-red-500 hover:text-red-600 bg-transparent border-none cursor-pointer"
                          >
                            Delete all
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                          <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="m-0 text-sm text-gray-400">No notifications yet</p>
                          <p className="m-0 mt-1 text-xs text-gray-300">Order updates will appear here</p>
                        </div>
                      ) : (
                        notifications.map((n: any) => {
                          const vi = getNotifIcon(n.type);
                          const Icon = vi.icon;
                          return (
                            <div
                              key={n.id}
                              className={`group relative border-b border-gray-50 last:border-0 ${
                                n.read ? "opacity-60" : ""
                              }`}
                            >
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!supabaseRef.current) return;
                                  await supabaseRef.current.from("notifications").update({ read: true }).eq("id", n.id);
                                  setNotifications((prev: any[]) =>
                                    prev.map((x: any) => (x.id === n.id ? { ...x, read: true } : x)),
                                  );
                                  setNotifOpen(false);
                                  const orderId = n.data?.order_id;
                                  if (orderId) router.push(`/orders`);
                                }}
                                className="w-full text-left flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer bg-transparent border-none"
                              >
                                <div
                                  className={`h-9 w-9 rounded-full ${vi.bg} flex items-center justify-center ${vi.color} shrink-0 mt-0.5`}
                                >
                                  <Icon className="h-[18px] w-[18px]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="m-0 text-sm font-semibold text-near-black truncate">{n.title}</p>
                                  <p className="m-0 mt-0.5 text-xs text-gray-500 leading-relaxed">{n.message}</p>
                                  <p className="m-0 mt-1 text-[10px] text-gray-400">{formatNotifTime(n.created_at)}</p>
                                </div>
                                {!n.read && <span className="h-2.5 w-2.5 rounded-full bg-brand-500 shrink-0 mt-2.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!supabaseRef.current) return;
                                  await supabaseRef.current.from("notifications").delete().eq("id", n.id);
                                  setNotifications((prev: any[]) => prev.filter((x: any) => x.id !== n.id));
                                }}
                                className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-gray-200 hover:bg-red-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"
                                title="Delete"
                              >
                                <X className="h-3 w-3 text-gray-500" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="px-5 py-2.5 border-t border-gray-100 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            router.push("/orders");
                          }}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700 bg-transparent border-none cursor-pointer"
                        >
                          View all orders
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {loading ? null : user ? (
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="h-10 flex items-center gap-1.5 pl-1 pr-3 rounded-full bg-white/50 hover:bg-white/80 transition-colors shadow-sm border-none cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-500 text-white font-bold text-sm flex items-center justify-center">
                    {avatarLetter}
                  </div>
                  <ChevronDown className="w-4 h-4 text-near-black" />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 w-[220px] bg-white rounded-2xl shadow-xl overflow-hidden z-[9999] border border-gray-100"
                    style={{ animation: "slideDown 0.2s ease-out", top: "56px" }}
                  >
                    <div className="px-5 py-4 border-b border-gray-100">
                      <p className="m-0 font-bold text-sm text-gray-800">{displayName}</p>
                      <p className="m-0 mt-[2px] text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors no-underline"
                      >
                        <User className="w-[18px] h-[18px]" /> My Profile
                      </Link>
                      <Link
                        href="/orders"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors no-underline"
                      >
                        <Package className="w-[18px] h-[18px]" /> My Orders
                      </Link>
                    </div>
                    <div className="px-2 pb-2 pt-1 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          signOut();
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors w-full text-left border-none bg-transparent cursor-pointer"
                      >
                        <LogOut className="w-[18px] h-[18px]" /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden md:inline-flex items-center px-6 py-2.5 rounded-full bg-near-black text-white text-sm font-medium hover:bg-near-black/80 transition-colors no-underline"
              >
                Login
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-full bg-white/50 hover:bg-white/80 border-none cursor-pointer"
            >
              {mobileOpen ? (
                <svg
                  className="w-5 h-5 text-near-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-near-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div
            className="md:hidden absolute top-[72px] left-0 right-0 mx-4 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 divide-y divide-gray-100 flex flex-col"
            style={{ maxWidth: "calc(100% - 32px)" }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "block px-6 py-4 text-sm font-medium transition-colors no-underline",
                  pathname === link.href ? "text-brand-500 bg-brand-50/30" : "text-near-black hover:bg-gray-50",
                )}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="block px-6 py-4 text-sm font-medium text-near-black hover:bg-gray-50 transition-colors no-underline"
                  onClick={() => setMobileOpen(false)}
                >
                  My Profile
                </Link>
                <Link
                  href="/orders"
                  className="block px-6 py-4 text-sm font-medium text-near-black hover:bg-gray-50 transition-colors no-underline"
                  onClick={() => setMobileOpen(false)}
                >
                  My Orders
                </Link>
                <Link
                  href="/orders?active=true"
                  className="block px-6 py-4 text-sm font-medium text-near-black hover:bg-gray-50 transition-colors no-underline"
                  onClick={() => setMobileOpen(false)}
                >
                  Track Order
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    signOut();
                  }}
                  className="block w-full text-left px-6 py-4 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors no-underline bg-transparent border-none cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="block px-6 py-4 text-sm font-medium text-brand-500 hover:bg-gray-50 transition-colors no-underline"
                onClick={() => setMobileOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        )}
      </header>
    );
  },
);
AuthNavbar.displayName = "AuthNavbar";

export default AuthNavbar;
