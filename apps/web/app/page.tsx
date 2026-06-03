"use client";

import { AboutSection, Footer, HeroSection, HowItWorks, TrendingSection } from "@repo/ui";
import AOS from "aos";
import { ArrowRight, Utensils } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import AuthNavbar from "../components/AuthNavbar";

interface Product {
  id: number;
  name: string;
  price: number;
  price_medium: number;
  price_large: number;
  image: string;
  category: string;
  rating: number;
  availability: "available" | "unavailable";
}

const getImageSrc = (img: string) => (img?.startsWith("http") || img?.startsWith("/") ? img : `/assets/uploads/${img}`);

export default function HomePage() {
  const [popularFoods, setPopularFoods] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    AOS.init({ duration: 600, offset: 50, once: true, disable: "mobile" });

    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const sorted = data.sort((a: Product, b: Product) => (b.rating || 5) - (a.rating || 5)).slice(0, 8);
          setPopularFoods(sorted);
        }
      })
      .catch(() => setFetchError("Failed to load featured items."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <AuthNavbar showCartIcon={false} />

      {/* Hero Section */}
      <HeroSection
        title="Taste Filipino Soul."
        description="From siomai to lumpia, main dishes to refreshing drinks — Suarez Food Hub brings authentic Filipino flavors straight to your door. Order online anytime!"
        ctaText="Order Now"
        ctaHref="/menu"
        images={[
          "/assets/steamed-siomai.jpg",
          "/assets/dynamite-lumpia.jpg",
          "/assets/fried-siomai.jpg",
          "/assets/pork-lumpia.jpg",
          "/assets/uploads/drinks.jpg",
        ]}
      />

      {/* How It Works */}
      <HowItWorks />

      {/* Popular Foods - Horizontal Scroll */}
      <section className="py-16 md:py-24 bg-[#FFF8F0]" id="menu">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10" data-aos="fade-up">
            <div>
              <h2
                className="text-3xl md:text-4xl font-bold text-[#1A1A1A] leading-tight"
                style={{ fontFamily: "var(--playfair-display)" }}
              >
                Popular Food
              </h2>
              <p className="text-[#1A1A1A]/50 text-sm mt-2 max-w-md">
                Our most loved dishes, chosen by thousands of happy customers
              </p>
            </div>
            <Link
              href="/menu"
              className="text-sm font-medium text-[#B85C38] hover:text-[#A0522D] transition-colors inline-flex items-center gap-1"
            >
              Explore All Food <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8" data-aos="fade-up">
            {loading ? (
              Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-full aspect-square rounded-[24px] bg-[#B85C38]/10 animate-pulse" />
                    <div className="w-20 h-3 bg-[#B85C38]/10 rounded mt-4 mx-auto animate-pulse" />
                  </div>
                ))
            ) : fetchError ? (
              <div className="col-span-full text-center w-full py-10">
                <Utensils size={48} color="#ef4444" className="mx-auto mb-4 opacity-30" />
                <p className="text-[#1A1A1A]/50 text-lg font-medium">
                  Could not load featured items.
                  <br />
                  Please refresh the page.
                </p>
              </div>
            ) : popularFoods.length === 0 ? (
              <div className="col-span-full text-center w-full py-10">
                <Utensils size={48} color="#B85C38" className="mx-auto mb-4 opacity-30" />
                <p className="text-[#1A1A1A]/50 text-lg font-medium">
                  Our chefs are preparing the popular menu.
                  <br />
                  Check back soon!
                </p>
              </div>
            ) : (
              popularFoods.map((item) => (
                <Link key={item.id} href="/menu" className="flex flex-col items-center group">
                  <div className="w-full aspect-square rounded-[24px] overflow-hidden bg-gray-50 mb-4 shadow-sm group-hover:shadow-md transition-all">
                    <img
                      src={getImageSrc(item.image)}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                      }}
                    />
                  </div>
                  <p
                    className="text-base font-semibold text-[#1A1A1A] text-center group-hover:text-[#B85C38] transition-colors"
                    style={{ fontFamily: "var(--plus-jakarta-sans)" }}
                  >
                    {item.name}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* About Us + Visit Us */}
      <AboutSection
        subtitle="About Us"
        title="Authentic Filipino food, delivered with love."
        description="At Suarez Food Hub, we serve a wide variety of freshly prepared Filipino dishes — from steamed and fried siomai, crispy lumpia, hearty main dishes, to sweet desserts and refreshing drinks. Every order is made with quality ingredients and passion."
        storeImage="/assets/store1.jpg"
        foodImage="/assets/steamed-siomai.jpg"
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
