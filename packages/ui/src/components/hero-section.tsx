"use client";

import { ArrowRight, Star } from "lucide-react";
import * as React from "react";
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
    ref,
  ) => {
    const [scrollY, setScrollY] = React.useState(0);
    const [isGuest, setIsGuest] = React.useState(false);

    React.useEffect(() => {
      setIsGuest(document.documentElement.classList.contains("guest-mode"));
      const observer = new MutationObserver(() => {
        setIsGuest(document.documentElement.classList.contains("guest-mode"));
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    }, []);

    React.useEffect(() => {
      const handleScroll = () => setScrollY(window.scrollY);
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (isGuest) {
      return (
        <section
          ref={ref}
          className="relative overflow-hidden"
          style={{ background: "linear-gradient(to bottom right, var(--primary-color), white, var(--primary-color))" }}
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmOTczMTYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tNC0yYTEgMSAwIDEwMC0yIDAgMSAwIDAwMCAyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <div
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium"
                  style={{
                    borderColor: "var(--primary-color)",
                    color: "var(--primary-color)",
                    background: "color-mix(in srgb, var(--primary-color) 10%, transparent)",
                  }}
                >
                  <Star className="h-4 w-4 fill-current" />
                  Authentic Filipino Flavors
                </div>
                <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                  Suarez
                  <span style={{ color: "var(--primary-color)" }}> Food Hub</span>
                </h1>
                <p className="mt-6 max-w-lg text-lg text-gray-600">{description.replace(/\n/g, " ")}</p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <a
                    href={ctaHref}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-white transition-all hover:-translate-y-0.5"
                    style={{ background: "var(--primary-color)" }}
                  >
                    {ctaText}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <a
                    href="/about"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium border transition-all hover:-translate-y-0.5"
                    style={{ borderColor: "var(--primary-color)", color: "var(--primary-color)" }}
                  >
                    Our Story
                  </a>
                </div>
              </div>
              <div className="relative hidden lg:block">
                <div
                  className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl"
                  style={{
                    background:
                      "linear-gradient(to right, var(--primary-color), color-mix(in srgb, var(--primary-color) 50%, white))",
                  }}
                />
                <div className="relative rounded-3xl bg-white p-8 shadow-xl">
                  <div className="grid grid-cols-2 gap-4">
                    {images.slice(0, 4).map((img, i) => (
                      <div
                        key={i}
                        className="rounded-2xl overflow-hidden shadow-sm transition hover:shadow-md"
                        style={{ background: "color-mix(in srgb, var(--primary-color) 5%, white)" }}
                      >
                        <img
                          src={img}
                          alt={`Filipino food ${i + 1}`}
                          className="w-full h-32 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section ref={ref} className="relative min-h-[90vh] flex overflow-hidden">
        {/* Left: Brown background with text */}
        <div
          className="w-full lg:w-1/2 flex flex-col justify-center px-10 md:px-16 lg:px-24 pt-32 pb-20"
          style={{ background: "var(--primary-dark)" }}
        >
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
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-medium text-sm transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "color-mix(in srgb, var(--primary-color) 20%, white)",
                color: "var(--secondary-color)",
              }}
            >
              {ctaText}
              <ArrowRight size={16} />
            </a>
          </div>
        </div>

        {/* Right: Food images on cream background */}
        <div
          className="hidden lg:flex w-1/2 items-center justify-center px-12 pt-32 pb-20"
          style={{ background: "color-mix(in srgb, var(--primary-color) 3%, white)" }}
        >
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
                  (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                }}
              />
              <img
                src={images[2]}
                alt="Filipino food 3"
                className="w-full h-[220px] object-cover rounded-3xl shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
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
                  (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                }}
              />
              <img
                src={images[3]}
                alt="Filipino food 4"
                className="w-full h-[200px] object-cover rounded-[32px] shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                }}
              />
            </div>
          </div>
        </div>
      </section>
    );
  },
);
HeroSection.displayName = "HeroSection";

export { HeroSection };
