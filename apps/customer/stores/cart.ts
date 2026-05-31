import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product, ProductVariant, CartItem } from "@repo/types";

interface CartStore {
  items: CartItem[];
  addItem: (
    product: Product,
    quantity?: number,
    variant?: ProductVariant
  ) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string
  ) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: (deliveryFee?: number) => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1, variant) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) =>
              item.product.id === product.id &&
              item.variant?.id === variant?.id
          );

          if (existingIndex >= 0) {
            const updated = [...state.items];
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + quantity,
            };
            return { items: updated };
          }

          return {
            items: [...state.items, { product, quantity, variant }],
          };
        });
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (item) =>
              !(
                item.product.id === productId &&
                item.variant?.id === variantId
              )
          ),
        }));
      },

      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId &&
            item.variant?.id === variantId
              ? { ...item, quantity }
              : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getSubtotal: () => {
        return get().items.reduce((sum, item) => {
          const price = item.variant?.price ?? item.product.base_price;
          return sum + price * item.quantity;
        }, 0);
      },

      getTotal: (deliveryFee = 0) => {
        return get().getSubtotal() + deliveryFee;
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "sfh-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
