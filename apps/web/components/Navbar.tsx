"use client";

import Link from "next/link";
import { ShoppingCart, Utensils, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface NavbarProps {
  onCartClick?: () => void;
  cartItemCount?: number;
  showCartIcon?: boolean;
}

export default function Navbar({ onCartClick, cartItemCount = 0, showCartIcon = true }: NavbarProps) {
  const router = useRouter();
  const [localCount, setLocalCount] = useState(cartItemCount);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (cartItemCount > 0) {
      setLocalCount(cartItemCount);
    } else {
      const saved = localStorage.getItem("sfh_cart");
      if (saved) {
        try {
          const cart = JSON.parse(saved);
          const total = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);
          setLocalCount(total);
        } catch (e) {}
      }
    }
  }, [cartItemCount]);

  const handleCartClick = () => {
    if (onCartClick) {
      onCartClick();
    } else {
      router.push("/menu");
    }
  };

  return (
    <>
      <header>
        <nav className="header__nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="header__logo">
            <Link href="/" style={{ textDecoration: 'none' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 0 }}>
                <Utensils size={24} color="#fff" /> Suarez Food Hub
              </h4>
            </Link>
            <div className="header__logo-overlay"></div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {/* Desktop Menu */}
            <ul className="header__menu mobile-hide" style={{ display: "flex", margin: 0 }}>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/menu">Menu</Link></li>
              <li><Link href="/track-order">Track Order</Link></li>
              <li><Link href="/feedback">Feedback</Link></li>
              <li><Link href="/login">Login</Link></li>
            </ul>

            {/* Cart Icon (Always Visible) */}
            {showCartIcon && (
              <div onClick={handleCartClick} style={{ cursor: "pointer", position: "relative", display: "flex", alignItems: "center", color: "#fff" }}>
                <ShoppingCart size={22} />
                {localCount > 0 && (
                  <span style={{ position: "absolute", top: -10, right: -12, background: "var(--primary-color)", color: "#fff", borderRadius: "50%", minWidth: 20, height: 20, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, padding: "0 6px", border: "2px solid var(--color-creamson)" }}>
                    {localCount}
                  </span>
                )}
              </div>
            )}

            {/* Mobile Hamburger Icon */}
            <div className="desktop-hide" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{ cursor: "pointer", color: "#fff", display: "flex", alignItems: "center" }}>
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div style={{ position: "fixed", top: 80, left: 0, width: "100%", background: "var(--color-creamson)", zIndex: 1000, borderBottom: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
          <ul style={{ listStyle: "none", padding: "24px", margin: 0, display: "flex", flexDirection: "column", gap: 24 }}>
            <li><Link href="/" style={{ color: "var(--secondary-color)", textDecoration: "none", fontSize: 18, fontWeight: 700 }} onClick={() => setIsMobileMenuOpen(false)}>Home</Link></li>
            <li><Link href="/menu" style={{ color: "var(--secondary-color)", textDecoration: "none", fontSize: 18, fontWeight: 700 }} onClick={() => setIsMobileMenuOpen(false)}>Menu</Link></li>
            <li><Link href="/track-order" style={{ color: "var(--secondary-color)", textDecoration: "none", fontSize: 18, fontWeight: 700 }} onClick={() => setIsMobileMenuOpen(false)}>Track Order</Link></li>
            <li><Link href="/feedback" style={{ color: "var(--secondary-color)", textDecoration: "none", fontSize: 18, fontWeight: 700 }} onClick={() => setIsMobileMenuOpen(false)}>Feedback</Link></li>
            <li><Link href="/login" style={{ color: "var(--secondary-color)", textDecoration: "none", fontSize: 18, fontWeight: 700 }} onClick={() => setIsMobileMenuOpen(false)}>Login</Link></li>
          </ul>
        </div>
      )}

      {/* CSS to hide hamburger on desktop */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (min-width: 769px) {
          .desktop-hide { display: none !important; }
        }
      `}} />
    </>
  );
}
