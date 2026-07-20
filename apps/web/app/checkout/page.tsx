"use client";

import {
  ArrowLeft,
  Banknote,
  CheckCircle,
  CreditCard,
  Loader2,
  MapPin,
  ShoppingBag,
  ShoppingCart,
  X,
  ZoomIn,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AuthNavbar from "../../components/AuthNavbar";
import { useAuth } from "../../components/auth-provider";

interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variant: string;
  variantId?: string;
}

interface Business {
  gcash_qr_url: string | null;
  delivery_fee: number;
  free_delivery_min: number;
  delivery_provinces?: string | null;
}

const PH_REGEX = /^(?:\+63|0)9\d{9}$/;
const REF_REGEX = /^[A-Za-z0-9]{5,20}$/;

type PaymentMethod = "cod" | "gcash";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [refNumber, setRefNumber] = useState("");
  const [business, setBusiness] = useState<Business | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState("");
  const [error, setError] = useState("");
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);
  const [position, _setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [step, setStep] = useState(1);
  const addressRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (addressRef.current) {
      addressRef.current.style.height = "auto";
      addressRef.current.style.height = `${addressRef.current.scrollHeight}px`;
    }
  }, []);

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
      if (!address) {
        setAddress((profile as any).address || (profile as any).street_address || "");
      }
      if (!phone) setPhone(profile.phone || "");
    }
  }, [profile, phone, address]);

  useEffect(() => {
    fetch("/api/business")
      .then((r) => r.json())
      .then((response) => setBusiness(response.data || response))
      .catch(() => {});
  }, []);

  const deliveryProvinceList = business?.delivery_provinces
    ? business.delivery_provinces.split(",").filter(Boolean)
    : null;
  const isAreaRestricted =
    deliveryProvinceList &&
    deliveryProvinceList.length > 0 &&
    profile &&
    (profile as any).province_id &&
    !deliveryProvinceList.includes((profile as any).province_id);

  const deliveryFee = business?.delivery_fee ?? 40;
  const freeDeliveryMin = business?.free_delivery_min ?? 200;
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const fee = subtotal >= freeDeliveryMin ? 0 : deliveryFee;
  const total = subtotal + fee;

  const validatePhone = (val: string) => {
    if (!val.trim()) return "Phone number is required";
    if (!PH_REGEX.test(val.trim())) return "Enter a valid PH mobile number (e.g. 09123456789)";
    return "";
  };

  const handleNextStep1 = () => {
    setError("");
    if (!address.trim()) {
      setError("Delivery address is required");
      return;
    }
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      setError(phoneErr);
      return;
    }
    setPhoneError("");
    setStep(2);
  };

  const handleNextStep2 = () => {
    setError("");
    if (paymentMethod !== "cod") {
      if (!REF_REGEX.test(refNumber.trim())) {
        setError("Enter a valid GCash reference number (5-20 alphanumeric characters)");
        return;
      }
    }
    setStep(3);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    if (cart.length === 0) {
      setError("Your basket is empty");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart,
          delivery_address: address,
          delivery_lat: position?.lat || null,
          delivery_lng: position?.lng || null,
          delivery_contact: phone.trim(),
          payment_method: paymentMethod,
          gcash_reference: paymentMethod === "gcash" ? refNumber.trim() : null,

          subtotal,
          delivery_fee: fee,
          total,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errBody = data.data || data;
        if (errBody.details && Array.isArray(errBody.details)) {
          throw new Error(errBody.details.join(". "));
        }
        throw new Error(errBody.error || "Failed to place order");
      }

      localStorage.removeItem("sfh_cart");
      try {
        await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: [] }),
        });
      } catch {
        /* ignore */
      }

      const result = data.data || data;
      setPlacedOrderId(result.orderId);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (!cartLoaded) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-cream)", fontFamily: "var(--plus-jakarta-sans)" }}>
        <AuthNavbar />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "120px 24px 60px" }}>
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
      <div style={{ minHeight: "100vh", background: "var(--color-cream)", fontFamily: "var(--plus-jakarta-sans)" }}>
        <AuthNavbar />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "120px 24px 60px", textAlign: "center" }}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "rgba(177,69,74,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <ShoppingBag size={48} color="var(--primary-color)" style={{ opacity: 0.4 }} />
          </div>
          <h2
            style={{ fontFamily: "var(--playfair-display)", fontSize: 32, color: "var(--secondary-color)", margin: 0 }}
          >
            Your basket is empty
          </h2>
          <p style={{ color: "#94a3b8", marginTop: 12, fontSize: 16 }}>
            Add some items from our menu before checking out.
          </p>
          <button
            onClick={() => router.push("/menu")}
            style={{
              marginTop: 24,
              padding: "16px 36px",
              borderRadius: 30,
              border: "none",
              background: "var(--primary-color)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(177,69,74,0.25)",
            }}
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--color-cream)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--plus-jakarta-sans)",
        }}
      >
        <AuthNavbar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <CheckCircle size={80} color="var(--primary-color)" style={{ margin: "0 auto 24px", display: "block" }} />
            <h2
              style={{
                fontFamily: "var(--playfair-display)",
                fontSize: 36,
                color: "var(--secondary-color)",
                margin: 0,
              }}
            >
              Order Placed!
            </h2>
            <p style={{ color: "#64748b", marginTop: 12, fontSize: 16 }}>
              Your order <strong style={{ fontFamily: "monospace" }}>#{placedOrderId.slice(0, 8).toUpperCase()}</strong>{" "}
              has been received.
            </p>
            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <button
                onClick={() => router.push("/orders")}
                style={{
                  padding: "16px 36px",
                  borderRadius: 30,
                  border: "none",
                  background: "var(--primary-color)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                  width: "100%",
                  maxWidth: 280,
                  boxShadow: "0 8px 24px rgba(177,69,74,0.25)",
                }}
              >
                View Order Status
              </button>
              <button
                onClick={() => router.push("/menu")}
                style={{
                  padding: "14px 32px",
                  borderRadius: 30,
                  border: "2px solid var(--primary-color)",
                  background: "transparent",
                  color: "var(--primary-color)",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  width: "100%",
                  maxWidth: 280,
                }}
              >
                Order Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-cream)", fontFamily: "var(--plus-jakarta-sans)" }}>
      <AuthNavbar />

      <style>{`
        @media (max-width: 1024px) {
          .bento-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .bento-grid { padding: 100px 16px 40px !important; }
          .checkout-step-indicator { width: 200px !important; }
          .checkout-step-indicator span { font-size: 11px !important; }
          .checkout-step-indicator > div { width: 32px !important; height: 32px !important; }
          .checkout-heading { font-size: 28px !important; }
          .delivery-address-phone-grid { grid-template-columns: 1fr !important; }
          .delivery-address-phone-grid button { width: 100% !important; }
          .payment-grid { grid-template-columns: 1fr !important; }
          .checkout-buttons { flex-direction: column !important; gap: 12px !important; }
          .checkout-buttons button { width: 100% !important; justify-content: center !important; }
          .order-summary { max-height: 250px !important; }
        }
      `}</style>

      <div
        className="bento-grid"
        style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: "120px 40px 60px",
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gap: 40,
          alignItems: "start",
        }}
      >
        {/* Left Column: Checkout Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={() => router.back()}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "50%",
                  width: 48,
                  height: 48,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                  transition: "all 0.2s",
                }}
              >
                <ArrowLeft size={20} />
              </button>
              <h1
                style={{
                  fontFamily: "var(--playfair-display)",
                  fontSize: 40,
                  color: "var(--secondary-color)",
                  margin: 0,
                }}
                className="checkout-heading"
              >
                Checkout
              </h1>
            </div>

            {/* Step Indicator */}
            <div
              className="checkout-step-indicator"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "relative",
                width: 320,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  right: 20,
                  top: 20,
                  height: 2,
                  background: "#e2e8f0",
                  zIndex: 0,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  width: step === 1 ? "0%" : step === 2 ? "calc(50% - 20px)" : "calc(100% - 40px)",
                  top: 20,
                  height: 2,
                  background: "var(--primary-color)",
                  zIndex: 1,
                  transition: "width 0.3s ease",
                }}
              />

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 2 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: step >= 1 ? "var(--primary-color)" : "#fff",
                    border: step >= 1 ? "none" : "2px solid #e2e8f0",
                    color: step >= 1 ? "#fff" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    transition: "all 0.3s ease",
                    boxShadow: step >= 1 ? "0 4px 12px rgba(177,69,74,0.2)" : "none",
                  }}
                >
                  1
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: step >= 1 ? 700 : 500,
                    color: step >= 1 ? "var(--secondary-color)" : "#94a3b8",
                  }}
                >
                  Delivery
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 2 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: step >= 2 ? "var(--primary-color)" : "#fff",
                    border: step >= 2 ? "none" : "2px solid #e2e8f0",
                    color: step >= 2 ? "#fff" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    transition: "all 0.3s ease",
                    boxShadow: step >= 2 ? "0 4px 12px rgba(177,69,74,0.2)" : "none",
                  }}
                >
                  2
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: step >= 2 ? 700 : 500,
                    color: step >= 2 ? "var(--secondary-color)" : "#94a3b8",
                  }}
                >
                  Payment
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 2 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: step >= 3 ? "var(--primary-color)" : "#fff",
                    border: step >= 3 ? "none" : "2px solid #e2e8f0",
                    color: step >= 3 ? "#fff" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    transition: "all 0.3s ease",
                    boxShadow: step >= 3 ? "0 4px 12px rgba(177,69,74,0.2)" : "none",
                  }}
                >
                  3
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: step >= 3 ? 700 : 500,
                    color: step >= 3 ? "var(--secondary-color)" : "#94a3b8",
                  }}
                >
                  Confirm
                </span>
              </div>
            </div>
          </div>{" "}
          {isAreaRestricted && (
            <div
              style={{
                padding: "16px 20px",
                borderRadius: 16,
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#c2410c",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <strong>Delivery not available</strong> — We currently only deliver within select provinces. Please update
              your profile address or choose a different service.
            </div>
          )}
          {error && (
            <div
              style={{
                padding: "16px 20px",
                borderRadius: 16,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}
          {/* Step 1: Delivery */}
          {step === 1 && (
            <div
              className="animate-in fade-in slide-in-from-right-8 duration-300"
              style={{ background: "#fff", borderRadius: 28, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}
            >
              <h3
                style={{
                  margin: "0 0 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "var(--secondary-color)",
                  fontSize: 24,
                  fontFamily: "var(--playfair-display)",
                }}
              >
                <MapPin size={24} color="var(--primary-color)" /> Delivery Details
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Bottom: Address & Phone Row */}
                <div
                  className="delivery-address-phone-grid"
                  style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr auto", gap: 20, alignItems: "end" }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: 8,
                      }}
                    >
                      <label
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--secondary-color)",
                          display: "block",
                        }}
                      >
                        Delivery Address
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (profile) {
                            setAddress((profile as any).address || (profile as any).street_address || "");
                            if (profile.phone) setPhone(profile.phone);
                          }
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--primary-color)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          padding: 0,
                        }}
                        className="hover:underline"
                      >
                        Use Saved Profile Address
                      </button>
                    </div>
                    <textarea
                      ref={addressRef}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      rows={1}
                      placeholder="House #, Street, Barangay, City"
                      style={{
                        width: "100%",
                        padding: "16px 20px",
                        borderRadius: 16,
                        border: "1px solid #e2e8f0",
                        fontFamily: "var(--plus-jakarta-sans)",
                        fontSize: 15,
                        resize: "none",
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                        overflow: "hidden",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--primary-color)")}
                      onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--secondary-color)",
                        marginBottom: 8,
                        display: "block",
                      }}
                    >
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setPhoneError("");
                      }}
                      required
                      placeholder="09XX XXX XXXX"
                      style={{
                        width: "100%",
                        padding: "16px 20px",
                        borderRadius: 16,
                        border: `1px solid ${phoneError ? "#ef4444" : "#e2e8f0"}`,
                        fontFamily: "var(--plus-jakarta-sans)",
                        fontSize: 15,
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => {
                        if (!phoneError) e.target.style.borderColor = "var(--primary-color)";
                      }}
                      onBlur={(e) => {
                        if (!phoneError) e.target.style.borderColor = "#e2e8f0";
                      }}
                    />
                    {phoneError && (
                      <p style={{ color: "#ef4444", fontSize: 13, marginTop: 6, position: "absolute" }}>{phoneError}</p>
                    )}
                  </div>

                  <div>
                    <button
                      onClick={handleNextStep1}
                      style={{
                        padding: "16px 32px",
                        borderRadius: 16,
                        border: "none",
                        background: "var(--primary-color)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 16,
                        cursor: "pointer",
                        boxShadow: "0 8px 24px rgba(177,69,74,0.25)",
                        transition: "opacity 0.2s",
                        height: 56,
                        whiteSpace: "nowrap",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
                      onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
                    >
                      Continue to Payment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Step 2: Payment */}
          {step === 2 && (
            <div
              className="animate-in fade-in slide-in-from-right-8 duration-300"
              style={{ background: "#fff", borderRadius: 28, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}
            >
              <h3
                style={{
                  margin: "0 0 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "var(--secondary-color)",
                  fontSize: 24,
                  fontFamily: "var(--playfair-display)",
                }}
              >
                <CreditCard size={24} color="var(--primary-color)" /> Payment Method
              </h3>

              <div className="payment-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                {/* Left: Options */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <PaymentOption
                    selected={paymentMethod === "cod"}
                    onClick={() => setPaymentMethod("cod")}
                    icon={<Banknote size={24} color="var(--primary-color)" />}
                    title="Cash on Delivery"
                    subtitle="Pay when you receive your order"
                  />
                  <PaymentOption
                    selected={paymentMethod === "gcash"}
                    onClick={() => setPaymentMethod("gcash")}
                    icon={
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: "#0057e0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        G
                      </div>
                    }
                    title="GCash"
                    subtitle="Pay via GCash"
                  />
                </div>

                {/* Right: Details */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {paymentMethod !== "cod" ? (
                    <div
                      className="animate-in fade-in duration-300"
                      style={{
                        flex: 1,
                        padding: 24,
                        background: "#f8fafc",
                        borderRadius: 20,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      {paymentMethod === "gcash" && business?.gcash_qr_url ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 24 }}>
                          <div
                            onClick={() => setQrModalUrl(business.gcash_qr_url)}
                            style={{
                              width: 100,
                              height: 100,
                              position: "relative",
                              cursor: "pointer",
                              borderRadius: 16,
                              overflow: "hidden",
                              background: "#fff",
                              border: "1px solid #e2e8f0",
                              flexShrink: 0,
                            }}
                          >
                            <img
                              src={business.gcash_qr_url!}
                              alt="QR Code"
                              style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <div
                                style={{
                                  background: "rgba(0,0,0,0.6)",
                                  borderRadius: "50%",
                                  width: 44,
                                  height: 44,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backdropFilter: "blur(2px)",
                                  transition: "transform 0.2s",
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                                onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                              >
                                <ZoomIn size={22} color="#fff" />
                              </div>
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <p
                              style={{
                                margin: "0 0 6px",
                                fontSize: 16,
                                fontWeight: 800,
                                color: "var(--secondary-color)",
                              }}
                            >
                              Scan to pay via GCash
                            </p>
                            <p style={{ margin: 0, fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>
                              Transfer the exact Total Amount, then enter the reference number below.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize: 14, color: "#ef4444", margin: "0 0 20px" }}>
                          QR code not yet uploaded by admin. Please use Cash on Delivery.
                        </p>
                      )}
                      <label
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--secondary-color)",
                          marginBottom: 8,
                          display: "block",
                        }}
                      >
                        Reference Number
                      </label>
                      <input
                        type="text"
                        value={refNumber}
                        onChange={(e) => setRefNumber(e.target.value)}
                        placeholder="GCash Reference Number"
                        style={{
                          width: "100%",
                          padding: "16px 20px",
                          borderRadius: 16,
                          border: "1px solid #e2e8f0",
                          fontFamily: "var(--plus-jakarta-sans)",
                          fontSize: 15,
                          outline: "none",
                          boxSizing: "border-box",
                          background: "#fff",
                          transition: "border-color 0.2s",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--primary-color)")}
                        onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                      />
                    </div>
                  ) : (
                    <div
                      className="animate-in fade-in duration-300"
                      style={{
                        flex: 1,
                        padding: 24,
                        background: "#f8fafc",
                        borderRadius: 20,
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                      }}
                    >
                      <div>
                        <Banknote
                          size={48}
                          color="var(--primary-color)"
                          style={{ margin: "0 auto 16px", opacity: 0.2 }}
                        />
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--secondary-color)" }}>
                          No advance payment needed.
                        </p>
                        <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
                          Please prepare the exact amount upon delivery.
                        </p>
                      </div>
                    </div>
                  )}

                  <div
                    className="checkout-buttons"
                    style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", paddingTop: 24 }}
                  >
                    <button
                      onClick={() => setStep(1)}
                      style={{
                        padding: "16px 24px",
                        borderRadius: 16,
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                        color: "#64748b",
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
                    >
                      <ArrowLeft size={18} /> Back
                    </button>
                    <button
                      onClick={handleNextStep2}
                      style={{
                        padding: "16px 40px",
                        borderRadius: 16,
                        border: "none",
                        background: "var(--primary-color)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 16,
                        cursor: "pointer",
                        boxShadow: "0 8px 24px rgba(177,69,74,0.25)",
                        transition: "opacity 0.2s",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
                      onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
                    >
                      Confirm Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Step 3: Confirm Details */}
          {step === 3 && (
            <div
              className="animate-in fade-in slide-in-from-right-8 duration-300"
              style={{ background: "#fff", borderRadius: 28, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}
            >
              <h3
                style={{
                  margin: "0 0 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "var(--secondary-color)",
                  fontSize: 24,
                  fontFamily: "var(--playfair-display)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", transform: "translateY(-1px)" }}>
                  <CheckCircle size={26} color="var(--primary-color)" />
                </div>{" "}
                Final Review
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ padding: 24, borderRadius: 20, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: 14, color: "#64748b", fontWeight: 600 }}>
                        Delivery Address
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 16,
                          color: "var(--secondary-color)",
                          fontWeight: 700,
                          lineHeight: 1.5,
                        }}
                      >
                        {address}
                      </p>
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      style={{
                        color: "var(--primary-color)",
                        background: "none",
                        border: "none",
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Edit
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      paddingTop: 16,
                      borderTop: "1px solid #e2e8f0",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: 14, color: "#64748b", fontWeight: 600 }}>Phone Number</p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 16,
                          color: "var(--secondary-color)",
                          fontWeight: 700,
                          lineHeight: 1.5,
                        }}
                      >
                        {phone}
                      </p>
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      style={{
                        color: "var(--primary-color)",
                        background: "none",
                        border: "none",
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Edit
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      paddingTop: 16,
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: 14, color: "#64748b", fontWeight: 600 }}>
                        Payment Method
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 16,
                          color: "var(--secondary-color)",
                          fontWeight: 700,
                          textTransform: "capitalize",
                        }}
                      >
                        {paymentMethod === "cod" ? "Cash on Delivery" : paymentMethod}
                      </p>
                    </div>
                    <button
                      onClick={() => setStep(2)}
                      style={{
                        color: "var(--primary-color)",
                        background: "none",
                        border: "none",
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>

                <div
                  className="checkout-buttons"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 8,
                    paddingTop: 24,
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <button
                    onClick={() => setStep(2)}
                    disabled={submitting}
                    style={{
                      padding: "16px 24px",
                      borderRadius: 16,
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      color: "#64748b",
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: submitting ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      opacity: submitting ? 0.6 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    <ArrowLeft size={18} /> Back
                  </button>
                  <button
                    onClick={() => handleSubmit()}
                    disabled={submitting || cart.length === 0}
                    style={{
                      padding: "16px 48px",
                      borderRadius: 16,
                      border: "none",
                      background: "var(--primary-color)",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 16,
                      cursor: submitting || cart.length === 0 ? "not-allowed" : "pointer",
                      opacity: submitting || cart.length === 0 ? 0.6 : 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      boxShadow: "0 8px 24px rgba(177,69,74,0.25)",
                      transition: "opacity 0.2s",
                    }}
                  >
                    {submitting && <Loader2 size={20} className="animate-spin" />}
                    Place Order
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Order Summary (Sticky Bento Box) */}
        <div style={{ position: "sticky", top: 120 }}>
          <div style={{ background: "#fff", borderRadius: 28, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}>
            <h3
              style={{
                margin: "0 0 24px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "var(--secondary-color)",
                fontSize: 20,
                fontFamily: "var(--playfair-display)",
              }}
            >
              <ShoppingCart size={20} color="var(--primary-color)" /> Order Summary
            </h3>

            <div
              className="order-summary"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                maxHeight: 400,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {cart.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "#f1f5f9",
                    }}
                  >
                    <img
                      src={item.image || "/assets/food-hub.jpg"}
                      alt={item.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--secondary-color)" }}>
                      {item.name}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>
                      Qty: {item.quantity} {item.variant && `• ${item.variant}`}
                    </p>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 16, color: "var(--primary-color)" }}>
                    ₱{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "1px dashed #e2e8f0", marginTop: 24, paddingTop: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 15,
                  color: "#64748b",
                  marginBottom: 12,
                }}
              >
                <span>Subtotal</span>
                <span style={{ fontWeight: 600, color: "var(--secondary-color)" }}>₱{subtotal}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 15,
                  color: "#64748b",
                  marginBottom: 20,
                }}
              >
                <span>Delivery Fee</span>
                <span style={{ fontWeight: 600, color: "var(--secondary-color)" }}>
                  {fee === 0 ? "Free" : `₱${fee}`}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 24,
                  fontWeight: 900,
                  color: "var(--secondary-color)",
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: 24,
                  marginTop: 4,
                }}
              >
                <span>Total</span>
                <span style={{ color: "var(--primary-color)" }}>₱{total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {qrModalUrl && (
        <div
          onClick={() => setQrModalUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              padding: 40,
              borderRadius: 32,
              maxWidth: 500,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
            }}
          >
            <button
              onClick={() => setQrModalUrl(null)}
              style={{
                position: "absolute",
                top: 24,
                right: 24,
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#64748b",
              }}
            >
              <X size={20} />
            </button>
            <h3
              style={{
                margin: "0 0 24px",
                fontFamily: "var(--playfair-display)",
                fontSize: 28,
                color: "var(--secondary-color)",
              }}
            >
              Scan to Pay
            </h3>
            <img
              src={qrModalUrl}
              alt="QR Code"
              style={{ width: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: 16 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentOption({
  selected,
  onClick,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "20px",
        borderRadius: 20,
        border: selected ? "2px solid var(--primary-color)" : "1px solid #e2e8f0",
        background: selected ? "rgba(177,69,74,0.02)" : "#fff",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onClick={onClick}
    >
      <input
        type="radio"
        checked={selected}
        onChange={onClick}
        style={{ accentColor: "var(--primary-color)", width: 18, height: 18 }}
      />
      {icon}
      <div>
        <p style={{ margin: 0, fontWeight: 800, color: "var(--secondary-color)", fontSize: 16 }}>{title}</p>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>{subtitle}</p>
      </div>
    </label>
  );
}
