"use client";

import { cn } from "@repo/utils";
import { Minus, Plus, SearchX, ShoppingCart, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthNavbar from "../../components/AuthNavbar";
import { useAuth } from "../../components/auth-provider";
import CartSidebar from "../../components/CartSidebar";

// ─── Types ────────────────────────────────────────────
interface ProductVariant {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  quantity: number;
  availability: string;
  rating: number;
  variant_type: string;
  variants: ProductVariant[];
}

interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variant: string;
}

// ─── Emoji map for categories ─────────────────────────
const categoryEmoji: Record<string, string> = {
  All: "🍽️",
  "Main Dish": "🍛",
  Dumplings: "🥟",
  "Spring Rolls": "🌯",
  Drinks: "🥤",
  Desserts: "🍰",
  Sides: "🧆",
  Noodles: "🍜",
};

function getCategoryEmoji(cat: string) {
  return categoryEmoji[cat] || "🍽️";
}

function getVariantLabel(variantType: string): string {
  switch (variantType) {
    case "size":
      return "Select Size";
    case "sugar_level":
      return "Sugar Level";
    case "preparation":
      return "Preparation";
    default:
      return "Options";
  }
}

function getVariantPrice(product: Product, variant: string): number {
  if (!variant || product.variants.length === 0) return product.price;
  const found = product.variants.find((v) => v.name === variant);
  return found ? found.price : product.price;
}

function getVariantOptions(product: Product): string[] {
  return product.variants.map((v) => v.name);
}

function hasVariants(product: Product): boolean {
  return product.variants.length > 0;
}

export default function MenuPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  // Product modal
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  // Receipt number
  const [receiptNumber, setReceiptNumber] = useState("");
  useEffect(() => {
    setReceiptNumber(`${Math.floor(Math.random() * 90000) + 10000}`);
  }, []);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(data);
          const uniqueCats = Array.from(new Set(data.map((p: Product) => p.category)));
          setCategories(["All", ...uniqueCats]);
        }
      })
      .catch(() => setFetchError("Failed to load menu. Please refresh the page."))
      .finally(() => setLoading(false));
  }, []);

  // Restore cart from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sfh_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCart(parsed);
      }
    } catch {
      localStorage.removeItem("sfh_cart");
    }
  }, []);

  const { user } = useAuth();

  const syncCartToServer = async (items: CartItem[]) => {
    try {
      await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } catch {
      /* ignore */
    }
  };

  const saveCart = (updated: CartItem[]) => {
    setCart(updated);
    localStorage.setItem("sfh_cart", JSON.stringify(updated));
    if (user) syncCartToServer(updated);
  };

  // Load remote cart on login
  useEffect(() => {
    if (!user) return;
    fetch("/api/cart")
      .then((r) => r.json())
      .then((data) => {
        if (data?.items?.length > 0) {
          const localRaw = localStorage.getItem("sfh_cart");
          const local: CartItem[] = localRaw
            ? (() => {
                try {
                  return JSON.parse(localRaw);
                } catch {
                  return [];
                }
              })()
            : [];
          const merged = [...data.items];
          for (const li of local) {
            const key = `${li.id}-${li.variant}`;
            const idx = merged.findIndex((m: CartItem) => `${m.id}-${m.variant}` === key);
            if (idx >= 0) merged[idx] = li;
            else merged.push(li);
          }
          setCart(merged);
          localStorage.setItem("sfh_cart", JSON.stringify(merged));
        }
      })
      .catch(() => {});
  }, [user?.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ─── Guest guard ─────────────────────────────────────
  const requireAuth = () => {
    setShowCart(true);
  };

  const openModal = (product: Product) => {
    if (!user) {
      requireAuth();
      return;
    }
    setModalProduct(product);
    const opts = getVariantOptions(product);
    setSelectedVariant(opts[0] || "");
    setQuantity(1);
  };

  // ─── Quick add (no-variant items) ────────────────────
  const quickAdd = (product: Product) => {
    if (!user) {
      requireAuth();
      return;
    }
    const price = getVariantPrice(product, "");
    const cartItem: CartItem = {
      id: product.id,
      name: product.name,
      image: product.image,
      price,
      quantity: 1,
      variant: "",
    };
    const existing = cart.findIndex((c) => c.id === product.id && c.variant === "");
    let updated: CartItem[];
    if (existing >= 0) {
      updated = cart.map((c, i) => (i === existing ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      updated = [...cart, cartItem];
    }
    saveCart(updated);
    showToast(`${product.name} added to basket`);
  };

  const addToCart = () => {
    if (!modalProduct) return;
    if (!user) {
      setModalProduct(null);
      requireAuth();
      return;
    }
    const price = getVariantPrice(modalProduct, selectedVariant);
    const cartItem: CartItem = {
      id: modalProduct.id,
      name: modalProduct.name,
      image: modalProduct.image,
      price,
      quantity,
      variant: selectedVariant,
    };
    const existing = cart.findIndex((c) => c.id === modalProduct.id && c.variant === selectedVariant);
    let updated: CartItem[];
    if (existing >= 0) {
      updated = cart.map((c, i) => (i === existing ? { ...c, quantity: c.quantity + quantity } : c));
    } else {
      updated = [...cart, cartItem];
    }
    saveCart(updated);
    setModalProduct(null);
    showToast(`${modalProduct.name}${selectedVariant ? ` (${selectedVariant})` : ""} added to basket`);
  };

  const updateCartQty = (id: string, variant: string, delta: number) => {
    const updated = cart
      .map((c) => {
        if (c.id === id && c.variant === variant) {
          const newQty = c.quantity + delta;
          return newQty < 1 ? null : { ...c, quantity: newQty };
        }
        return c;
      })
      .filter(Boolean) as CartItem[];
    saveCart(updated);
  };

  const removeFromCart = (id: string, variant: string) => {
    saveCart(cart.filter((c) => !(c.id === id && c.variant === variant)));
  };

  const totalItems = cart.reduce((s, c) => s + c.quantity, 0);
  const totalPrice = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  const filtered = activeCategory === "All" ? products : products.filter((p) => p.category === activeCategory);

  const getImageSrc = (img: string) => {
    if (!img) return "/assets/food-hub.jpg";
    if (img.startsWith("http")) return img;
    if (img.startsWith("/")) return img;
    return `/assets/uploads/${img}`;
  };

  // ─── Render ──────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-cream">
      {/* ── Toast ── */}
      <div
        className={cn(
          "fixed top-4 right-4 z-[9999] px-5 py-3 rounded-2xl font-bold shadow-xl border border-white/10 transition-all duration-400 flex items-center gap-3",
          toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none",
        )}
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          color: "var(--secondary-color)",
        }}
      >
        <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white flex-shrink-0">
          <ShoppingCart size={14} />
        </div>
        <span className="text-sm">{toast}</span>
      </div>

      {/* ── Product Modal ── */}
      {modalProduct && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalProduct(null);
          }}
        >
          <div className="relative w-full max-w-[480px] md:max-w-[860px] bg-white rounded-3xl overflow-hidden shadow-2xl animate-slideUp flex flex-col md:flex-row">
            <button
              onClick={() => setModalProduct(null)}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center border-none shadow-md cursor-pointer hover:bg-white transition-colors"
            >
              <X className="w-5 h-5 text-near-black" />
            </button>

            <div className="relative h-[260px] md:h-auto md:w-1/2 flex-shrink-0 bg-gray-50 overflow-hidden">
              <img
                src={getImageSrc(modalProduct.image)}
                alt={modalProduct.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                }}
              />
            </div>

            <div className="p-6 md:p-8 md:w-1/2 flex flex-col justify-center">
              <h2
                className="text-2xl md:text-3xl font-bold text-near-black m-0 mb-2"
                style={{ fontFamily: "var(--playfair-display)" }}
              >
                {modalProduct.name}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed m-0 mb-6">{modalProduct.description}</p>

              {/* Variant Options */}
              {hasVariants(modalProduct) && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest m-0 mb-3">
                    {getVariantLabel(modalProduct.variant_type)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {getVariantOptions(modalProduct).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setSelectedVariant(opt)}
                        className={cn(
                          "px-5 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-200 cursor-pointer",
                          selectedVariant === opt
                            ? "bg-brand-500 text-white border-brand-500"
                            : "bg-white text-gray-600 border-gray-200 hover:border-brand-500/50",
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-2xl">
                <span className="text-sm font-bold text-near-black">Quantity</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-full bg-white border-none flex items-center justify-center cursor-pointer shadow-sm hover:shadow transition-shadow"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span
                    className="text-2xl font-bold text-near-black min-w-[24px] text-center"
                    style={{ fontFamily: "var(--playfair-display)" }}
                  >
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(modalProduct.quantity, q + 1))}
                    className="w-9 h-9 rounded-full bg-white border-none flex items-center justify-center cursor-pointer shadow-sm hover:shadow transition-shadow"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Price + Add */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest m-0 mb-1">Total</p>
                  <p
                    className="text-2xl md:text-3xl font-bold text-brand-500 m-0"
                    style={{ fontFamily: "var(--playfair-display)" }}
                  >
                    ₱{getVariantPrice(modalProduct, selectedVariant) * quantity}.00
                  </p>
                </div>
                <button
                  onClick={addToCart}
                  disabled={modalProduct.availability === "sold_out"}
                  className={cn(
                    "px-6 py-3.5 rounded-full font-bold text-sm flex items-center gap-2 border-none transition-all duration-200",
                    modalProduct.availability === "sold_out"
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-brand-500 text-white hover:bg-brand-600 cursor-pointer shadow-lg shadow-brand-500/25 active:scale-95",
                  )}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {modalProduct.availability === "sold_out" ? "Sold Out" : "Add to Basket"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Bar (kiosk mode) ── */}
      <AuthNavbar
        kioskMode
        showCartIcon
        cartItemCount={totalItems}
        onCartClick={() => {
          if (window.innerWidth < 1024) setShowCart(true);
        }}
      />

      {/* ── Main Split View ── */}
      <div className="flex-1 flex overflow-hidden pt-[72px]">
        {/* ── Left: Products ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Category Pills */}
          <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur-xl border-b border-black/5">
            <div className="flex items-center gap-2 px-4 md:px-6 py-3 overflow-x-auto hide-scrollbar">
              {loading
                ? Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="w-24 h-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                    ))
                : categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap border-none cursor-pointer transition-all duration-200 flex-shrink-0",
                        activeCategory === cat
                          ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                          : "bg-white/70 text-gray-500 hover:bg-white hover:text-gray-700 hover:shadow-sm",
                      )}
                    >
                      <span className="text-base">{getCategoryEmoji(cat)}</span>
                      {cat}
                    </button>
                  ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 md:px-6 py-6">
              {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array(6)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                        <div className="aspect-[4/3] bg-gray-200" />
                        <div className="p-4 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4" />
                          <div className="h-3 bg-gray-100 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                </div>
              ) : fetchError ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <SearchX className="w-8 h-8 text-red-400" />
                  </div>
                  <h3
                    className="text-xl font-bold text-near-black m-0 mb-2"
                    style={{ fontFamily: "var(--playfair-display)" }}
                  >
                    Something went wrong
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm m-0 leading-relaxed">{fetchError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-5 px-6 py-3 rounded-full bg-brand-500 text-white font-semibold text-sm border-none cursor-pointer hover:bg-brand-600 transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center mb-4">
                    <SearchX className="w-8 h-8 text-brand-500/50" />
                  </div>
                  <h3
                    className="text-xl font-bold text-near-black m-0 mb-2"
                    style={{ fontFamily: "var(--playfair-display)" }}
                  >
                    No items found
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm m-0 leading-relaxed">
                    We couldn't find any items in this category. Try a different category.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((item) => {
                    const isSoldOut = item.availability === "sold_out";
                    const hasVar = hasVariants(item);

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "group relative bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/60 transition-all duration-300",
                          isSoldOut
                            ? "opacity-60 cursor-not-allowed"
                            : "cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-white/80",
                        )}
                        onClick={() => {
                          if (!isSoldOut) {
                            if (hasVar) openModal(item);
                            else quickAdd(item);
                          }
                        }}
                      >
                        {/* Image */}
                        <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                          <img
                            src={getImageSrc(item.image)}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                            }}
                          />

                          {/* Rating Badge */}
                          <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-md">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="text-[11px] font-bold text-near-black">{item.rating}</span>
                          </div>

                          {/* Sold Out Overlay */}
                          {isSoldOut && (
                            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                              <span className="bg-near-black/80 text-white text-sm font-bold px-4 py-2 rounded-full">
                                Sold Out
                              </span>
                            </div>
                          )}

                          {/* Gradient overlay for text */}
                          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                          {/* Name + Price on image */}
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3
                              className="text-base font-bold text-white m-0 leading-tight"
                              style={{ fontFamily: "var(--playfair-display)" }}
                            >
                              {item.name}
                            </h3>
                            <p className="text-sm font-bold text-white/90 m-0 mt-1">
                              {hasVariants(item)
                                ? `₱${Math.min(...item.variants.map((v) => v.price))} – ₱${Math.max(...item.variants.map((v) => v.price))}`
                                : `₱${item.price}.00`}
                            </p>
                          </div>
                        </div>

                        {/* Bottom section ΓÇö quick add or variant hint */}
                        <div className="p-3 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                            {item.category}
                          </span>
                          {!isSoldOut && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (hasVar) openModal(item);
                                else quickAdd(item);
                              }}
                              className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center border-none cursor-pointer transition-all duration-200 shadow-sm",
                                hasVar
                                  ? "bg-brand-50 text-brand-500 hover:bg-brand-100"
                                  : "bg-brand-500 text-white hover:bg-brand-600 active:scale-90",
                              )}
                              title={hasVar ? "Select options" : "Add to basket"}
                            >
                              {hasVar ? <span className="text-xs font-bold">+</span> : <Plus className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Persistent Cart Panel ── */}
        <div className="w-[380px] xl:w-[420px] hidden lg:flex flex-col flex-shrink-0">
          <CartSidebar
            showCart={showCart}
            setShowCart={setShowCart}
            cart={cart}
            updateCartQty={updateCartQty}
            removeFromCart={removeFromCart}
            totalPrice={totalPrice}
            receiptNumber={receiptNumber}
            user={user}
            persistent
          />
        </div>
      </div>

      {/* ── Mobile Bottom Cart Bar ── */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200/50 px-4 py-3 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 m-0">
                {totalItems} item{totalItems !== 1 ? "s" : ""} in basket
              </p>
              <p className="text-lg font-bold text-brand-500 m-0" style={{ fontFamily: "var(--playfair-display)" }}>
                ₱{totalPrice}.00
              </p>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-500 text-white font-semibold text-sm border-none cursor-pointer hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/25"
            >
              <ShoppingCart className="w-4 h-4" />
              View Basket
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile Cart Overlay ── */}
      <div className="hidden lg:block" />
      <div className="lg:hidden">
        <CartSidebar
          showCart={showCart}
          setShowCart={setShowCart}
          cart={cart}
          updateCartQty={updateCartQty}
          removeFromCart={removeFromCart}
          totalPrice={totalPrice}
          receiptNumber={receiptNumber}
          user={user}
        />
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </div>
  );
}
