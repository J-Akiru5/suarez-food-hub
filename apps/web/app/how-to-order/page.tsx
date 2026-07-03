"use client";

import { Banknote, CheckCircle, PackageSearch, ShoppingBag, ShoppingCart, Truck } from "lucide-react";
import Link from "next/link";
import AuthNavbar from "../../components/AuthNavbar";

const STEPS = [
  {
    step: "01",
    title: "Browse the Menu",
    description:
      "Explore our selection of authentic Filipino dishes, ranging from fresh appetizers to full main courses.",
    icon: PackageSearch,
  },
  {
    step: "02",
    title: "Add Items",
    description: "Select your preferred portions and add items directly to your cart.",
    icon: ShoppingBag,
  },
  {
    step: "03",
    title: "Checkout",
    description: "Review your order and provide your accurate delivery details.",
    icon: ShoppingCart,
  },
  {
    step: "04",
    title: "Payment",
    description: "Choose between Cash on Delivery or GCash. Upload a payment receipt if using GCash.",
    icon: Banknote,
  },
  {
    step: "05",
    title: "Confirmation",
    description: "Receive an instant order confirmation along with your unique order tracking ID.",
    icon: CheckCircle,
  },
  {
    step: "06",
    title: "Track Delivery",
    description: "Monitor your order status in real-time until it arrives at your doorstep.",
    icon: Truck,
  },
];

export default function HowToOrderPage() {
  return (
    <div style={{ backgroundColor: "var(--color-cream)", minHeight: "100vh" }}>
      {/* Header */}
      <AuthNavbar />

      <style>{`
        @media (max-width: 640px) {
          .how-to-order-header { padding: 60px 24px !important; }
          .how-to-order-header h1 { font-size: 36px !important; }
          .how-to-order-header p { font-size: 16px !important; }
          .how-to-order-content { padding: 40px 16px !important; }
          .how-to-order-content .steps-grid { gap: 24px !important; }
          .how-to-order-cta { margin-top: 48px !important; }
          .how-to-order-cta-heading { font-size: 32px !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div
        className="how-to-order-header mobile-padding"
        style={{
          marginTop: "72px",
          background: "var(--primary-color)",
          padding: "60px 64px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <h1 style={{ fontFamily: "var(--playfair-display)", fontSize: 64, color: "#fff", margin: 0, lineHeight: 1.1 }}>
          How to Order
        </h1>
        <p
          style={{
            fontFamily: "var(--plus-jakarta-sans)",
            color: "rgba(255,255,255,0.85)",
            fontSize: 20,
            marginTop: 16,
            maxWidth: 500,
            margin: "16px auto 0",
          }}
        >
          Ordering from Suarez Food Hub is simple and fast. Follow these steps!
        </p>
      </div>

      {/* ── Content ── */}
      <div className="how-to-order-content mobile-padding" style={{ padding: "80px 64px", maxWidth: 960, margin: "0 auto" }}>
        <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 40 }}>
          {STEPS.map((s) => (
            <div
              key={s.step}
              style={{
                background: "#fff",
                borderRadius: 24,
                padding: 36,
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--primary-color)" }}>
                  <s.icon size={40} strokeWidth={1.5} />
                </span>
                <span
                  style={{
                    fontFamily: "var(--playfair-display)",
                    fontSize: 52,
                    fontWeight: 800,
                    color: "var(--primary-color)",
                    opacity: 0.15,
                    lineHeight: 1,
                  }}
                >
                  {s.step}
                </span>
              </div>
              <h3
                style={{
                  fontFamily: "var(--playfair-display)",
                  fontSize: 24,
                  color: "var(--secondary-color)",
                  margin: 0,
                }}
              >
                {s.title}
              </h3>
              <p
                style={{
                  fontFamily: "var(--plus-jakarta-sans)",
                  fontSize: 15,
                  color: "var(--secondary-color)",
                  opacity: 0.75,
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {s.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="how-to-order-cta" style={{ textAlign: "center", marginTop: 80 }}>
          <h2
            className="how-to-order-cta-heading"
            style={{
              fontFamily: "var(--playfair-display)",
              fontSize: 44,
              color: "var(--secondary-color)",
              marginBottom: 16,
            }}
          >
            Ready to eat?
          </h2>
          <Link
            href="/menu"
            style={{
              display: "inline-block",
              padding: "20px 48px",
              background: "var(--primary-color)",
              color: "#fff",
              borderRadius: "40px",
              fontFamily: "var(--plus-jakarta-sans)",
              fontWeight: 700,
              fontSize: 18,
              textDecoration: "none",
            }}
          >
            Order Now →
          </Link>
        </div>
      </div>
    </div>
  );
}
