"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cart";
import { Navbar } from "@repo/ui";
import {
  Home,
  UtensilsCrossed,
  ShoppingCart,
  ClipboardList,
  User,
} from "lucide-react";

const bottomNavItems = [
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
  const itemCount = useCartStore((s) => s.getItemCount());
  const [user, setUser] = useState<{ id: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, [supabase]);

  return (
    <div className="min-h-dvh bg-creamson pb-20">
      {/* Top Navbar */}
      <Navbar
        showCartIcon={!!user}
        cartItemCount={itemCount}
        onCartClick={() => router.push("/cart")}
      />

      {/* Main Content */}
      <main>{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-white/40 safe-bottom z-50">
        <div className="max-w-[1280px] mx-auto flex items-center justify-around h-16 px-4">
          {bottomNavItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 relative transition-colors duration-200 ${
                  isActive
                    ? "text-[#b1454a]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  {item.href === "/cart" && itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#b1454a] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold">{item.label}</span>
                {isActive && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-[#b1454a] rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
