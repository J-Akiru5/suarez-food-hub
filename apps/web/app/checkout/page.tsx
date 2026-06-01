"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AuthNavbar from "../../components/AuthNavbar";
import { useAuth } from "../../components/auth-provider";
import { ArrowLeft, Loader2, ShoppingCart, MapPin, Phone, CreditCard, Banknote, CheckCircle, ShoppingBag } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variant: string;
}

const PH_REGEX = /^(?:\+63|0)9\d{9}$/;
const GCASH_REF_REGEX = /^[A-Za-z0-9]{5,20}$/;

export default function CheckoutPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "gcash">("cod");
  const [gcashRef, setGcashRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sfh_cart");
      if (saved) {
        const items = JSON.parse(saved);
        if (Array.isArray(items)) setCart(items);
      }
    } catch {
      localStorage.removeItem("sfh_cart");
    }
    setCartLoaded(true);
  }, []);

  useEffect(() => {
    if (profile) {
      if (!address && profile.address && profile.address !== "N/A") setAddress(profile.address);
      if (!phone && profile.phone && profile.phone !== "N/A") setPhone(profile.phone);
    }
  }, [profile]);

  const validatePhone = (val: string) => {
    if (!val.trim()) return "Phone number is required";
    if (!PH_REGEX.test(val.trim())) return "Enter a valid PH mobile number (e.g. 09123456789)";
    return "";
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = subtotal >= 200 ? 0 : 40;
  const total = subtotal + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!address.trim()) { setError("Delivery address is required"); return; }
    const phoneErr = validatePhone(phone);
    if (phoneErr) { setPhoneError(phoneErr); setError(phoneErr); return; }
    setPhoneError("");
    if (cart.length === 0) { setError("Your cart is empty"); return; }
    if (paymentMethod === "gcash") {
      if (!GCASH_REF_REGEX.test(gcashRef.trim())) { setError("Enter a valid GCash reference number (5-20 alphanumeric characters)"); return; }
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart,
          delivery_address: address,
          delivery_contact: phone.trim(),
          payment_method: paymentMethod,
          gcash_reference: paymentMethod === "gcash" ? gcashRef.trim() : null,
          subtotal,
          delivery_fee: deliveryFee,
          total,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.details && Array.isArray(data.details)) {
          throw new Error(data.details.join(". "));
        }
        throw new Error(data.error || "Failed to place order");
      }

      localStorage.removeItem("sfh_cart");
      setPlacedOrderId(data.orderId);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (!cartLoaded) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-creamson)", fontFamily: "var(--plus-jakarta-sans)" }}>
        <AuthNavbar />
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "120px 24px 60px" }}>
          <div style={{ background: "#fff", borderRadius: 28, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}>
            <div style={{ width: "40%", height: 24, background: "#f1f5f9", borderRadius: 8, marginBottom: 16 }} />
            <div style={{ width: "80%", height: 14, background: "#f1f5f9", borderRadius: 6, marginBottom: 8 }} />
            <div style={{ width: "60%", height: 14, background: "#f1f5f9", borderRadius: 6 }} />
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0 && !success) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-creamson)", fontFamily: "var(--plus-jakarta-sans)" }}>
        <AuthNavbar />
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "120px 24px 60px", textAlign: "center" }}>
          <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(177,69,74,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <ShoppingBag size={48} color="var(--primary-color)" style={{ opacity: 0.4 }} />
          </div>
          <h2 style={{ fontFamily: "var(--playfair-display)", fontSize: 32, color: "var(--secondary-color)", margin: 0 }}>Your cart is empty</h2>
          <p style={{ color: "#94a3b8", marginTop: 12, fontSize: 16 }}>Add some items from our menu before checking out.</p>
          <button onClick={() => router.push("/menu")} style={{ marginTop: 24, padding: "16px 36px", borderRadius: 30, border: "none", background: "var(--primary-color)", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", boxShadow: "0 8px 24px rgba(177,69,74,0.25)" }}>
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-creamson)", display: "flex", flexDirection: "column", fontFamily: "var(--plus-jakarta-sans)" }}>
        <AuthNavbar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <CheckCircle size={80} color="var(--primary-color)" style={{ marginBottom: 24 }} />
            <h2 style={{ fontFamily: "var(--playfair-display)", fontSize: 36, color: "var(--secondary-color)", margin: 0 }}>Order Placed!</h2>
            <p style={{ color: "#64748b", marginTop: 12, fontSize: 16 }}>
              Your order <strong style={{ fontFamily: "monospace" }}>#{placedOrderId.slice(0, 8).toUpperCase()}</strong> has been received.
            </p>
            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <button onClick={() => router.push("/orders")} style={{ padding: "16px 36px", borderRadius: 30, border: "none", background: "var(--primary-color)", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", width: "100%", maxWidth: 280, boxShadow: "0 8px 24px rgba(177,69,74,0.25)" }}>
                View Order Status
              </button>
              <button onClick={() => router.push("/menu")} style={{ padding: "14px 32px", borderRadius: 30, border: "2px solid var(--primary-color)", background: "transparent", color: "var(--primary-color)", fontWeight: 700, fontSize: 15, cursor: "pointer", width: "100%", maxWidth: 280 }}>
                Order Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-creamson)", fontFamily: "var(--plus-jakarta-sans)" }}>
      <AuthNavbar />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "120px 24px 60px" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 14, marginBottom: 24 }}>
          <ArrowLeft size={18} /> Back
        </button>

        <h1 style={{ fontFamily: "var(--playfair-display)", fontSize: 40, color: "var(--secondary-color)", margin: "0 0 40px" }}>Checkout</h1>

        <style>{`@media (max-width: 768px) { .checkout-grid { grid-template-columns: 1fr !important; } }`}</style>
        <div className="checkout-grid" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 40, alignItems: "start" }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ padding: "12px 20px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 14, marginBottom: 20 }}>{error}</div>
            )}

            <div style={{ background: "#fff", borderRadius: 28, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.04)", marginBottom: 24 }}>
              <h3 style={{ margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10, color: "var(--secondary-color)" }}><MapPin size={20} /> Delivery Details</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block" }}>Delivery Address</label>
                  <textarea value={address} onChange={(e) => setAddress(e.target.value)} required rows={3}
                    style={{ width: "100%", padding: 14, borderRadius: 16, border: "1px solid #e2e8f0", fontFamily: "var(--plus-jakarta-sans)", fontSize: 14, resize: "none", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block" }}>Phone Number</label>
                  <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }} required placeholder="09XX XXX XXXX"
                    style={{ width: "100%", padding: "14px 18px", borderRadius: 16, border: `1px solid ${phoneError ? "#ef4444" : "#e2e8f0"}`, fontFamily: "var(--plus-jakarta-sans)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  {phoneError && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{phoneError}</p>}
                </div>
              </div>
            </div>

            <div style={{ background: "#fff", borderRadius: 28, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}>
              <h3 style={{ margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10, color: "var(--secondary-color)" }}><CreditCard size={20} /> Payment Method</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderRadius: 16, border: paymentMethod === "cod" ? "2px solid var(--primary-color)" : "1px solid #e2e8f0", cursor: "pointer", transition: "border 0.2s" }}>
                  <input type="radio" name="payment" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} style={{ accentColor: "var(--primary-color)" }} />
                  <Banknote size={22} color="var(--primary-color)" />
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: "var(--secondary-color)", fontSize: 15 }}>Cash on Delivery</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>Pay when you receive your order</p>
                  </div>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderRadius: 16, border: paymentMethod === "gcash" ? "2px solid var(--primary-color)" : "1px solid #e2e8f0", cursor: "pointer", transition: "border 0.2s" }}>
                  <input type="radio" name="payment" checked={paymentMethod === "gcash"} onChange={() => setPaymentMethod("gcash")} style={{ accentColor: "var(--primary-color)" }} />
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: "#0057e0", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 900 }}>G</div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: "var(--secondary-color)", fontSize: 15 }}>GCash</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>Pay via GCash</p>
                  </div>
                </label>
                {paymentMethod === "gcash" && (
                  <input type="text" value={gcashRef} onChange={(e) => setGcashRef(e.target.value)} placeholder="GCash Reference Number"
                    style={{ width: "100%", padding: "14px 18px", borderRadius: 16, border: "1px solid #e2e8f0", fontFamily: "var(--plus-jakarta-sans)", fontSize: 14, outline: "none", marginTop: 4, boxSizing: "border-box" }} />
                )}
              </div>
            </div>

            <button type="submit" disabled={submitting || cart.length === 0}
              style={{ width: "100%", marginTop: 24, padding: "18px 32px", borderRadius: 30, border: "none", background: "var(--primary-color)", color: "#fff", fontWeight: 800, fontSize: 16, cursor: submitting || cart.length === 0 ? "not-allowed" : "pointer", opacity: submitting || cart.length === 0 ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              {submitting && <Loader2 size={20} />}
              Place Order — ₱{total}
            </button>
          </form>

          <div style={{ background: "#fff", borderRadius: 28, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.04)", position: "sticky", top: 120 }}>
            <h3 style={{ margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10, color: "var(--secondary-color)" }}><ShoppingCart size={20} /> Order Summary</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: 400, overflowY: "auto" }}>
              {cart.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "#f1f5f9" }}>
                    <img src={item.image || "/assets/food-hub.jpg"} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).src = "/assets/food-hub.jpg"; }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--secondary-color)" }}>{item.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>x{item.quantity} {item.variant && `(${item.variant})`}</p>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "var(--primary-color)" }}>₱{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 20, paddingTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#64748b", marginBottom: 8 }}><span>Subtotal</span><span>₱{subtotal}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#64748b", marginBottom: 8 }}><span>Delivery Fee</span><span>{deliveryFee === 0 ? "Free" : `₱${deliveryFee}`}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: "var(--secondary-color)", borderTop: "1px solid #e2e8f0", paddingTop: 16, marginTop: 8 }}><span>Total</span><span>₱{total}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}