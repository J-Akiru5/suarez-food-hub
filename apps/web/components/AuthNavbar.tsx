"use client";

import * as React from "react";
import Link from "next/link";
import { ShoppingCart, Package, History, User, LogOut, ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@repo/utils";
import { useAuth } from "./auth-provider";

export interface AuthNavbarProps {
  showCartIcon?: boolean;
  cartItemCount?: number;
  onCartClick?: () => void;
  className?: string;
}

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/menu" },
];

const AuthNavbar = React.forwardRef<HTMLElement, AuthNavbarProps>(
  ({ showCartIcon = true, cartItemCount = 0, onCartClick, className }, ref) => {
    const { user, profile, loading, signOut } = useAuth();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

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

    return (
      <header
        ref={ref}
        className={cn(
          "fixed top-0 left-0 right-0 z-[999] bg-[#f9f3ec]/90 backdrop-blur-xl border-b border-black/5 shadow-sm",
          className
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
                <Link
                  href={link.href}
                  className={cn(
                    "text-[15px] font-medium transition-all px-5 py-2.5 rounded-full",
                    pathname === link.href
                      ? "bg-[#8B3A2B] text-white shadow-sm"
                      : "text-[#1A1A1A]/80 hover:text-[#1A1A1A] hover:bg-black/5"
                  )}
                  style={{ fontFamily: "var(--plus-jakarta-sans)" }}
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
                className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/50 hover:bg-white/80 transition-colors shadow-sm border-none cursor-pointer"
              >
                <ShoppingCart className="w-5 h-5 text-[#1A1A1A]" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#8B3A2B] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
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
                  className="h-10 flex items-center gap-1.5 pl-1 pr-3 rounded-full bg-white/50 hover:bg-white/80 transition-colors shadow-sm border-none cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#8B3A2B] text-white font-bold text-[14px] flex items-center justify-center flex-shrink-0">
                    {avatarLetter}
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#1A1A1A]" />
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
                        onClick={() => { setDropdownOpen(false); signOut(); }}
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
                className="hidden md:inline-flex items-center px-6 py-2.5 rounded-full bg-[#1A1A1A] text-white text-[15px] font-medium hover:bg-[#1A1A1A]/80 transition-colors no-underline"
              >
                Login
              </Link>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-full bg-white/50 hover:bg-white/80 border-none cursor-pointer"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5 text-[#1A1A1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-[#1A1A1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                className={cn(
                  "block px-6 py-4 text-[15px] font-medium transition-colors no-underline",
                  pathname === link.href ? "text-[#8B3A2B] bg-[#F3E7D3]/30" : "text-[#1A1A1A] hover:bg-gray-50"
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
                  className="block px-6 py-4 text-[15px] font-medium text-[#1A1A1A] hover:bg-gray-50 transition-colors no-underline border-t border-gray-100"
                  onClick={() => setMobileOpen(false)}
                >
                  My Profile
                </Link>
                <Link
                  href="/orders"
                  className="block px-6 py-4 text-[15px] font-medium text-[#1A1A1A] hover:bg-gray-50 transition-colors no-underline"
                  onClick={() => setMobileOpen(false)}
                >
                  My Orders
                </Link>
                <Link
                  href="/orders?active=true"
                  className="block px-6 py-4 text-[15px] font-medium text-[#1A1A1A] hover:bg-gray-50 transition-colors no-underline"
                  onClick={() => setMobileOpen(false)}
                >
                  Track Order
                </Link>
                <button
                  onClick={() => { setMobileOpen(false); signOut(); }}
                  className="block w-full text-left px-6 py-4 text-[15px] font-medium text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100 no-underline bg-transparent border-none cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="block px-6 py-4 text-[15px] font-medium text-[#8B3A2B] hover:bg-gray-50 transition-colors no-underline border-t border-gray-100"
                onClick={() => setMobileOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        )}
      </header>
    );
  }
);
AuthNavbar.displayName = "AuthNavbar";

export default AuthNavbar;
