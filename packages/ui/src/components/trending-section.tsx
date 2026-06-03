"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface TrendingItem {
  name: string;
  image: string;
}

export interface TrendingSectionProps {
  title: string;
  description?: string;
  items: TrendingItem[];
  className?: string;
}

const TrendingSection = React.forwardRef<HTMLDivElement, TrendingSectionProps>(
  ({ title, description, items, className }, ref) => {
    return (
      <section ref={ref} className={cn("py-16 md:py-24 bg-[#FFF8F0]", className)}>
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div>
              <h2
                className="text-3xl md:text-4xl font-bold text-[#1A1A1A] leading-tight"
                style={{ fontFamily: "var(--playfair-display)" }}
              >
                {title}
              </h2>
              {description && <p className="text-[#1A1A1A]/50 text-sm mt-2 max-w-md">{description}</p>}
            </div>
          </div>

          <div className="trending-scroll hide-scrollbar">
            {items.map((item, index) => (
              <div key={index} className="trending-scroll-item">
                <img
                  src={item.image}
                  alt={item.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                  }}
                />
                <p
                  className="text-sm font-medium text-[#1A1A1A] mt-3 text-center"
                  style={{ fontFamily: "var(--plus-jakarta-sans)" }}
                >
                  {item.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  },
);
TrendingSection.displayName = "TrendingSection";

export { TrendingSection };
