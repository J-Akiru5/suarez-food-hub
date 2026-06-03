"use client";

import { DollarSign, History, Home, LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/deliveries", label: "Deliveries", icon: History },
  { href: "/earnings", label: "Earnings", icon: DollarSign },
  { href: "/profile", label: "Profile", icon: User },
];

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [riderName, setRiderName] = useState("Rider");

  useEffect(() => {
    const getProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("first_name, last_name").eq("id", user.id).single();
        if (data) {
          setRiderName(data.first_name || data.last_name || "Rider");
        }
      }
    };
    getProfile();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <header className="bg-white border-b border-gray-200 px-4 py-3 safe-top sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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
