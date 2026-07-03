"use client";

import { cn } from "@repo/utils";
import { ArrowRight, Minus, Plus, ShoppingBag, ShoppingCart, Trash2, X } from "lucide-react";
import Link from "next/link";

interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variant: string;
}

interface CartSidebarProps {
  showCart: boolean;
  setShowCart: (show: boolean) => void;
  cart: CartItem[];
  updateCartQty: (id: string, variant: string, delta: number) => void;
  removeFromCart: (id: string, variant: string) => void;
  totalPrice: number;
  receiptNumber: string;
  persistent?: boolean;
  user?: any;
}

export default function CartSidebar({
  showCart,
  setShowCart,
  cart,
  updateCartQty,
  removeFromCart,
  totalPrice,
  receiptNumber,
  persistent,
  user,
}: CartSidebarProps) {
  const content =
    user === null ? (
      <div className="flex flex-col h-full bg-[#f1f5f9] p-4 lg:p-6 justify-center">
        <div className="bg-white rounded-3xl shadow-sm p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mb-5 flex-shrink-0">
            <ShoppingCart className="w-7 h-7 text-brand-500" />
          </div>
          <h2 className="text-2xl font-bold text-near-black m-0" style={{ fontFamily: "var(--playfair-display)" }}>
            Sign in to Order
          </h2>
          <p className="text-sm text-gray-500 mt-2 mb-8 leading-relaxed">
            Create an account or sign in to start adding items to your basket.
          </p>

          <div className="w-full space-y-3">
            <Link
              href="/login"
              className="block w-full py-3.5 rounded-2xl bg-near-black text-white font-semibold text-sm border-none cursor-pointer hover:bg-near-black/90 transition-colors text-center no-underline"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="block w-full py-3.5 rounded-2xl bg-white text-near-black font-semibold text-sm border-2 border-gray-200 cursor-pointer hover:border-brand-500/30 hover:bg-brand-50/30 transition-all text-center no-underline"
            >
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    ) : (
      <div className="flex flex-col h-full bg-[#f1f5f9]">
        {/* Receipt Paper */}
        <div className="flex-1 flex flex-col mx-4 mt-4 mb-0 overflow-hidden">
          <div className="bg-white rounded-t-2xl shadow-sm flex-shrink-0">
            <div className="px-5 py-4 border-b-2 border-dashed border-gray-200 text-center">
              <h3
                className="text-sm font-bold text-gray-700 tracking-widest m-0 uppercase"
                style={{ fontFamily: "monospace" }}
              >
                Suarez Food Hub
              </h3>
              <p className="text-[10px] text-gray-400 mt-1 mb-0" style={{ fontFamily: "monospace" }}>
                RECEIPT # {receiptNumber}
              </p>
            </div>
          </div>

          <div className={cn("flex-1 bg-white overflow-y-auto", cart.length > 0 ? "px-5 py-3" : "px-5 py-3")}>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                <ShoppingBag className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-400" style={{ fontFamily: "monospace" }}>
                  Tap items to start your order
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={`${item.id}-${item.variant}`}
                    className="pb-4 border-b border-dashed border-gray-200 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={item.image || "/assets/food-hub.jpg"}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-bold text-gray-800 uppercase tracking-wide truncate m-0"
                          style={{ fontFamily: "monospace" }}
                        >
                          {item.quantity}x {item.name}
                        </p>
                        {item.variant && (
                          <p className="text-[10px] text-gray-400 mt-0.5 mb-1" style={{ fontFamily: "monospace" }}>
                            {item.variant}
                          </p>
                        )}
                        <p className="text-xs font-bold text-brand-500 m-0" style={{ fontFamily: "monospace" }}>
                          ₱{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateCartQty(item.id, item.variant, -1)}
                          className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:border-brand-500 transition-colors bg-white"
                        >
                          <Minus className="w-3 h-3 text-gray-500" />
                        </button>
                        <span
                          className="text-xs font-bold text-gray-800 w-5 text-center"
                          style={{ fontFamily: "monospace" }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQty(item.id, item.variant, 1)}
                          className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:border-brand-500 transition-colors bg-white"
                        >
                          <Plus className="w-3 h-3 text-gray-500" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id, item.variant)}
                        className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer"
                        style={{ fontFamily: "monospace" }}
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-b-2xl shadow-sm flex-shrink-0">
            <div className="px-5 py-3 border-t-2 border-dashed border-gray-300">
              <div className="flex items-center justify-between">
                <span
                  className="text-sm font-bold text-gray-800 uppercase tracking-wider"
                  style={{ fontFamily: "monospace" }}
                >
                  TOTAL
                </span>
                <span className="text-base font-bold text-brand-500" style={{ fontFamily: "monospace" }}>
                  ₱{totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="px-4 pb-4 pt-3 flex-shrink-0">
          <Link
            href="/checkout"
            onClick={() => {
              localStorage.setItem("sfh_cart", JSON.stringify(cart));
              setShowCart(false);
            }}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold text-white no-underline transition-all duration-200",
              cart.length > 0
                ? "bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/25 active:scale-[0.98]"
                : "bg-gray-300 pointer-events-none",
            )}
          >
            Proceed to Checkout
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );

  // Persistent desktop panel (always visible, no transition)
  if (persistent) {
    return (
      <div className="hidden lg:flex flex-col h-full w-full bg-[#f1f5f9] border-l border-gray-200/50">{content}</div>
    );
  }

  // Mobile slide-over
  return (
    <div className={cn("fixed inset-0 z-[9999] flex", showCart ? "pointer-events-auto" : "pointer-events-none")}>
      <div
        className={cn(
          "flex-1 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          showCart ? "opacity-100" : "opacity-0",
        )}
        onClick={() => setShowCart(false)}
      />
      <div
        className={cn(
          "w-[400px] max-w-full bg-[#f1f5f9] h-full shadow-2xl transition-transform duration-300 ease-in-out",
          showCart ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-bold text-near-black m-0" style={{ fontFamily: "var(--playfair-display)" }}>
            Your Basket
          </h2>
          <button
            onClick={() => setShowCart(false)}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center border-none cursor-pointer shadow-sm hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4 text-near-black" />
          </button>
        </div>
        {content}
      </div>
    </div>
  );
}
