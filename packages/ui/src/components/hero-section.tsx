"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface HeroSectionProps {
  title?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  imageSrc?: string;
}

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  (
    {
      title = "Crave-worthy Bites, Delivered Fresh",
      description = "Discover the best food near WVSU — from crispy siomai to savory mains. Quick, affordable, and made to satisfy your cravings.",
      ctaText = "Explore Menu",
      ctaHref = "/menu",
      imageSrc = "/hero-food.png",
    },
    ref
  ) => {
    return (
      <section
        ref={ref}
        className="relative overflow-hidden bg-[#fff0de]"
      >
        <div className="max-w-[1280px] mx-auto px-6 py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-center gap-12">
            {/* Image Side */}
            <div className="flex-1 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={imageSrc}
                  alt="Featured food"
                  className="w-full h-[300px] md:h-[480px] object-cover"
                />
                {/* Crimson Overlay */}
                <div className="absolute inset-0 bg-[#b1454a]/10" />
              </div>
            </div>

            {/* Content Side */}
            <div className="flex-1 text-center md:text-left">
              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6"
                style={{ fontFamily: "var(--playfair-display)" }}
              >
                {title}
              </h1>
              <p className="text-gray-600 text-base md:text-lg leading-relaxed mb-8 max-w-lg mx-auto md:mx-0">
                {description}
              </p>
              <a
                href={ctaHref}
                className="inline-block bg-[#b1454a] text-white px-8 py-4 rounded-full font-semibold text-base hover:bg-[#9a3a3f] transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-lg"
              >
                {ctaText}
              </a>

              {/* Testimonial */}
              <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 md:justify-start justify-center">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gray-300 border-2 border-[#fff0de] overflow-hidden"
                    >
                      <img
                        src={`/avatars/avatar-${i}.png`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-center sm:text-left">
                  <p className="font-bold text-gray-900 text-sm">24k+ Happy Customers</p>
                  <p className="text-xs text-gray-500 italic">
                    &ldquo;Best food hub near the university!&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
);
HeroSection.displayName = "HeroSection";

export { HeroSection };
