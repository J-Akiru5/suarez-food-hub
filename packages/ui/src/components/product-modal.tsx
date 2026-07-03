"use client";

import { Minus, Plus, ShoppingCart, X } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  base_price: number;
  quantity: number;
  availability: string;
  variants?: ProductVariant[];
}

export interface ProductModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, variant?: ProductVariant, quantity?: number) => void;
}

const ProductModal = React.forwardRef<HTMLDivElement, ProductModalProps>(({ product, onClose, onAddToCart }, ref) => {
  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariant | undefined>(product.variants?.[0]);
  const [quantity, setQuantity] = React.useState(1);

  const currentPrice = selectedVariant?.price ?? product.base_price;

  const handleAddToCart = () => {
    onAddToCart(product, selectedVariant, quantity);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[480px] md:max-w-[860px] bg-white rounded-32 shadow-4xl overflow-y-auto max-h-[90dvh] md:max-h-none md:overflow-hidden animate-slideUp flex flex-col md:flex-row"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Image */}
        <div className="relative h-[260px] md:h-auto md:w-1/2 flex-shrink-0 bg-gray-50 overflow-hidden">
          <div className="absolute inset-0">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-10 md:w-1/2 flex flex-col justify-center">
          <h2
            className="text-[32px] font-bold text-gray-900 mb-2 leading-tight"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            {product.name}
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">{product.description}</p>

          {/* Variant Pills */}
          {product.variants && product.variants.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={cn(
                    "px-5 py-2 rounded-24 text-sm font-semibold border-2 transition-all duration-200",
                    selectedVariant?.id === variant.id
                      ? "bg-[#b1454a] text-white border-[#b1454a]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#b1454a]/50",
                  )}
                >
                  {variant.name}
                </button>
              ))}
            </div>
          )}

          {/* Quantity Stepper */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-[#b1454a] transition-colors"
              >
                <Minus className="w-4 h-4 text-gray-600" />
              </button>
              <span
                className="text-2xl font-bold text-gray-900 min-w-[24px] text-center"
                style={{ fontFamily: "var(--playfair-display)" }}
              >
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-[#b1454a] transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold text-[#b1454a]" style={{ fontFamily: "var(--playfair-display)" }}>
                ₱{(currentPrice * quantity).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Add to Basket Button */}
          <button
            onClick={handleAddToCart}
            disabled={product.quantity <= 0}
            className={cn(
              "w-full py-4 rounded-30 text-white font-semibold text-base flex items-center justify-center gap-2 transition-all duration-200",
              product.quantity <= 0
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-[#b1454a] hover:bg-[#9a3a3f] active:scale-[0.98]",
            )}
          >
            <ShoppingCart className="w-5 h-5" />
            Add to Basket
          </button>
        </div>
      </div>
    </div>
  );
});
ProductModal.displayName = "ProductModal";

export { ProductModal };
