"use client";

import * as React from "react";
import { ShoppingCart, Menu, X } from "lucide-react";
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
  { label: "How to Order", href: "/how-to-order" },
  { label: "Login", href: "/login" },
];

const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  ({ showCartIcon = true, cartItemCount = 0, onCartClick, className }, ref) => {
    const [mobileOpen, setMobileOpen] = React.useState(false);

    return (
      <header
        ref={ref}
        className={cn(
          "fixed top-0 left-0 right-0 z-[999] bg-[#fff0de] shadow-md",
          className
        )}
      >
        <nav className="max-w-[1280px] mx-auto flex items-center justify-between h-[74px] px-6">
          {/* Logo */}
          <a href="/" className="flex-shrink-0">
            <div className="bg-[#b1454a] text-white px-5 py-2 rounded-r-2xl">
              <span
                className="text-base font-bold tracking-wide whitespace-nowrap"
                style={{ fontFamily: "var(--playfair-display)" }}
              >
                SUAREZ FOOD HUB
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-semibold text-gray-800 uppercase tracking-wider hover:text-[#b1454a] transition-colors"
                style={{ fontFamily: "var(--plus-jakarta-sans)" }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {showCartIcon && (
              <button
                onClick={onCartClick}
                className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-gray-800" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#b1454a] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                )}
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-full bg-[#b1454a] text-white"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden bg-[#b1454a] border-t border-white/10 animate-slideDown">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider hover:bg-white/10 transition-colors"
                style={{ fontFamily: "var(--plus-jakarta-sans)" }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </header>
    );
  }
);
Navbar.displayName = "Navbar";

export { Navbar };
