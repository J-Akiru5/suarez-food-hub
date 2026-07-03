import * as React from "react";

export interface AboutSectionProps {
  title?: string;
  subtitle?: string;
  description?: string;
  storeImage?: string;
  foodImage?: string;
  mapSrc?: string;
  address?: string;
  phone?: string;
  email?: string;
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
      mapSrc = "https://www.google.com/maps/embed?pb=!4v1780205155562!6m8!1m7!1sLdyddZPCgOh3axiDrqs4JQ!2m2!1d10.95008737384947!2d122.5065507710989!3f4.489574006221211!4f0.3963730569948183!5f0.4000000000000002",
      address = "Janiuay, Western Visayas, Philippines",
      phone = "+63 912 345 6789",
      email = "info@suarezfoodhub.com",
      className,
    },
    ref,
  ) => {
    return (
      <section ref={ref} className="bg-cream">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex flex-col lg:flex-row min-h-[600px]">
            <div className="flex-1 py-16 px-6 md:px-12 lg:px-16 flex flex-col justify-center">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary-color)] mb-3">
                {subtitle}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--secondary-color)] leading-tight mb-6 font-heading">
                {title}
              </h2>
              <p className="text-base leading-relaxed mb-10 max-w-md text-[var(--secondary-color)]/60">{description}</p>

              <div className="flex gap-4 items-end">
                <div className="relative w-40 h-32 rounded-xl overflow-hidden shadow-lg -rotate-3">
                  <img
                    src={storeImage}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                    }}
                  />
                </div>
                <div className="relative w-48 h-36 rounded-xl overflow-hidden shadow-lg rotate-2 -mb-2">
                  <img
                    src={foodImage}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 py-16 px-6 md:px-12 lg:px-16 flex flex-col justify-center bg-near-black">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary-color)] mb-3">
                Find Us
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-8 font-heading">
                Visit Us in Person
              </h2>

              <div className="rounded-2xl overflow-hidden h-[320px]">
                <iframe
                  src={mapSrc}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Suarez Food Hub Location"
                />
              </div>

              <p className="text-white/50 text-sm mt-4">
                <span className="text-[var(--primary-color)]">📍</span> {address}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  },
);
AboutSection.displayName = "AboutSection";

export { AboutSection };
