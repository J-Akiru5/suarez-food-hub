"use client";

import {
  ArrowRight,
  Menu as MenuIcon,
  Minus,
  Plus,
  Search,
  SearchX,
  ShoppingCart,
  Star,
  Utensils,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthNavbar from "../../components/AuthNavbar";
import { useAuth } from "../../components/auth-provider";
import CartSidebar from "../../components/CartSidebar";

// ─── Types ────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  price: number;
  price_medium: number;
  price_large: number;
  description: string;
  image: string;
  category: string;
  quantity: number;
  availability: string;
  rating: number;
}

interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variant: string;
}

function getVariantPrice(product: Product, variant: string): number {
  if (product.category === "Main Dish") {
    return variant === "Large" ? product.price_large : product.price_medium;
  }
  return product.price; // Others like Dumplings are same price regardless of steamed/fried
}

function getVariantOptions(product: Product): string[] {
  if (product.category === "Main Dish") return ["Medium", "Large"];
  if (product.category === "Dumplings") return ["Steamed", "Fried"];
  if (product.category === "Spring Rolls") return ["Dynamite", "Regular"];
  if (product.category === "Drinks") return ["100% Sugar", "75% Sugar", "50% Sugar", "Less Sugar", "No Sugar"];
  return [];
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

  // AI Craving Matcher
  const [aiCraving, setAiCraving] = useState("");
  const [showAiWidget, setShowAiWidget] = useState(false);

  // Receipt number (client-only to avoid hydration mismatch)
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
      .catch((err) => setFetchError("Failed to load menu. Please refresh the page."))
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
    } catch {}
  };

  const saveCart = (updated: CartItem[]) => {
    setCart(updated);
    localStorage.setItem("sfh_cart", JSON.stringify(updated));
    if (user) syncCartToServer(updated);
  };

  // Load remote cart on login and merge with local
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

  const openModal = (product: Product) => {
    if (!user) {
      showToast("Please log in to add items to your basket");
      return;
    }
    setModalProduct(product);
    const opts = getVariantOptions(product);
    setSelectedVariant(opts[0] || "");
    setQuantity(1);
  };

  const addToCart = () => {
    if (!modalProduct) return;
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

  return (
    <div style={{ background: "var(--color-creamson)", minHeight: "100vh", fontFamily: "var(--plus-jakarta-sans)" }}>
      {/* ── Toast ── */}
      <div
        onClick={() => {
          if (toast?.includes("log in")) router.push("/login");
        }}
        style={{
          cursor: toast?.includes("log in") ? "pointer" : "default",
          position: "fixed",
          top: toast ? 90 : -100,
          right: 24,
          zIndex: 9999,
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(12px)",
          color: "var(--secondary-color)",
          padding: "14px 24px",
          borderRadius: "30px",
          fontWeight: 700,
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          transition: "top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: toast?.includes("log in") ? "#f59e0b" : "var(--primary-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <ShoppingCart size={14} />
        </div>
        {toast?.includes("log in") ? (
          <span>
            Please log in to add items — <u>Login</u>
          </span>
        ) : (
          toast
        )}
      </div>

      {/* ── Product Modal ── */}
      {modalProduct && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalProduct(null);
          }}
        >
          <div
            className="relative flex flex-col md:flex-row bg-white rounded-[32px] overflow-hidden w-full max-w-[480px] md:max-w-[860px] shadow-[0_40px_80px_rgba(0,0,0,0.2)]"
            style={{ animation: "slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}
          >
            <button
              onClick={() => setModalProduct(null)}
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/80 hover:bg-white backdrop-blur-md border-none flex items-center justify-center text-gray-800 shadow-md cursor-pointer z-30 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="relative h-[260px] md:h-auto md:w-1/2 flex-shrink-0 bg-gray-50 overflow-hidden">
              <div className="absolute inset-0">
                <img
                  src={getImageSrc(modalProduct.image)}
                  alt={modalProduct.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                  }}
                />
              </div>
            </div>

            <div className="p-8 md:p-10 md:w-1/2 flex flex-col justify-center">
              <h2
                style={{
                  fontFamily: "var(--playfair-display)",
                  fontSize: 32,
                  color: "var(--secondary-color)",
                  margin: "0 0 12px",
                }}
              >
                {modalProduct.name}
              </h2>
              <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.7, margin: "0 0 24px" }}>
                {modalProduct.description}
              </p>

              {/* Variant Options */}
              {getVariantOptions(modalProduct).length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: 12,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      marginBottom: 12,
                      letterSpacing: 1,
                    }}
                  >
                    {modalProduct.category === "Main Dish"
                      ? "Select Size"
                      : modalProduct.category === "Drinks"
                        ? "Sugar Level"
                        : "Preparation"}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {getVariantOptions(modalProduct).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setSelectedVariant(opt)}
                        style={{
                          padding: "10px 20px",
                          borderRadius: 24,
                          border: "2px solid",
                          borderColor: selectedVariant === opt ? "var(--primary-color)" : "#e2e8f0",
                          background: selectedVariant === opt ? "var(--primary-color)" : "transparent",
                          color: selectedVariant === opt ? "#fff" : "var(--secondary-color)",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontSize: 14,
                          transition: "all 0.2s",
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 32,
                  padding: "16px 20px",
                  background: "#f8fafc",
                  borderRadius: 20,
                }}
              >
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--secondary-color)", margin: 0 }}>Quantity</p>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "none",
                      background: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    <Minus size={16} />
                  </button>
                  <span
                    style={{
                      fontFamily: "var(--playfair-display)",
                      fontSize: 24,
                      fontWeight: 700,
                      minWidth: 24,
                      textAlign: "center",
                      color: "var(--secondary-color)",
                    }}
                  >
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(modalProduct.quantity, q + 1))}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "none",
                      background: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Price + Add */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      margin: "0 0 4px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    Total
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--playfair-display)",
                      fontSize: 32,
                      fontWeight: 700,
                      color: "var(--primary-color)",
                      margin: 0,
                    }}
                  >
                    ₱{getVariantPrice(modalProduct, selectedVariant) * quantity}.00
                  </p>
                </div>
                <button
                  onClick={addToCart}
                  disabled={modalProduct.availability === "Sold Out"}
                  style={{
                    padding: "16px 36px",
                    background: modalProduct.availability === "Sold Out" ? "#cbd5e1" : "var(--primary-color)",
                    border: "none",
                    borderRadius: "30px",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: modalProduct.availability === "Sold Out" ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "transform 0.1s, box-shadow 0.2s",
                    boxShadow: modalProduct.availability === "Sold Out" ? "none" : "0 8px 24px rgba(177, 69, 74, 0.3)",
                  }}
                  onMouseDown={(e) => {
                    if (modalProduct.availability !== "Sold Out") e.currentTarget.style.transform = "scale(0.96)";
                  }}
                  onMouseUp={(e) => {
                    if (modalProduct.availability !== "Sold Out") e.currentTarget.style.transform = "scale(1)";
                  }}
                  onMouseLeave={(e) => {
                    if (modalProduct.availability !== "Sold Out") e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <ShoppingCart size={18} />
                  {modalProduct.availability === "Sold Out" ? "Sold Out" : "Add to Basket"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cart Sidebar (Live Receipt) ── */}
      <CartSidebar
        showCart={showCart}
        setShowCart={setShowCart}
        cart={cart}
        updateCartQty={updateCartQty}
        removeFromCart={removeFromCart}
        totalPrice={totalPrice}
        receiptNumber={receiptNumber}
      />

      {/* ── Header ── */}
      <AuthNavbar showCartIcon={true} onCartClick={() => setShowCart(true)} cartItemCount={totalItems} />

      {/* ── Hero Banner ── */}
      <div
        className="mobile-padding"
        style={{
          background: "var(--primary-color)",
          padding: "160px 64px 80px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -50,
            left: -50,
            width: 200,
            height: 200,
            background: "rgba(255,255,255,0.05)",
            borderRadius: "50%",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            right: -50,
            width: 300,
            height: 300,
            background: "rgba(255,255,255,0.03)",
            borderRadius: "50%",
            filter: "blur(60px)",
          }}
        />
        <h1
          style={{
            fontFamily: "var(--playfair-display)",
            fontSize: 64,
            color: "#fff",
            margin: 0,
            position: "relative",
            zIndex: 2,
          }}
        >
          Our Menu
        </h1>
        <p
          style={{
            color: "rgba(255,255,255,0.85)",
            fontSize: 18,
            marginTop: 16,
            fontWeight: 500,
            position: "relative",
            zIndex: 2,
          }}
        >
          Handcrafted authentic Filipino flavors
        </p>
      </div>

      {/* ── Category Filters ── */}
      <div
        className="mobile-padding"
        style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, padding: "40px 64px 20px" }}
      >
        {loading
          ? Array(5)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 100,
                    height: 42,
                    background: "#e2e8f0",
                    borderRadius: 30,
                    animation: "pulse 1.5s infinite ease-in-out",
                  }}
                />
              ))
          : categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "12px 28px",
                  borderRadius: "30px",
                  border: "none",
                  background: activeCategory === cat ? "var(--primary-color)" : "#fff",
                  color: activeCategory === cat ? "#fff" : "#64748b",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  boxShadow:
                    activeCategory === cat ? "0 8px 20px rgba(177, 69, 74, 0.25)" : "0 4px 12px rgba(0,0,0,0.04)",
                  transition: "all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)",
                }}
                onMouseEnter={(e) => {
                  if (activeCategory !== cat) e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  if (activeCategory !== cat) e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {cat}
              </button>
            ))}
      </div>

      {/* ── Food Grid ── */}
      <div
        className="mobile-padding"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gridAutoRows: "400px",
          gridAutoFlow: "dense",
          gap: 32,
          padding: "24px 64px 120px",
        }}
      >
        {loading ? (
          // Skeletons
          Array(8)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                style={{
                  background: "#fff",
                  borderRadius: 28,
                  overflow: "hidden",
                  height: 380,
                  border: "1px solid rgba(177, 69, 74, 0.1)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: 200,
                    background: "rgba(177, 69, 74, 0.08)",
                    animation: "pulse 1.5s infinite ease-in-out",
                  }}
                />
                <div style={{ padding: 24 }}>
                  <div
                    style={{
                      width: "60%",
                      height: 24,
                      background: "rgba(177, 69, 74, 0.12)",
                      borderRadius: 6,
                      marginBottom: 12,
                      animation: "pulse 1.5s infinite ease-in-out",
                    }}
                  />
                  <div
                    style={{
                      width: "90%",
                      height: 14,
                      background: "rgba(177, 69, 74, 0.05)",
                      borderRadius: 4,
                      marginBottom: 8,
                    }}
                  />
                  <div
                    style={{
                      width: "70%",
                      height: 14,
                      background: "rgba(177, 69, 74, 0.05)",
                      borderRadius: 4,
                      marginBottom: 24,
                    }}
                  />
                  <div
                    style={{
                      width: "100%",
                      height: 40,
                      background: "rgba(177, 69, 74, 0.08)",
                      borderRadius: 20,
                      animation: "pulse 1.5s infinite ease-in-out",
                    }}
                  />
                </div>
              </div>
            ))
        ) : fetchError ? (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "100px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 100,
                height: 100,
                background: "rgba(239,68,68,0.05)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <SearchX size={48} color="#ef4444" style={{ opacity: 0.5 }} />
            </div>
            <h3 style={{ fontFamily: "var(--playfair-display)", fontSize: 28, color: "#ef4444", margin: "0 0 12px" }}>
              Something went wrong
            </h3>
            <p style={{ fontSize: 16, color: "#64748b", maxWidth: 400, margin: 0, lineHeight: 1.6 }}>{fetchError}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 20,
                padding: "14px 32px",
                borderRadius: 30,
                border: "none",
                background: "var(--primary-color)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Refresh Page
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "100px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 100,
                height: 100,
                background: "rgba(177, 69, 74, 0.05)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <SearchX size={48} color="var(--primary-color)" style={{ opacity: 0.5 }} />
            </div>
            <h3
              style={{
                fontFamily: "var(--playfair-display)",
                fontSize: 28,
                color: "var(--secondary-color)",
                margin: "0 0 12px",
              }}
            >
              No items found
            </h3>
            <p style={{ fontSize: 16, color: "#64748b", maxWidth: 400, margin: 0, lineHeight: 1.6 }}>
              We couldn't find any food items in this category. Please try selecting a different category.
            </p>
          </div>
        ) : (
          filtered.map((item, index) => {
            const isFeatured = index === 0 && !aiCraving.trim();
            const isAiMatch = aiCraving.trim()
              ? item.name.toLowerCase().includes(aiCraving.toLowerCase()) ||
                item.description.toLowerCase().includes(aiCraving.toLowerCase()) ||
                item.category.toLowerCase().includes(aiCraving.toLowerCase())
              : false;
            const isDimmed = aiCraving.trim() && !isAiMatch;

            return (
              <div
                key={item.id}
                onClick={() => item.availability !== "Sold Out" && openModal(item)}
                className={isFeatured ? "bento-featured" : ""}
                style={{
                  background: isAiMatch ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.65)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  borderRadius: 32,
                  overflow: "hidden",
                  border: isAiMatch ? "2px solid var(--primary-color)" : "1px solid rgba(255, 255, 255, 0.4)",
                  boxShadow: isAiMatch ? "0 0 40px rgba(177,69,74,0.6)" : "0 8px 32px rgba(0,0,0,0.04)",
                  cursor: item.availability === "Sold Out" ? "not-allowed" : "pointer",
                  opacity: item.availability === "Sold Out" ? 0.6 : isDimmed ? 0.3 : 1,
                  transform: isAiMatch ? "scale(1.02)" : "scale(1)",
                  transition: "all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  zIndex: isAiMatch ? 10 : 1,
                }}
                onMouseEnter={(e) => {
                  if (item.availability !== "Sold Out") {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px) scale(1.02)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 24px 48px rgba(177,69,74,0.12)";
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(255, 255, 255, 0.9)";
                    (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255, 255, 255, 0.8)";
                    (e.currentTarget as HTMLDivElement).style.zIndex = "20";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = isAiMatch
                    ? "scale(1.02)"
                    : "translateY(0) scale(1)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = isAiMatch
                    ? "0 0 40px rgba(177,69,74,0.6)"
                    : "0 8px 32px rgba(0,0,0,0.04)";
                  (e.currentTarget as HTMLDivElement).style.background = isAiMatch
                    ? "rgba(255, 255, 255, 0.9)"
                    : "rgba(255, 255, 255, 0.65)";
                  (e.currentTarget as HTMLDivElement).style.border = isAiMatch
                    ? "2px solid var(--primary-color)"
                    : "1px solid rgba(255, 255, 255, 0.4)";
                  (e.currentTarget as HTMLDivElement).style.zIndex = isAiMatch ? "10" : "1";
                }}
              >
                <div
                  className="bento-image-container"
                  style={{ position: "relative", flex: isFeatured ? "1.2" : "none", height: isFeatured ? "100%" : 200 }}
                >
                  <img
                    src={getImageSrc(item.image)}
                    alt={item.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                    }}
                  />

                  {/* Rating Badge */}
                  <div
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      background: "rgba(255,255,255,0.9)",
                      backdropFilter: "blur(4px)",
                      padding: "6px 12px",
                      borderRadius: 20,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  >
                    <Star size={14} fill="#f59e0b" color="#f59e0b" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--secondary-color)" }}>
                      {item.rating}
                    </span>
                  </div>

                  {item.availability === "Sold Out" && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(255,255,255,0.6)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--secondary-color)",
                          fontFamily: "var(--playfair-display)",
                          fontSize: 24,
                          fontWeight: 800,
                          padding: "12px 24px",
                          background: "#fff",
                          borderRadius: 30,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                        }}
                      >
                        Sold Out
                      </span>
                    </div>
                  )}
                </div>
                <div
                  style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "var(--playfair-display)",
                        fontSize: 22,
                        margin: 0,
                        color: "var(--secondary-color)",
                      }}
                    >
                      {item.name}
                    </h3>
                    <span
                      style={{
                        fontWeight: 800,
                        color: "var(--primary-color)",
                        fontSize: 18,
                        whiteSpace: "nowrap",
                        marginLeft: 12,
                      }}
                    >
                      {item.category === "Main Dish" ? `₱${item.price_medium}–${item.price_large}` : `₱${item.price}`}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      color: "#64748b",
                      lineHeight: 1.6,
                      margin: "0 0 24px",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.description}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "auto",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>{item.category}</span>
                    <span
                      style={{
                        padding: "10px 20px",
                        borderRadius: 24,
                        background: item.availability === "Sold Out" ? "#f1f5f9" : "rgba(177, 69, 74, 0.08)",
                        color: item.availability === "Sold Out" ? "#94a3b8" : "var(--primary-color)",
                        fontSize: 14,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (item.availability !== "Sold Out")
                          e.currentTarget.style.background = "rgba(177, 69, 74, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        if (item.availability !== "Sold Out")
                          e.currentTarget.style.background = "rgba(177, 69, 74, 0.08)";
                      }}
                    >
                      {item.availability === "Sold Out" ? (
                        "Sold Out"
                      ) : (
                        <>
                          <Plus size={16} /> Select
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media (max-width: 768px) {
          .mobile-padding { padding-left: 24px !important; padding-right: 24px !important; }
        }
      `,
        }}
      />

      {/* ── AI Craving Matcher Widget ── */}
      <div style={{ position: "fixed", bottom: 40, left: 40, zIndex: 600 }}>
        {showAiWidget && (
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(12px)",
              padding: 24,
              borderRadius: 24,
              width: 320,
              boxShadow: "0 20px 40px rgba(177, 69, 74, 0.2)",
              marginBottom: 16,
              animation: "slideUp 0.3s ease-out",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>✨</span>
                <h4
                  style={{
                    margin: 0,
                    fontFamily: "var(--playfair-display)",
                    fontSize: 18,
                    color: "var(--primary-color)",
                  }}
                >
                  Craving Matcher
                </h4>
              </div>
              <button
                onClick={() => {
                  setShowAiWidget(false);
                  setAiCraving("");
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px", lineHeight: 1.5 }}>
              Tell me what you're craving (e.g. "spicy", "crunchy", "sweet"), and I'll find it for you.
            </p>
            <input
              type="text"
              placeholder="I'm craving..."
              value={aiCraving}
              onChange={(e) => setAiCraving(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: "2px solid rgba(177, 69, 74, 0.2)",
                outline: "none",
                background: "#fff",
                color: "var(--secondary-color)",
                fontFamily: "var(--plus-jakarta-sans)",
                fontWeight: 700,
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-color)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(177, 69, 74, 0.2)")}
            />
          </div>
        )}
        <button
          onClick={() => {
            setShowAiWidget(!showAiWidget);
            if (showAiWidget) setAiCraving("");
          }}
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--primary-color)",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 24px rgba(177, 69, 74, 0.4)",
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {showAiWidget ? <X size={28} /> : <span style={{ fontSize: 28, animation: "pulse 2s infinite" }}>✨</span>}
        </button>
      </div>
    </div>
  );
}
