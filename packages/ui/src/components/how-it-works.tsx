"use client";

import { Check, Search, ShoppingCart } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

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
    icon: <Search className="w-6 h-6" />,
    title: "Choose Your Cravings",
    description: "Browse our menu and pick your favorite dishes from a wide selection.",
  },
  {
    icon: <ShoppingCart className="w-6 h-6" />,
    title: "Place Your Order",
    description: "Add items to your cart and checkout in seconds — quick and easy.",
  },
  {
    icon: <Check className="w-6 h-6" />,
    title: "Enjoy Your Meal",
    description: "Pick up your order or have it delivered right to your doorstep.",
  },
];

const HowItWorks = React.forwardRef<HTMLDivElement, HowItWorksProps>(({ steps = defaultSteps, className }, ref) => {
  return (
    <section ref={ref} className={cn("py-20 md:py-28", className)} style={{ background: "var(--color-cream)" }}>
      <div className="max-w-[1280px] mx-auto px-6 text-center">
        <h2
          className="text-3xl md:text-4xl lg:text-[44px] font-bold mb-4 leading-tight"
          style={{ color: "var(--secondary-color)", fontFamily: "var(--playfair-display)" }}
        >
          Order in 3 Easy Steps
        </h2>
        <p
          className="text-sm mb-16 max-w-md mx-auto"
          style={{ color: "color-mix(in srgb, var(--secondary-color) 50%, transparent)" }}
        >
          Interactive high-resolution food gallery
        </p>

        <div className="flex flex-col md:flex-row items-stretch justify-center gap-6">
          {steps.map((step, index) => (
            <div key={index} className="glass-card p-8 text-center flex-1 max-w-sm w-full mx-auto">
              <div
                className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center"
                style={{
                  background: "color-mix(in srgb, var(--primary-color) 10%, transparent)",
                  color: "var(--primary-color)",
                }}
              >
                {step.icon}
              </div>
              <h3
                className="text-lg font-bold mb-2"
                style={{ color: "var(--secondary-color)", fontFamily: "var(--playfair-display)" }}
              >
                {step.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "color-mix(in srgb, var(--secondary-color) 50%, transparent)" }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
HowItWorks.displayName = "HowItWorks";

export { HowItWorks };
