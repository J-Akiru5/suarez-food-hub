"use client";

import Link from "next/link";
import AuthNavbar from "../../components/AuthNavbar";

const STEPS = [
  {
    step: "01",
    title: "Browse Our Menu",
    description:
      "Visit our Menu page and explore our wide selection of Filipino food — dumplings, spring rolls, main dishes, desserts, and refreshing drinks.",
    icon: "🍽️",
  },
  {
    step: "02",
    title: "Add to Cart",
    description:
      "Click 'Add to Cart' on your favorite items. You can add multiple items and adjust quantities in your cart at any time.",
    icon: "🛒",
  },
  {
    step: "03",
    title: "Proceed to Checkout",
    description:
      "Go to your cart and click 'Proceed to Checkout'. Fill in your delivery details — name, address, and contact number.",
    icon: "📝",
  },
  {
    step: "04",
    title: "Choose Payment",
    description:
      "Select your preferred payment method: Cash on Delivery (COD) or GCash. For GCash, upload your payment screenshot as proof.",
    icon: "💳",
  },
  {
    step: "05",
    title: "Place Your Order",
    description:
      "Review your order summary and click 'Place Order'. You'll receive an order confirmation with your order ID.",
    icon: "✅",
  },
  {
    step: "06",
    title: "Track Your Order",
    description:
      "Use your order ID to track your delivery status in real-time. We'll notify you when your food is on its way!",
    icon: "🚴",
  },
];

export default function HowToOrderPage() {
  return (
    <div style={{ backgroundColor: "var(--color-cream)", minHeight: "100vh" }}>
      {/* Header */}
      <AuthNavbar />

      {/* ── Header ── */}
      <div
        className="mobile-padding"
        style={{
          background: "var(--primary-color)",
          padding: "80px 64px 60px",
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
      <div className="mobile-padding" style={{ padding: "80px 64px", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 40 }}>
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
                <span style={{ fontSize: 48 }}>{s.icon}</span>
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
        <div style={{ textAlign: "center", marginTop: 80 }}>
          <h2
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
