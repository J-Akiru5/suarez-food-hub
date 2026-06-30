"use client";

import { cn } from "@repo/utils";
import { ChevronDown, History, LogOut, Package, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useAuth } from "./auth-provider";

export interface AuthNavbarProps {
  showCartIcon?: boolean;
  cartItemCount?: number;
  onCartClick?: () => void;
  className?: string;
}

const guestNavLinks = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/menu" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const authNavLinks = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/menu" },
];

const AuthNavbar = React.forwardRef<HTMLElement, AuthNavbarProps>(
  ({ showCartIcon = true, cartItemCount = 0, onCartClick, className }, ref) => {
    const { user, profile, loading, signOut } = useAuth();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [isGuest, setIsGuest] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      setIsGuest(document.documentElement.classList.contains("guest-mode"));
      const observer = new MutationObserver(() => {
        setIsGuest(document.documentElement.classList.contains("guest-mode"));
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    }, []);

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
    const navLinks = isGuest ? guestNavLinks : authNavLinks;

    return (
      <header
        ref={ref}
        className={cn("fixed top-0 left-0 right-0 z-[999] backdrop-blur-xl border-b shadow-sm", className)}
        style={{
          background: isGuest
            ? "rgba(255,255,255,0.9)"
            : "color-mix(in srgb, var(--primary-color) 5%, rgba(255,255,255,0.9))",
          borderColor: isGuest ? "rgba(0,0,0,0.05)" : "color-mix(in srgb, var(--primary-color) 10%, transparent)",
        }}
      >
        {/* Full-width Rectangle Navbar */}
        <nav className="w-full max-w-[1280px] mx-auto flex items-center justify-between px-6 py-3 relative">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 flex-shrink-0 no-underline">
            <div className="w-12 h-12 relative flex items-center justify-center">
              <img src="/logo.svg" alt="Suarez Food Hub Logo" className="w-full h-full" />
            </div>
            <span
              className="hidden sm:inline text-lg font-bold"
              style={{
                color: "var(--secondary-color)",
                fontFamily: isGuest ? "var(--plus-jakarta-sans)" : "var(--playfair-display)",
              }}
            >
              Suarez Food Hub
            </span>
          </a>

          {/* Desktop Nav Links */}
          <ul className="hidden md:flex items-center gap-2 m-0 p-0 list-none absolute left-1/2 transform -translate-x-1/2">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className={cn("text-[15px] font-medium transition-all px-5 py-2.5 rounded-full")}
                  style={{
                    fontFamily: "var(--plus-jakarta-sans)",
                    background:
                      pathname === link.href
                        ? isGuest
                          ? "var(--primary-color)"
                          : "var(--primary-dark)"
                        : "transparent",
                    color:
                      pathname === link.href ? "#fff" : "color-mix(in srgb, var(--secondary-color) 80%, transparent)",
                  }}
                  onMouseEnter={(e) => {
                    if (pathname !== link.href) e.currentTarget.style.background = "rgba(0,0,0,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    if (pathname !== link.href) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right side */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Cart Icon first */}
            {showCartIcon && (
              <button
                onClick={onCartClick}
                className="relative w-10 h-10 flex items-center justify-center rounded-full transition-colors shadow-sm border-none cursor-pointer"
                style={{ background: "rgba(255,255,255,0.5)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.8)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.5)")}
              >
                <ShoppingCart className="w-5 h-5" style={{ color: "var(--secondary-color)" }} />
                {cartItemCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-[18px] h-[18px] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white"
                    style={{ background: "var(--primary-dark)" }}
                  >
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                )}
              </button>
            )}

            {/* Auth-aware section second */}
            {loading ? null : user ? (
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="h-10 flex items-center gap-1.5 pl-1 pr-3 rounded-full transition-colors shadow-sm border-none cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.8)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.5)")}
                >
                  <div
                    className="w-8 h-8 rounded-full text-white font-bold text-[14px] flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--primary-dark)" }}
                  >
                    {avatarLetter}
                  </div>
                  <ChevronDown className="w-4 h-4" style={{ color: "var(--secondary-color)" }} />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 w-[220px] bg-white rounded-2xl shadow-xl overflow-hidden z-[9999] border border-gray-100"
                    style={{ animation: "slideDown 0.2s ease-out", top: "56px" }}
                  >
                    <div className="px-5 py-4 border-b border-gray-100">
                      <p className="m-0 font-bold text-sm text-[#1e293b]">{displayName}</p>
                      <p className="m-0 mt-[2px] text-xs text-[#94a3b8] truncate">{user.email}</p>
                    </div>

                    <div className="p-2">
                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#334155] hover:bg-gray-50 transition-colors no-underline"
                      >
                        <User className="w-[18px] h-[18px]" /> My Profile
                      </Link>
                      <Link
                        href="/orders"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#334155] hover:bg-gray-50 transition-colors no-underline"
                      >
                        <Package className="w-[18px] h-[18px]" /> My Orders
                      </Link>
                    </div>

                    <div className="px-2 pb-2 pt-1 border-t border-gray-100">
                      <button
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
                className="hidden md:inline-flex items-center px-6 py-2.5 rounded-full text-white text-[15px] font-medium transition-colors no-underline"
                style={{ background: "var(--secondary-color)" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Login
              </Link>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-full border-none cursor-pointer"
              style={{ background: "rgba(255,255,255,0.5)" }}
            >
              {mobileOpen ? (
                <svg
                  className="w-5 h-5"
                  style={{ color: "var(--secondary-color)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  style={{ color: "var(--secondary-color)" }}
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

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden absolute top-[80px] left-6 right-6 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="block px-6 py-4 text-[15px] font-medium transition-colors no-underline"
                style={{
                  color: pathname === link.href ? "var(--primary-color)" : "var(--secondary-color)",
                  background:
                    pathname === link.href
                      ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                      : "transparent",
                }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="block px-6 py-4 text-[15px] font-medium hover:bg-gray-50 transition-colors no-underline border-t border-gray-100"
                  style={{ color: "var(--secondary-color)" }}
                  onClick={() => setMobileOpen(false)}
                >
                  My Profile
                </Link>
                <Link
                  href="/orders"
                  className="block px-6 py-4 text-[15px] font-medium hover:bg-gray-50 transition-colors no-underline"
                  style={{ color: "var(--secondary-color)" }}
                  onClick={() => setMobileOpen(false)}
                >
                  My Orders
                </Link>
                <Link
                  href="/orders?active=true"
                  className="block px-6 py-4 text-[15px] font-medium hover:bg-gray-50 transition-colors no-underline"
                  style={{ color: "var(--secondary-color)" }}
                  onClick={() => setMobileOpen(false)}
                >
                  Track Order
                </Link>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    signOut();
                  }}
                  className="block w-full text-left px-6 py-4 text-[15px] font-medium text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100 no-underline bg-transparent border-none cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="block px-6 py-4 text-[15px] font-medium hover:bg-gray-50 transition-colors no-underline border-t border-gray-100"
                style={{ color: "var(--primary-color)" }}
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
