"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface StepProps {
  step: string;
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
    step: "1",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: "Choose Your Cravings",
    description: "Browse our menu and pick your favorite dishes from a wide selection.",
  },
  {
    step: "2",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    ),
    title: "Place Your Order",
    description: "Add items to your cart and checkout in seconds — quick and easy.",
  },
  {
    step: "3",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    title: "Enjoy Your Meal",
    description: "Pick up your order or have it delivered right to your doorstep.",
  },
];

const HowItWorks = React.forwardRef<HTMLDivElement, HowItWorksProps>(
  ({ steps = defaultSteps, className }, ref) => {
    return (
      <section
        ref={ref}
        className={cn("bg-[#b1454a] py-20 md:py-28", className)}
      >
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <h2
            className="text-4xl md:text-5xl lg:text-[56px] font-bold text-white mb-16 leading-tight"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            Order in 3 Easy Steps
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative bg-white/10 border border-white/15 backdrop-blur-sm rounded-32 p-8 text-center group hover:bg-white/15 transition-all duration-300"
              >
                {/* Step Number Watermark */}
                <span
                  className="absolute top-4 right-6 text-[140px] font-black text-white/[0.05] leading-none select-none pointer-events-none"
                  style={{ fontFamily: "var(--playfair-display)" }}
                >
                  {step.step}
                </span>

                {/* Icon */}
                <div className="w-16 h-16 mx-auto mb-6 bg-white/15 rounded-2xl flex items-center justify-center text-white">
                  {step.icon}
                </div>

                {/* Content */}
                <h3
                  className="text-xl font-bold text-white mb-3"
                  style={{ fontFamily: "var(--playfair-display)" }}
                >
                  {step.title}
                </h3>
                <p className="text-white/70 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <a
            href="/menu"
            className="inline-block bg-white text-[#b1454a] px-10 py-4 rounded-full font-bold text-base hover:bg-white/90 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-lg"
          >
            Order Now
          </a>
        </div>
      </section>
    );
  }
);
HowItWorks.displayName = "HowItWorks";

export { HowItWorks };
