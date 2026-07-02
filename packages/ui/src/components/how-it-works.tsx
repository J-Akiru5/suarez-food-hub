import { Check, Search, ShoppingCart } from "lucide-react";
import * as React from "react";

export interface StepProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface HowItWorksProps {
  steps?: StepProps[];
  className?: string;
}

const defaultSteps: StepProps[] = [
  {
    icon: <Search className="w-5 h-5" />,
    title: "Choose Your Cravings",
    description: "Browse our menu and pick your favorite dishes from a wide selection of Filipino classics.",
  },
  {
    icon: <ShoppingCart className="w-5 h-5" />,
    title: "Place Your Order",
    description: "Add items to your cart and checkout in seconds — quick and easy, no hassle.",
  },
  {
    icon: <Check className="w-5 h-5" />,
    title: "Enjoy Your Meal",
    description: "Pick up your order or have it delivered right to your doorstep, fresh and hot.",
  },
];

const HowItWorks = React.forwardRef<HTMLDivElement, HowItWorksProps>(({ steps = defaultSteps, className }, ref) => {
  return (
    <section ref={ref} className="py-20 md:py-28 bg-cream">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="flex flex-col items-center text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary-color)] mb-4">
            How It Works
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-[44px] font-bold text-[var(--secondary-color)] leading-tight font-heading">
            Order in Three Steps
          </h2>
          <p className="text-sm text-[var(--secondary-color)]/50 mt-3 max-w-md">
            From browsing to enjoying — your food arrives in no time
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative bg-white rounded-2xl p-8 md:p-10 border border-[var(--primary-color)]/10 shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <span className="absolute top-4 right-6 text-[64px] font-bold leading-none text-[var(--primary-color)]/5 select-none font-heading">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--primary-color)]/10 text-[var(--primary-color)] mb-6">
                {step.icon}
              </div>

              <h3 className="text-lg font-bold text-[var(--secondary-color)] mb-3 font-heading">{step.title}</h3>

              <p className="text-sm text-[var(--secondary-color)]/55 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
HowItWorks.displayName = "HowItWorks";

export { HowItWorks };
