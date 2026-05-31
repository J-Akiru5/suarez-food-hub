"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../lib/utils";

export interface TrendingItem {
  name: string;
}

export interface TrendingSectionProps {
  title: string;
  subtitle: string;
  description: string;
  items: TrendingItem[];
  imageSrc: string;
  imageAlt: string;
  reversed?: boolean;
  className?: string;
}

const TrendingSection = React.forwardRef<HTMLDivElement, TrendingSectionProps>(
  (
    {
      title,
      subtitle,
      description,
      items,
      imageSrc,
      imageAlt,
      reversed = false,
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
          <div
            className={cn(
              "flex flex-col items-center gap-12 md:gap-16",
              reversed ? "md:flex-row-reverse" : "md:flex-row"
            )}
          >
            {/* Content Side */}
            <div className="flex-1 text-center md:text-left">
              <p className="text-[#b1454a] text-base md:text-[18px] font-semibold uppercase tracking-wider mb-3">
                {subtitle}
              </p>
              <h2
                className="text-4xl md:text-5xl lg:text-[64px] font-bold text-gray-900 leading-tight mb-6"
                style={{ fontFamily: "var(--playfair-display)" }}
              >
                {title}
              </h2>
              <p className="text-gray-600 text-base leading-relaxed mb-8 max-w-lg mx-auto md:mx-0">
                {description}
              </p>

              {/* Checkmark List */}
              <ul className="space-y-4">
                {items.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 justify-center md:justify-start">
                    <div className="w-7 h-7 rounded-full bg-[#b1454a]/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-[#b1454a]" />
                    </div>
                    <span className="text-gray-700 text-sm font-medium">
                      {item.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Image Side */}
            <div className="flex-1">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={imageSrc}
                  alt={imageAlt}
                  className="w-full h-[300px] md:h-[480px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
);
TrendingSection.displayName = "TrendingSection";

export { TrendingSection };
