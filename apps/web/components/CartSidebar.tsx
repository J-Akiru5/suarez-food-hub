"use client";

import React from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variant: string;
}

interface CartSidebarProps {
  showCart: boolean;
  setShowCart: (show: boolean) => void;
  cart: CartItem[];
  updateCartQty: (id: string, variant: string, delta: number) => void;
  removeFromCart: (id: string, variant: string) => void;
  totalPrice: number;
  receiptNumber: string;
}

export default function CartSidebar({
  showCart,
  setShowCart,
  cart,
  updateCartQty,
  removeFromCart,
  totalPrice,
  receiptNumber
}: CartSidebarProps) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", pointerEvents: showCart ? "auto" : "none" }}>
      <div style={{ flex: 1, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", opacity: showCart ? 1 : 0, transition: "opacity 0.3s ease" }} onClick={() => setShowCart(false)} />
      <div style={{ width: 440, maxWidth: "100%", background: "#f1f5f9", height: "100%", display: "flex", flexDirection: "column", boxShadow: "-20px 0 60px rgba(0,0,0,0.2)", transform: showCart ? "translateX(0)" : "translateX(100%)", transition: "transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)", position: "relative" }}>
        
        <div style={{ padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: "var(--playfair-display)", fontSize: 24, margin: 0, color: "var(--secondary-color)" }}>Order Summary</h2>
          <button onClick={() => setShowCart(false)} style={{ background: "#fff", border: "none", width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--secondary-color)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}><X size={20} /></button>
        </div>

        {/* The Receipt Paper */}
        <div style={{ 
          flex: 1, margin: "0 24px 24px", background: "#fff", display: "flex", flexDirection: "column",
          boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 10px), 98% 100%, 96% calc(100% - 10px), 94% 100%, 92% calc(100% - 10px), 90% 100%, 88% calc(100% - 10px), 86% 100%, 84% calc(100% - 10px), 82% 100%, 80% calc(100% - 10px), 78% 100%, 76% calc(100% - 10px), 74% 100%, 72% calc(100% - 10px), 70% 100%, 68% calc(100% - 10px), 66% 100%, 64% calc(100% - 10px), 62% 100%, 60% calc(100% - 10px), 58% 100%, 56% calc(100% - 10px), 54% 100%, 52% calc(100% - 10px), 50% 100%, 48% calc(100% - 10px), 46% 100%, 44% calc(100% - 10px), 42% 100%, 40% calc(100% - 10px), 38% 100%, 36% calc(100% - 10px), 34% 100%, 32% calc(100% - 10px), 30% 100%, 28% calc(100% - 10px), 26% 100%, 24% calc(100% - 10px), 22% 100%, 20% calc(100% - 10px), 18% 100%, 16% calc(100% - 10px), 14% 100%, 12% calc(100% - 10px), 10% 100%, 8% calc(100% - 10px), 6% 100%, 4% calc(100% - 10px), 2% 100%, 0 calc(100% - 10px))"
        }}>
          <div style={{ padding: "32px 32px 24px", borderBottom: "2px dashed #cbd5e1", textAlign: "center" }}>
            <h3 style={{ fontFamily: "monospace", margin: 0, fontSize: 18, color: "#334155", letterSpacing: 2 }}>SUAREZ FOOD HUB</h3>
            <p style={{ fontFamily: "monospace", margin: "8px 0 0", fontSize: 12, color: "#94a3b8" }}>RECEIPT # {receiptNumber}</p>
          </div>
          
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ fontFamily: "monospace", color: "#94a3b8", fontSize: 14 }}>-- EMPTY --</p>
              </div>
            ) : cart.map((item) => (
              <div key={`${item.id}-${item.variant}`} style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", color: "#334155" }}>
                <div style={{ flex: 1, paddingRight: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontWeight: 700 }}>{item.quantity}x</span>
                    <div>
                      <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{item.name.toUpperCase()}</p>
                      {item.variant && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>- {item.variant.toUpperCase()}</p>}
                      
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => updateCartQty(item.id, item.variant, -1)} style={{ background: "none", border: "1px solid #cbd5e1", width: 24, height: 24, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
                        <button onClick={() => updateCartQty(item.id, item.variant, 1)} style={{ background: "none", border: "1px solid #cbd5e1", width: 24, height: 24, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                        <button onClick={() => removeFromCart(item.id, item.variant)} style={{ background: "none", border: "none", color: "#ef4444", textDecoration: "underline", cursor: "pointer", fontSize: 12, marginLeft: 8 }}>Rem</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>₱{item.price * item.quantity}.00</div>
              </div>
            ))}
          </div>
          
          <div style={{ padding: "24px 32px", borderTop: "2px dashed #cbd5e1", background: "#f8fafc", paddingBottom: 80 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, fontFamily: "monospace", fontSize: 18, color: "#334155", fontWeight: 800 }}>
              <span>TOTAL</span>
              <span>₱{totalPrice}.00</span>
            </div>
          </div>
        </div>

        {/* Checkout Button overlaying the bottom of the receipt */}
        <div style={{ position: "absolute", bottom: 40, left: 40, right: 40 }}>
          <Link href="/checkout" onClick={() => {
            localStorage.setItem("sfh_cart", JSON.stringify(cart));
            setShowCart(false);
          }} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "18px",
            background: "var(--primary-color)", color: "#fff",
            borderRadius: "16px", fontWeight: 800, fontSize: 16, textDecoration: "none",
            boxShadow: "0 10px 30px rgba(177, 69, 74, 0.3)", transition: "transform 0.2s"
          }}>
            Proceed to Checkout <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
