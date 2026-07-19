import { ArrowRight } from "lucide-react";
import * as React from "react";

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
      description = "From siomai to lumpia, main dishes to refreshing drinks — Suarez Food Hub brings authentic Filipino flavors straight to your door.",
      ctaText = "Order Now",
      ctaHref = "/menu",
      images = defaultImages,
    },
    ref,
  ) => {
    return (
      <section
        ref={ref}
        className="relative flex flex-col lg:flex-row items-stretch overflow-hidden bg-cream"
        style={{ minHeight: "calc(100dvh - 72px)", marginTop: "72px" }}
      >
        {/* Left – text vertically centered */}
        <div className="relative z-10 w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 py-12 lg:py-16">
          <div className="max-w-[520px]">
            <div className="flex items-center gap-4 mb-6">
              <img
                src="/logo.png"
                alt="Suarez Food Hub Logo"
                className="h-[72px] w-[72px] object-contain drop-shadow-sm transition-transform hover:scale-105"
              />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-px w-8 bg-[var(--primary-color)]" />
                  <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary-color)]">
                    Est. 2024
                  </span>
                </div>
                <span className="text-2xl font-bold text-[var(--primary-color)] font-heading leading-none">
                  Suarez Food Hub
                </span>
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[56px] xl:text-[64px] font-bold text-[var(--secondary-color)] leading-[1.05] mb-4 whitespace-pre-line text-balance font-heading">
              {title}
            </h1>

            <p className="text-sm sm:text-base text-[var(--secondary-color)]/60 leading-relaxed mb-6 max-w-[440px]">
              {description}
            </p>

            <div className="flex items-center gap-4">
              <a
                href={ctaHref}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-semibold text-sm text-white transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97] shadow-lg shadow-[var(--primary-color)]/25"
                style={{ background: "var(--primary-color)" }}
              >
                {ctaText}
                <ArrowRight size={16} />
              </a>
              <a
                href="/about"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-[var(--secondary-color)] transition-all duration-300 hover:-translate-y-0.5"
                style={{ border: "1.5px solid var(--secondary-color)" }}
              >
                Our Story
              </a>
            </div>
          </div>
        </div>

        {/* Right – images fill full height */}
        <div className="relative w-full lg:w-1/2 min-h-[50vh] lg:min-h-0 overflow-hidden bg-[var(--primary-color)]/5">
          <div className="grid grid-cols-2 gap-3 w-full h-full p-4 lg:p-6">
            <div className="rounded-2xl overflow-hidden shadow-lg rotate-[-1deg]">
              <img
                src={images[0]}
                alt=""
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                }}
              />
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg rotate-[1deg]">
              <img
                src={images[1]}
                alt=""
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                }}
              />
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg col-span-2 max-h-[180px] rotate-[-0.5deg]">
              <img
                src={images[2]}
                alt=""
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                }}
              />
            </div>
          </div>

          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(to left, transparent 30%, var(--color-cream) 95%)",
            }}
          />
        </div>
      </section>
    );
  },
);
HeroSection.displayName = "HeroSection";

export { HeroSection };
