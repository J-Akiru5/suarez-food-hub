"use client";

import Link from "next/link";
import {
  Search,
  ShoppingCart,
  CreditCard,
  Truck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    step: "1",
    icon: Search,
    title: "Browse the Menu",
    description:
      "Explore our wide selection of Filipino dishes. Use categories or the AI Craving Matcher to find exactly what you're hungry for.",
  },
  {
    step: "2",
    icon: ShoppingCart,
    title: "Add to Cart",
    description:
      "Select your items, choose variants like size or preparation, and add them to your receipt-style cart. Adjust quantities as needed.",
  },
  {
    step: "3",
    icon: CreditCard,
    title: "Checkout & Pay",
    description:
      "Enter your delivery address and contact number. Choose Cash on Delivery or GCash as your payment method.",
  },
  {
    step: "4",
    icon: Truck,
    title: "Track Your Order",
    description:
      "Once confirmed, track your order status in real-time. When out for delivery, see your rider's location on the map.",
  },
  {
    step: "5",
    icon: CheckCircle2,
    title: "Enjoy Your Meal",
    description:
      "Receive your freshly prepared food and enjoy! Don't forget to rate your experience.",
  },
];

export default function HowToOrderPage() {
  return (
    <div>
      {/* Hero Banner */}
      <section className="bg-[#b1454a] py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <h1
            className="text-4xl md:text-5xl lg:text-[64px] font-bold text-white leading-tight"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            How to Order
          </h1>
          <p className="text-white/80 text-base md:text-lg mt-4 max-w-lg mx-auto">
            Getting your favorite food is easy! Follow these simple steps.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 bg-creamson">
        <div className="max-w-[800px] mx-auto px-6">
          <div className="space-y-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-6 md:p-8 relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                >
                  {/* Step Number Watermark */}
                  <span
                    className="absolute top-4 right-6 text-[120px] font-black text-[#b1454a]/[0.04] leading-none select-none pointer-events-none"
                    style={{ fontFamily: "var(--playfair-display)" }}
                  >
                    {step.step}
                  </span>

                  <div className="flex items-start gap-5">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-2xl bg-[#b1454a]/10 flex items-center justify-center shrink-0">
                      <Icon className="h-7 w-7 text-[#b1454a]" />
                    </div>

                    {/* Content */}
                    <div>
                      <h3
                        className="text-xl font-bold text-gray-900 mb-2"
                        style={{ fontFamily: "var(--playfair-display)" }}
                      >
                        {step.title}
                      </h3>
                      <p className="text-gray-500 text-sm leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 bg-[#b1454a] text-white px-10 py-4 rounded-full font-bold text-base hover:bg-[#9a3a3f] transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-lg"
            >
              Start Ordering
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
