"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCartStore } from "@/stores/cart";
import { formatCurrency } from "@repo/utils";
import { Button } from "@repo/ui";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";

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
        <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <ShoppingBag className="h-10 w-10 text-gray-300" />
        </div>
        <h2 className="text-lg font-bold mb-1">Your cart is empty</h2>
        <p className="text-sm text-muted-foreground mb-4 text-center">
          Browse our menu and add delicious food to your cart
        </p>
        <Button
          onClick={() => router.push("/menu")}
          className="bg-brand-500 hover:bg-brand-600 text-white"
        >
          Browse Menu
        </Button>
      </div>
    );
  }

  const subtotal = getSubtotal();

  return (
    <div className="px-4 pt-4 pb-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">
          Cart ({items.length} {items.length === 1 ? "item" : "items"})
        </h1>
        <button
          onClick={clearCart}
          className="text-sm text-red-500 font-medium hover:text-red-600"
        >
          Clear all
        </button>
      </div>

      <div className="space-y-3 mb-6">
        {items.map((item) => {
          const price =
            item.product.price + (item.variant?.price_adjustment || 0);
          const itemTotal = price * item.quantity;
          const itemKey = `${item.product.id}-${item.variant?.id || "default"}`;

          return (
            <div
              key={itemKey}
              className="bg-white rounded-xl p-3 shadow-sm flex gap-3"
            >
              <div className="h-20 w-20 rounded-lg bg-gray-100 overflow-hidden shrink-0 relative">
                {item.product.image_url ? (
                  <Image
                    src={item.product.image_url}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ShoppingBag className="h-8 w-8 text-gray-300" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm line-clamp-2">
                    {item.product.name}
                  </h3>
                  <button
                    onClick={() =>
                      removeItem(item.product.id, item.variant?.id)
                    }
                    className="shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {item.variant && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.variant.name}
                  </p>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.product.id,
                          item.quantity - 1,
                          item.variant?.id
                        )
                      }
                      className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-semibold text-sm w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.product.id,
                          item.quantity + 1,
                          item.variant?.id
                        )
                      }
                      className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="font-bold text-sm text-brand-600">
                    {formatCurrency(itemTotal)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="font-semibold">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-sm text-muted-foreground">Delivery Fee</span>
          <span className="text-sm text-muted-foreground">Calculated at checkout</span>
        </div>
        <div className="border-t mt-3 pt-3 flex justify-between">
          <span className="font-bold">Estimated Total</span>
          <span className="font-bold text-brand-600">
            {formatCurrency(subtotal)}
          </span>
        </div>
      </div>

      <Button
        onClick={() => router.push("/checkout")}
        className="w-full mt-4 h-12 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl"
      >
        Proceed to Checkout
        <ArrowRight className="h-5 w-5 ml-2" />
      </Button>
    </div>
  );
}
