"use client";

import { AboutSection, Footer, HeroSection, HowItWorks } from "@repo/ui";
import { ArrowRight, Utensils } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import AuthNavbar from "../components/AuthNavbar";

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  availability: string;
  variant_type: string;
  variants: { id: string; name: string; price: number; quantity: number }[];
}

const getImageSrc = (img: string) => (img?.startsWith("http") || img?.startsWith("/") ? img : `/assets/uploads/${img}`);

export default function HomePage() {
  const [popularFoods, setPopularFoods] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((response) => {
        const data = response.data || response;
        if (Array.isArray(data)) {
          const sorted = data.sort((a: Product, b: Product) => (b.rating || 5) - (a.rating || 5)).slice(0, 8);
          setPopularFoods(sorted);
        }
      })
      .catch(() => setFetchError("Failed to load featured items."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      <AuthNavbar showCartIcon={false} />

      <HeroSection />

      <HowItWorks />

      <section className="py-20 md:py-28 bg-cream" id="menu">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary-color)] mb-3 block">
                From the Kitchen
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--secondary-color)] leading-tight font-heading">
                Featured Products
              </h2>
              <p className="text-sm text-[var(--secondary-color)]/50 mt-2 max-w-md">
                Our most loved dishes, chosen by thousands of happy customers
              </p>
            </div>
            <Link
              href="/menu"
              className="text-sm font-semibold text-[var(--primary-color)] hover:opacity-80 transition-opacity inline-flex items-center gap-1 shrink-0"
            >
              Explore All Food <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="w-full aspect-square rounded-2xl bg-[var(--primary-color)]/5 animate-pulse" />
                  <div className="w-24 h-3 rounded mt-4 mx-auto bg-[var(--primary-color)]/5 animate-pulse" />
                </div>
              ))}
            </div>
          ) : fetchError ? (
            <div className="text-center py-16">
              <Utensils size={48} className="mx-auto mb-4 text-red-400/50" />
              <p className="text-lg font-medium text-[var(--secondary-color)]/50">
                Could not load featured items.
                <br />
                Please refresh the page.
              </p>
            </div>
          ) : popularFoods.length === 0 ? (
            <div className="text-center py-16">
              <Utensils size={48} className="mx-auto mb-4 text-[var(--primary-color)]/30" />
              <p className="text-lg font-medium text-[var(--secondary-color)]/50">
                Our chefs are preparing the popular menu.
                <br />
                Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {popularFoods.map((item) => (
                <Link key={item.id} href="/menu" className="group">
                  <div className="w-full aspect-square rounded-2xl overflow-hidden bg-[var(--primary-color)]/5 mb-4 shadow-sm group-hover:shadow-md transition-shadow duration-300">
                    <img
                      src={getImageSrc(item.image)}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                      }}
                    />
                  </div>
                  <p className="text-sm font-semibold text-center text-[var(--secondary-color)] group-hover:text-[var(--primary-color)] transition-colors duration-300">
                    {item.name}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <AboutSection />

      <Footer />
    </div>
  );
}
