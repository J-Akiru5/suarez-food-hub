"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cart";
import {
  Home,
  UtensilsCrossed,
  ShoppingCart,
  ClipboardList,
  User,
  Search,
  Store,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/profile", label: "Profile", icon: User },
];

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const itemCount = useCartStore((s) => s.getItemCount());
  const supabase = createClient();

  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, [supabase]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-brand-100 safe-top">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Store className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-brand-600 hidden sm:inline">
              Suarez Food Hub
            </span>
          </Link>

          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="ml-auto flex items-center gap-2 h-9 px-3 rounded-full bg-gray-100 text-sm text-muted-foreground hover:bg-gray-200 transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search food...</span>
          </button>

          {user && (
            <Link href="/cart" className="relative sm:hidden">
              <ShoppingCart className="h-5 w-5 text-gray-600" />
              {itemCount > 0 && (
                <span className="cart-badge">{itemCount > 99 ? "99+" : itemCount}</span>
              )}
            </Link>
          )}
        </div>

        {/* Search Bar Expanded */}
        {searchOpen && (
          <div className="px-4 pb-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for food..."
                autoFocus
                className="flex-1 h-10 px-4 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="h-10 px-5 rounded-full bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 relative transition-colors ${
                  isActive
                    ? "text-brand-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.href === "/cart" && itemCount > 0 && (
                    <span className="cart-badge">
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-brand-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
