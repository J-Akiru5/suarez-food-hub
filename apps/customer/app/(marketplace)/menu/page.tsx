"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@repo/utils";
import type { Product, Category } from "@repo/types";
import type { ProductVariant as UiProductVariant } from "@repo/ui";
import { useCartStore } from "@/stores/cart";
import {
  CategoryFilter,
  ProductCard,
  ProductModal,
  ReceiptCart,
  ReceiptCartItem,
  AICravingMatcher,
  ToastNotification,
  Skeleton,
} from "@repo/ui";
import { ShoppingBag } from "lucide-react";

export default function MenuPage() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category") || "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(categorySlug);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "" });

  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [catRes, prodRes] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("products")
          .select("*, category:categories(*), variants:product_variants(*)")
          .eq("availability", "available")
          .order("sort_order"),
      ]);

      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    setSelectedCategory(categorySlug);
  }, [categorySlug]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory
        ? p.category?.slug === selectedCategory
        : true;
      const matchesSearch = searchQuery
        ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  function handleAddToCart(
    product: { id: string; name: string; description: string; image: string; base_price: number; stocks: number; availability: string },
    variant?: UiProductVariant,
    quantity?: number
  ) {
    const dbProduct = products.find((p) => p.id === product.id);
    if (dbProduct) {
      const dbVariant = dbProduct.variants?.find((v) => v.id === variant?.id);
      addItem(dbProduct, quantity || 1, dbVariant);
    }
    setToast({ visible: true, message: `${product.name} added to cart!` });
  }

  const receiptItems: ReceiptCartItem[] = cartItems.map((item) => ({
    id: item.product.id,
    name: item.product.name,
    image: item.product.image_url || "/placeholder-food.png",
    price: item.variant?.price ?? item.product.base_price,
    quantity: item.quantity,
    variant: item.variant?.name,
  }));

  function handleUpdateQuantity(id: string, quantity: number, variant?: string) {
    const item = cartItems.find(
      (ci) => ci.product.id === id && (ci.variant?.name || "default") === (variant || "default")
    );
    if (item) {
      updateQuantity(item.product.id, quantity, item.variant?.id);
    }
  }

  function handleRemove(id: string, variant?: string) {
    const item = cartItems.find(
      (ci) => ci.product.id === id && (ci.variant?.name || "default") === (variant || "default")
    );
    if (item) {
      removeItem(item.product.id, item.variant?.id);
    }
  }

  const allCategoryNames = ["All", ...categories.map((c) => c.name)];

  function handleCategoryChange(category: string) {
    if (category === "All") {
      setSelectedCategory("");
    } else {
      const cat = categories.find((c) => c.name === category);
      if (cat) setSelectedCategory(cat.slug);
    }
  }

  function handleAIFilter(query: string) {
    setSearchQuery(query);
    setSelectedCategory("");
  }

  const activeCategoryName = selectedCategory
    ? categories.find((c) => c.slug === selectedCategory)?.name || "All"
    : "All";

  return (
    <div>
      {/* Crimson Hero Banner */}
      <section className="bg-[#b1454a] py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <h1
            className="text-4xl md:text-5xl lg:text-[64px] font-bold text-white leading-tight"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            Our Menu
          </h1>
          <p className="text-white/80 text-base md:text-lg mt-4 max-w-lg mx-auto">
            Explore our selection of freshly made Filipino dishes and find your next favorite meal.
          </p>
        </div>
      </section>

      {/* Category Filter + Search */}
      <section className="py-8 bg-creamson">
        <div className="max-w-[1280px] mx-auto px-6">
          <CategoryFilter
            categories={allCategoryNames}
            active={activeCategoryName}
            onChange={handleCategoryChange}
          />
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-8 pb-32 bg-creamson">
        <div className="max-w-[1280px] mx-auto px-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 overflow-hidden">
                  <Skeleton className="h-[200px] w-full rounded-none" />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-10 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No products found</p>
              <p className="text-gray-400 text-sm mt-1">Try a different category or search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
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
        </div>
      </section>

      {/* Receipt Cart Sidebar */}
      <ReceiptCart
        items={receiptItems}
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemove}
        onCheckout={() => {
          setCartOpen(false);
          window.location.href = "/checkout";
        }}
      />

      {/* AI Craving Matcher */}
      <AICravingMatcher onFilter={handleAIFilter} />

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
