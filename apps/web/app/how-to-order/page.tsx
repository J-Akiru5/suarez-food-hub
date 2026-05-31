import {
  Search,
  ShoppingCart,
  CreditCard,
  Package,
  Truck,
  CheckCircle,
} from "lucide-react";
import { Navbar, Footer } from "@repo/ui";

const steps = [
  {
    number: "1",
    icon: <Search className="w-8 h-8" />,
    title: "Browse & Select",
    description:
      "Explore our menu and pick your favorites from a wide selection of authentic Filipino dishes.",
  },
  {
    number: "2",
    icon: <ShoppingCart className="w-8 h-8" />,
    title: "Add to Cart",
    description:
      "Choose your variant and quantity. Mix and match your favorite meals.",
  },
  {
    number: "3",
    icon: <Package className="w-8 h-8" />,
    title: "Checkout",
    description:
      "Fill in your delivery details and review your order summary.",
  },
  {
    number: "4",
    icon: <CreditCard className="w-8 h-8" />,
    title: "Payment",
    description:
      "Pay via Cash on Delivery (COD) or GCash — whichever is most convenient for you.",
  },
  {
    number: "5",
    icon: <Truck className="w-8 h-8" />,
    title: "Place Order",
    description:
      "Confirm and place your order. We&apos;ll start preparing your food right away.",
  },
  {
    number: "6",
    icon: <CheckCircle className="w-8 h-8" />,
    title: "Track & Enjoy",
    description:
      "Track your order in real-time. Enjoy your freshly prepared Filipino meal!",
  },
];

export default function HowToOrderPage() {
  return (
    <div className="min-h-screen bg-[#fff0de]">
      <Navbar showCartIcon={false} />

      {/* Hero Banner */}
      <section className="bg-[#b1454a] pt-[74px] pb-16 md:pb-20">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <h1
            className="text-4xl md:text-5xl lg:text-[56px] font-bold text-white mb-4 leading-tight"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            How to Order
          </h1>
          <p className="text-white/70 text-base md:text-lg max-w-xl mx-auto">
            Getting your favorite Filipino food is just 6 simple steps away
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 md:py-24">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div
                key={step.number}
                className="relative bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-8 text-center hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 group"
              >
                {/* Step Number Watermark */}
                <span
                  className="absolute top-4 right-6 text-[120px] font-black text-[#b1454a]/[0.06] leading-none select-none pointer-events-none"
                  style={{ fontFamily: "var(--playfair-display)" }}
                >
                  {step.number}
                </span>

                {/* Step Number Badge */}
                <div className="w-12 h-12 mx-auto mb-6 bg-[#b1454a]/10 rounded-full flex items-center justify-center">
                  <span className="text-[#b1454a] font-bold text-lg">
                    {step.number}
                  </span>
                </div>

                {/* Icon */}
                <div className="w-16 h-16 mx-auto mb-6 bg-[#b1454a]/10 rounded-2xl flex items-center justify-center text-[#b1454a] group-hover:bg-[#b1454a] group-hover:text-white transition-all duration-300">
                  {step.icon}
                </div>

                {/* Content */}
                <h3
                  className="text-xl font-bold text-gray-900 mb-3"
                  style={{ fontFamily: "var(--playfair-display)" }}
                >
                  {step.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#b1454a] py-16">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            Ready to Order?
          </h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
            Browse our menu and discover authentic Filipino dishes made fresh
            just for you.
          </p>
          <a
            href="/menu"
            className="inline-block bg-white text-[#b1454a] px-10 py-4 rounded-full font-bold text-base hover:bg-white/90 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-lg"
          >
            Order Now
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
