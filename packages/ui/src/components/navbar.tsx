"use client";

import { Menu, ShoppingCart, X } from "lucide-react";
import { usePathname } from "next/navigation";
import * as React from "react";
import { cn } from "../lib/utils";

export interface NavbarProps {
  showCartIcon?: boolean;
  cartItemCount?: number;
  onCartClick?: () => void;
  className?: string;
}

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/menu" },
  { label: "Track Order", href: "/track-order" },
  { label: "Feedback", href: "/feedback" },
];

const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  ({ showCartIcon = true, cartItemCount = 0, onCartClick, className }, ref) => {
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const pathname = usePathname();

    return (
      <header
        ref={ref}
        className={cn(
          "fixed top-0 left-0 right-0 z-[999] bg-[#f9f3ec]/90 backdrop-blur-xl border-b border-black/5 shadow-sm",
          className,
        )}
      >
        {/* Full-width Rectangle Navbar */}
        <nav className="w-full max-w-[1280px] mx-auto flex items-center justify-between px-6 py-3 relative">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-12 h-12 relative flex items-center justify-center rounded-full overflow-hidden bg-white shadow-sm">
              <img src="/logo.jpg" alt="Suarez Food Hub Logo" className="w-full h-full object-cover scale-[1.35]" />
            </div>
          </a>

          {/* Desktop Nav Links */}
          <ul className="hidden md:flex items-center gap-2 m-0 p-0 list-none absolute left-1/2 transform -translate-x-1/2">
            {navLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className={cn(
                    "text-[15px] font-medium transition-all px-5 py-2.5 rounded-full",
                    pathname === link.href
                      ? "bg-[#8B3A2B] text-white shadow-sm"
                      : "text-[#1A1A1A]/80 hover:text-[#1A1A1A] hover:bg-black/5",
                  )}
                  style={{ fontFamily: "var(--plus-jakarta-sans)" }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Right side: Login + Cart */}
          <div className="flex items-center gap-4 ml-auto">
            <a
              href="/login"
              className="hidden md:inline-flex items-center px-6 py-2.5 rounded-full bg-[#1A1A1A] text-white text-[15px] font-medium hover:bg-[#1A1A1A]/80 transition-colors"
            >
              Login
            </a>

            {showCartIcon && (
              <button
                onClick={onCartClick}
                className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/50 hover:bg-white/80 transition-colors shadow-sm"
              >
                <ShoppingCart className="w-5 h-5 text-[#1A1A1A]" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#8B3A2B] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                )}
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-full bg-white/50 hover:bg-white/80"
            >
              {mobileOpen ? <X className="w-5 h-5 text-[#1A1A1A]" /> : <Menu className="w-5 h-5 text-[#1A1A1A]" />}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden absolute top-[80px] left-6 right-6 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={cn(
                  "block px-6 py-4 text-[15px] font-medium transition-colors",
                  pathname === link.href ? "text-[#8B3A2B] bg-[#F3E7D3]/30" : "text-[#1A1A1A] hover:bg-gray-50",
                )}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href="/login"
              className="block px-6 py-4 text-[15px] font-medium text-[#8B3A2B] hover:bg-gray-50 transition-colors border-t border-gray-100"
              onClick={() => setMobileOpen(false)}
            >
              Login
            </a>
          </div>
        )}
      </header>
    );
  },
);
Navbar.displayName = "Navbar";

export { Navbar };
