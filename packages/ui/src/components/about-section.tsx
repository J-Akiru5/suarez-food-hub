"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface AboutSectionProps {
  title?: string;
  subtitle?: string;
  description?: string;
  storeImage?: string;
  foodImage?: string;
  className?: string;
}

const AboutSection = React.forwardRef<HTMLDivElement, AboutSectionProps>(
  (
    {
      title = "Deliciously Made, Right at Your Doorstep",
      subtitle = "About Us",
      description = "We started as a small food stall near WVSU, serving freshly made siomai and other Filipino favorites. Today, Suarez Food Hub continues the tradition of delivering quality food with a personal touch — affordable, fast, and always made with love.",
      storeImage = "/about-store.png",
      foodImage = "/about-siomai.png",
      className,
    },
    ref
  ) => {
    return (
      <section
        ref={ref}
        className={cn("py-16 md:py-24 bg-[#fff0de]", className)}
      >
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
            {/* Image Side */}
            <div className="flex-1 relative">
              <div className="bg-white rounded-3xl p-4 shadow-lg">
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden">
                    <img
                      src={storeImage}
                      alt="Suarez Food Hub store"
                      className="w-full h-[220px] object-cover"
                    />
                  </div>
                  <div className="border-t border-gray-100" />
                  <div className="rounded-2xl overflow-hidden">
                    <img
                      src={foodImage}
                      alt="Our signature siomai"
                      className="w-full h-[220px] object-cover"
                    />
                  </div>
                </div>

                {/* Order Now Button Overlay */}
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
                  <a
                    href="/menu"
                    className="inline-block bg-[#121212] text-white px-8 py-3 rounded-full font-semibold text-sm hover:bg-gray-800 transition-all duration-200 shadow-xl whitespace-nowrap"
                  >
                    Order Now
                  </a>
                </div>
              </div>
            </div>

            {/* Text Side */}
            <div className="flex-1 text-center md:text-left pt-8 md:pt-0">
              <p className="text-[#b1454a] text-sm font-semibold uppercase tracking-wider mb-3">
                {subtitle}
              </p>
              <h2
                className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-6"
                style={{ fontFamily: "var(--playfair-display)" }}
              >
                {title}
              </h2>
              <p className="text-gray-600 text-base leading-relaxed max-w-lg mx-auto md:mx-0">
                {description}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }
);
AboutSection.displayName = "AboutSection";

export { AboutSection };
