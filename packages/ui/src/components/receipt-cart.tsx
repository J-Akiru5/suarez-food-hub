"use client";

import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

export interface ReceiptCartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variant?: string;
}

export interface ReceiptCartProps {
  items: ReceiptCartItem[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (id: string, quantity: number, variant?: string) => void;
  onRemove: (id: string, variant?: string) => void;
  onCheckout: () => void;
}

const ReceiptCart = React.forwardRef<HTMLDivElement, ReceiptCartProps>(
  ({ items, isOpen, onClose, onUpdateQuantity, onRemove, onCheckout }, ref) => {
    const receiptNumber = React.useMemo(() => Math.floor(100000 + Math.random() * 900000), []);

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
      <>
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 z-[9997] bg-black/40 backdrop-blur-sm transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          onClick={onClose}
        />

        {/* Panel */}
        <div
          ref={ref}
          className={cn(
            "fixed top-0 right-0 z-[9998] h-full w-full max-w-[440px] bg-[#f1f5f9] shadow-2xl transition-transform duration-300 ease-in-out flex flex-col",
            isOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          {/* Header */}
          <div className="bg-[#b1454a] text-white px-6 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-wider" style={{ fontFamily: "monospace" }}>
                SUAREZ FOOD HUB
              </h2>
              <p className="text-xs text-white/70 mt-0.5" style={{ fontFamily: "monospace" }}>
                RECEIPT #{receiptNumber}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Receipt Paper */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="bg-white rounded-2xl shadow-sm relative">
              {/* Torn paper edge */}
              <div className="absolute -bottom-3 left-0 right-0 h-6 overflow-hidden">
                <svg viewBox="0 0 440 24" className="w-full h-full" preserveAspectRatio="none">
                  <path
                    d="M0,0 L440,0 L440,8 Q430,16 420,8 Q410,0 400,8 Q390,16 380,8 Q370,0 360,8 Q350,16 340,8 Q330,0 320,8 Q310,16 300,8 Q290,0 280,8 Q270,16 260,8 Q250,0 240,8 Q230,16 220,8 Q210,0 200,8 Q190,16 180,8 Q170,0 160,8 Q150,16 140,8 Q130,0 120,8 Q110,16 100,8 Q90,0 80,8 Q70,16 60,8 Q50,0 40,8 Q30,16 20,8 Q10,0 0,8 Z"
                    fill="white"
                  />
                </svg>
              </div>

              {items.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm" style={{ fontFamily: "monospace" }}>
                    Your cart is empty
                  </p>
                </div>
              ) : (
                <div className="p-5">
                  {/* Items */}
                  {items.map((item) => (
                    <div
                      key={`${item.id}-${item.variant}`}
                      className="mb-5 pb-5 border-b border-dashed border-gray-200 last:border-0 last:mb-0 last:pb-0"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-bold text-gray-900 uppercase tracking-wide truncate"
                            style={{ fontFamily: "monospace" }}
                          >
                            {item.quantity}x {item.name}
                          </p>
                          {item.variant && (
                            <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: "monospace" }}>
                              {item.variant}
                            </p>
                          )}
                          <p className="text-sm font-bold text-[#b1454a] mt-1" style={{ fontFamily: "monospace" }}>
                            ₱{(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1), item.variant)}
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
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1, item.variant)}
                            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-[#b1454a] transition-colors"
                          >
                            <Plus className="w-3 h-3 text-gray-500" />
                          </button>
                        </div>
                        <button
                          onClick={() => onRemove(item.id, item.variant)}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                          style={{ fontFamily: "monospace" }}
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Total */}
                  <div className="border-t-2 border-dashed border-gray-300 pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-base font-bold text-gray-900 uppercase tracking-wider"
                        style={{ fontFamily: "monospace" }}
                      >
                        TOTAL
                      </span>
                      <span className="text-xl font-bold text-[#b1454a]" style={{ fontFamily: "monospace" }}>
                        ₱{total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Checkout Button */}
          {items.length > 0 && (
            <div className="px-6 pb-6 pt-2">
              <button
                onClick={onCheckout}
                className="w-full py-4 bg-[#b1454a] text-white font-semibold rounded-30 text-base hover:bg-[#9a3a3f] transition-all duration-200 active:scale-[0.98] shadow-lg"
              >
                Checkout — ₱{total.toFixed(2)}
              </button>
            </div>
          )}
        </div>
      </>
    );
  },
);
ReceiptCart.displayName = "ReceiptCart";

export { ReceiptCart };
