"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCartStore } from "@/stores/cart";
import { formatCurrency } from "@repo/utils";
import { Button } from "@repo/ui";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const getSubtotal = useCartStore((s) => s.getSubtotal);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="h-24 w-24 rounded-full bg-[#b1454a]/10 flex items-center justify-center mb-6">
          <ShoppingBag className="h-12 w-12 text-[#b1454a]/40" />
        </div>
        <h2
          className="text-2xl font-bold mb-2 text-gray-900"
          style={{ fontFamily: "var(--playfair-display)" }}
        >
          Your cart is empty
        </h2>
        <p className="text-sm text-gray-500 mb-6 text-center max-w-xs">
          Browse our menu and add delicious food to your cart
        </p>
        <Button
          onClick={() => router.push("/menu")}
          className="bg-[#b1454a] hover:bg-[#9a3a3f] text-white rounded-full px-8 py-3"
        >
          Browse Menu
        </Button>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const receiptNumber = Math.floor(100000 + Math.random() * 900000);

  return (
    <div className="px-4 pt-4 pb-32">
      {/* Receipt Header */}
      <div className="bg-[#b1454a] text-white rounded-t-32 px-6 py-5">
        <div className="text-center">
          <h2
            className="text-lg font-bold tracking-widest"
            style={{ fontFamily: "monospace" }}
          >
            SUAREZ FOOD HUB
          </h2>
          <p
            className="text-xs text-white/70 mt-1"
            style={{ fontFamily: "monospace" }}
          >
            RECEIPT #{receiptNumber}
          </p>
        </div>
      </div>

      {/* Receipt Paper */}
      <div className="bg-white rounded-b-32 shadow-lg relative">
        {/* Torn paper edge */}
        <div className="absolute -top-3 left-0 right-0 h-6 overflow-hidden">
          <svg viewBox="0 0 400 24" className="w-full h-full" preserveAspectRatio="none">
            <path
              d="M0,24 L0,8 Q10,0 20,8 Q30,16 40,8 Q50,0 60,8 Q70,16 80,8 Q90,0 100,8 Q110,16 120,8 Q130,0 140,8 Q150,16 160,8 Q170,0 180,8 Q190,16 200,8 Q210,0 220,8 Q230,16 240,8 Q250,0 260,8 Q270,16 280,8 Q290,0 300,8 Q310,16 320,8 Q330,0 340,8 Q350,16 360,8 Q370,0 380,8 Q390,16 400,8 L400,24 Z"
              fill="white"
            />
          </svg>
        </div>

        <div className="px-6 py-6">
          {/* Clear All Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={clearCart}
              className="text-xs text-red-500 font-medium hover:text-red-600 transition-colors"
              style={{ fontFamily: "monospace" }}
            >
              CLEAR ALL
            </button>
          </div>

          {/* Cart Items */}
          {items.map((item) => {
            const price = item.variant?.price ?? item.product.base_price;
            const itemTotal = price * item.quantity;
            const itemKey = `${item.product.id}-${item.variant?.id || "default"}`;

            return (
              <div
                key={itemKey}
                className="mb-5 pb-5 border-b border-dashed border-gray-200 last:border-0 last:mb-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    {item.product.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ShoppingBag className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-bold text-gray-900 uppercase tracking-wide truncate"
                      style={{ fontFamily: "monospace" }}
                    >
                      {item.quantity}x {item.product.name}
                    </p>
                    {item.variant && (
                      <p
                        className="text-xs text-gray-400 mt-0.5"
                        style={{ fontFamily: "monospace" }}
                      >
                        {item.variant.name}
                      </p>
                    )}
                    <p
                      className="text-sm font-bold text-[#b1454a] mt-1"
                      style={{ fontFamily: "monospace" }}
                    >
                      {formatCurrency(itemTotal)}
                    </p>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.product.id,
                          Math.max(1, item.quantity - 1),
                          item.variant?.id
                        )
                      }
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-[#b1454a] transition-colors"
                    >
                      <Minus className="w-3 h-3 text-gray-500" />
                    </button>
                    <span
                      className="text-sm font-bold text-gray-900 w-6 text-center"
                      style={{ fontFamily: "monospace" }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)
                      }
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-[#b1454a] transition-colors"
                    >
                      <Plus className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id, item.variant?.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                    style={{ fontFamily: "monospace" }}
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          {/* Subtotal */}
          <div className="border-t-2 border-dashed border-gray-300 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <span
                className="text-sm text-gray-500 uppercase tracking-wider"
                style={{ fontFamily: "monospace" }}
              >
                Subtotal
              </span>
              <span
                className="text-sm font-bold text-gray-900"
                style={{ fontFamily: "monospace" }}
              >
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span
                className="text-sm text-gray-500 uppercase tracking-wider"
                style={{ fontFamily: "monospace" }}
              >
                Delivery Fee
              </span>
              <span
                className="text-xs text-gray-400"
                style={{ fontFamily: "monospace" }}
              >
                Calculated at checkout
              </span>
            </div>
          </div>

          {/* Total */}
          <div className="border-t-2 border-dashed border-gray-300 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <span
                className="text-base font-bold text-gray-900 uppercase tracking-wider"
                style={{ fontFamily: "monospace" }}
              >
                TOTAL
              </span>
              <span
                className="text-xl font-bold text-[#b1454a]"
                style={{ fontFamily: "monospace" }}
              >
                {formatCurrency(subtotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Button */}
      <button
        onClick={() => router.push("/checkout")}
        className="w-full mt-6 py-4 bg-[#b1454a] text-white font-semibold rounded-full text-base hover:bg-[#9a3a3f] transition-all duration-200 active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
      >
        Proceed to Checkout
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}
