"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";

export interface HeroSectionProps {
  title?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  images?: string[];
}

const defaultImages = [
  "/assets/steamed-siomai.jpg",
  "/assets/pork-lumpia.jpg",
  "/assets/fried-siomai.jpg",
  "/assets/uploads/drinks.jpg",
  "/assets/dynamite-lumpia.jpg",
];

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  (
    {
      title = "Taste Filipino\nSoul.",
      description = "From siomai to lumpia, main dishes to refreshing drinks —\nSuarez Food Hub brings authentic Filipino flavors straight\nto your door. Order online anytime.",
      ctaText = "Order Now",
      ctaHref = "/menu",
      images = defaultImages,
    },
    ref
  ) => {
    const [scrollY, setScrollY] = React.useState(0);

    React.useEffect(() => {
      const handleScroll = () => setScrollY(window.scrollY);
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
      <section
        ref={ref}
        className="relative min-h-[90vh] flex overflow-hidden"
      >
        {/* Left: Brown background with text */}
        <div className="w-full lg:w-1/2 bg-[#8B3A2B] flex flex-col justify-center px-10 md:px-16 lg:px-24 pt-32 pb-20">
          <div className="max-w-[500px]" data-aos="fade-right">
            {/* Logo Badge */}
            <div className="w-32 h-32 mb-8 relative rounded-full overflow-hidden shadow-lg bg-white flex items-center justify-center">
              <img src="/logo.jpg" alt="Suarez Food Hub Logo" className="w-full h-full object-cover scale-[1.35]" />
            </div>

            <h1
              className="text-5xl md:text-6xl lg:text-[76px] font-bold text-white leading-[1.05] mb-6 whitespace-pre-line"
              style={{ fontFamily: "var(--playfair-display)" }}
            >
              {title}
            </h1>

            <p className="text-white/80 text-base md:text-lg leading-relaxed mb-10 max-w-[420px] whitespace-pre-line">
              {description}
            </p>

            <a
              href={ctaHref}
              className="inline-flex items-center gap-2 bg-[#F3E7D3] text-[#1A1A1A] px-6 py-3.5 rounded-full font-medium text-sm hover:bg-white transition-all duration-200 hover:-translate-y-0.5"
            >
              {ctaText}
              <ArrowRight size={16} />
            </a>
          </div>
        </div>

        {/* Right: Food images on cream background */}
        <div className="hidden lg:flex w-1/2 bg-[#FCFAF5] items-center justify-center px-12 pt-32 pb-20">
          <div
            className="w-full max-w-[540px] grid grid-cols-2 gap-5"
            data-aos="fade-left"
            style={{
              transform: `translateY(${scrollY * 0.03}px)`,
            }}
          >
            {/* Left Column */}
            <div className="flex flex-col gap-5 pt-8">
              <img
                src={images[0]}
                alt="Filipino food 1"
                className="w-full h-[240px] object-cover rounded-3xl shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder-food.png";
                }}
              />
              <img
                src={images[2]}
                alt="Filipino food 3"
                className="w-full h-[220px] object-cover rounded-3xl shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder-food.png";
                }}
              />
            </div>
            
            {/* Right Column */}
            <div className="flex flex-col gap-5">
              <img
                src={images[1]}
                alt="Filipino food 2"
                className="w-full h-[320px] object-cover rounded-3xl shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder-food.png";
                }}
              />
              <img
                src={images[3]}
                alt="Filipino food 4"
                className="w-full h-[200px] object-cover rounded-[32px] shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder-food.png";
                }}
              />
            </div>
          </div>
        </div>
      </section>
    );
  }
);
HeroSection.displayName = "HeroSection";

export { HeroSection };
