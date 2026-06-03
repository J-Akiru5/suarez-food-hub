"use client";

import { Mail, MapPin, Phone } from "lucide-react";
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
      title = "Authentic Filipino food, delivered with love.",
      subtitle = "About Us",
      description = "At Suarez Food Hub, we serve a wide variety of freshly prepared Filipino dishes — from steamed and fried siomai, crispy lumpia, hearty main dishes, to sweet desserts and refreshing drinks. Every order is made with quality ingredients and passion.",
      storeImage = "/assets/store1.jpg",
      foodImage = "/assets/steamed-siomai.jpg",
      className,
    },
    ref,
  ) => {
    return (
      <section ref={ref} className={cn("bg-[#FFF8F0]", className)}>
        <div className="max-w-[1280px] mx-auto">
          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {/* Left: About Us */}
            <div className="flex-1 py-16 px-6 md:px-12 lg:px-16 flex flex-col justify-center" data-aos="fade-right">
              <p className="text-[#B85C38] text-sm font-semibold uppercase tracking-wider mb-3">{subtitle}</p>
              <h2
                className="text-3xl md:text-4xl font-bold text-[#1A1A1A] leading-tight mb-6"
                style={{ fontFamily: "var(--playfair-display)" }}
              >
                {title}
              </h2>
              <p className="text-[#1A1A1A]/60 text-base leading-relaxed mb-8 max-w-md">{description}</p>

              {/* Overlapping Images */}
              <div className="flex gap-4">
                <div className="relative w-40 h-32 rounded-xl overflow-hidden shadow-lg -rotate-3">
                  <img
                    src={storeImage}
                    alt="Store"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                    }}
                  />
                </div>
                <div className="relative w-48 h-36 rounded-xl overflow-hidden shadow-lg rotate-2 -mt-4">
                  <img
                    src={foodImage}
                    alt="Food"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Visit Us */}
            <div
              className="flex-1 bg-[#1A1A1A] py-16 px-6 md:px-12 lg:px-16 flex flex-col justify-center"
              data-aos="fade-left"
            >
              <p className="text-[#B85C38] text-sm font-semibold uppercase tracking-wider mb-3">Find Us</p>
              <h2
                className="text-3xl md:text-4xl font-bold text-white leading-tight mb-8"
                style={{ fontFamily: "var(--playfair-display)" }}
              >
                Visit Us in Person
              </h2>

              {/* Map */}
              <div className="rounded-2xl overflow-hidden mb-8 h-[240px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!4v1780205155562!6m8!1m7!1sLdyddZPCgOh3axiDrqs4JQ!2m2!1d10.95008737384947!2d122.5065507710989!3f4.489574006221211!4f0.3963730569948183!5f0.4000000000000002"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Suarez Food Hub Location"
                />
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-white/70 text-sm">
                  <MapPin size={16} className="text-[#B85C38] flex-shrink-0" />
                  <span>Janiuay, Western Visayas, Philippines</span>
                </div>
                <div className="flex items-center gap-3 text-white/70 text-sm">
                  <Phone size={16} className="text-[#B85C38] flex-shrink-0" />
                  <span>+63 912 345 6789</span>
                </div>
                <div className="flex items-center gap-3 text-white/70 text-sm">
                  <Mail size={16} className="text-[#B85C38] flex-shrink-0" />
                  <span>info@suarezfoodhub.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  },
);
AboutSection.displayName = "AboutSection";

export { AboutSection };
