"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@repo/utils";
import type { Product, Category, ProductVariant as DbProductVariant } from "@repo/types";
import { HeroSection, HowItWorks, TrendingSection, AboutSection, Skeleton, Footer, ProductCard, ProductModal, ToastNotification } from "@repo/ui";
import type { ProductVariant as UiProductVariant } from "@repo/ui";
import { useCartStore } from "@/stores/cart";
import { ShoppingBag } from "lucide-react";

function ProductSkeleton() {
  return (
    <div className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 overflow-hidden">
      <Skeleton className="h-[200px] w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState({ visible: false, message: "" });

  const addItem = useCartStore((s) => s.addItem);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [catRes, featRes] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("products")
          .select("*, category:categories(*)")
          .eq("is_featured", true)
          .eq("availability", "available")
          .order("sort_order")
          .limit(6),
      ]);

      setCategories(catRes.data || []);
      setFeatured(featRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  function handleAddToCart(
    product: { id: string; name: string; description: string; image: string; base_price: number; stocks: number; availability: string },
    variant?: UiProductVariant,
    quantity?: number
  ) {
    const dbProduct = featured.find((p) => p.id === product.id);
    if (dbProduct) {
      const dbVariant = dbProduct.variants?.find((v) => v.id === variant?.id);
      addItem(dbProduct, quantity || 1, dbVariant);
    }
    setToast({ visible: true, message: `${product.name} added to cart!` });
  }

  const trendingItems: { name: string }[] = [
    { name: "Freshly steamed Filipino siomai" },
    { name: "Premium quality meats & ingredients" },
    { name: "Made-to-order, never frozen" },
    { name: "Fast pickup near WVSU campus" },
    { name: "Affordable student-friendly prices" },
  ];

  return (
    <div>
      {/* Hero Section */}
      <HeroSection
        title="Taste the Best Filipino Food in Town"
        description="Discover the best food near WVSU — from crispy siomai to savory mains. Quick, affordable, and made to satisfy your cravings."
        ctaText="Explore Menu"
        ctaHref="/menu"
        imageSrc="/hero-food.png"
      />

      {/* Popular Foods */}
      <section className="py-16 md:py-24 bg-creamson">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[#b1454a] text-base font-semibold uppercase tracking-wider mb-3">
              Popular Foods
            </p>
            <h2
              className="text-4xl md:text-5xl lg:text-[56px] font-bold text-gray-900 leading-tight"
              style={{ fontFamily: "var(--playfair-display)" }}
            >
              Customer Favorites
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.slice(0, 6).map((product) => (
                <ProductCard
                  key={product.id}
                  name={product.name}
                  price={product.base_price}
                  image={product.image_url || "/placeholder-food.png"}
                  category={product.category?.name || "Food"}
                  rating={product.rating || 4.5}
                  availability={product.availability as "available" | "sold_out"}
                  featured={product.is_featured}
                  onClick={() => setModalProduct(product)}
                />
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Link
              href="/menu"
              className="inline-block bg-[#b1454a] text-white px-8 py-4 rounded-full font-semibold text-base hover:bg-[#9a3a3f] transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-lg"
            >
              View Full Menu
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* Trending Section */}
      <TrendingSection
        title="Why Students Love Us"
        subtitle="Trending Now"
        description="Suarez Food Hub is the go-to food destination for WVSU students. Fresh, fast, and always affordable."
        items={trendingItems}
        imageSrc="/trending-food.png"
        imageAlt="Trending Filipino food"
      />

      {/* About Section */}
      <AboutSection />

      {/* Footer */}
      <Footer />

      {/* Product Modal */}
      {modalProduct && (
        <ProductModal
          product={{
            id: modalProduct.id,
            name: modalProduct.name,
            description: modalProduct.description || "",
            image: modalProduct.image_url || "/placeholder-food.png",
            base_price: modalProduct.base_price,
            stocks: modalProduct.stocks,
            availability: modalProduct.availability,
            variants: modalProduct.variants?.map((v) => ({
              id: v.id,
              name: v.name,
              price: v.price,
            })),
          }}
          onClose={() => setModalProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Toast */}
      <ToastNotification
        message={toast.message}
        isVisible={toast.visible}
        onClose={() => setToast({ visible: false, message: "" })}
      />
    </div>
  );
}
