"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cart";
import { formatCurrency } from "@repo/utils";
import type { Product, ProductVariant } from "@repo/types";
import { Button, Badge, Skeleton, ToastNotification } from "@repo/ui";
import { ArrowLeft, ShoppingCart, Plus, Minus, Star, ShoppingBag, Check } from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [added, setAdded] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "" });

  const addItem = useCartStore((s) => s.addItem);
  const supabase = createClient();

  useEffect(() => {
    async function fetchProduct() {
      const { data: prod } = await supabase
        .from("products")
        .select("*, category:categories(*), variants:product_variants(*)")
        .eq("slug", slug)
        .single();

      if (prod) {
        setProduct(prod);

        const { data: relatedProd } = await supabase
          .from("products")
          .select("*, category:categories(*)")
          .eq("category_id", prod.category_id)
          .eq("availability", "available")
          .neq("id", prod.id)
          .limit(4);

        setRelated(relatedProd || []);

        const defaultVariant = prod.variants?.find(
          (v: ProductVariant) => v.is_active
        );
        if (defaultVariant) {
          setSelectedVariant(defaultVariant);
        } else if (prod.variants?.length > 0) {
          setSelectedVariant(prod.variants[0]);
        }
      }
      setLoading(false);
    }
    fetchProduct();
  }, [slug, supabase]);

  function handleAddToCart() {
    if (!product) return;
    addItem(product, quantity, selectedVariant || undefined);
    setAdded(true);
    setToast({ visible: true, message: `${product.name} added to cart!` });
    setTimeout(() => setAdded(false), 2000);
  }

  const currentPrice =
    (product?.base_price || 0) + (selectedVariant?.price || 0);

  if (loading) {
    return (
      <div className="min-h-dvh bg-creamson">
        <div className="h-72 bg-gray-200" />
        <div className="p-6 space-y-4 max-w-[1280px] mx-auto">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-dvh bg-creamson flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Product not found</p>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-creamson pb-28">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="absolute top-20 left-6 z-10 h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors"
      >
        <ArrowLeft className="h-5 w-5 text-gray-700" />
      </button>

      {/* Product Image */}
      <div className="relative h-72 md:h-96 bg-gray-200 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ShoppingBag className="h-20 w-20 text-gray-300" />
          </div>
        )}
        {product.is_featured && (
          <Badge className="absolute top-4 right-4 bg-[#b1454a] text-white border-0">
            <Star className="h-3 w-3 mr-1 fill-current" />
            Featured
          </Badge>
        )}
      </div>

      {/* Product Info */}
      <div className="max-w-[1280px] mx-auto px-6 py-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1
            className="text-2xl md:text-3xl font-bold text-gray-900"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            {product.name}
          </h1>
          <p className="text-2xl font-bold text-[#b1454a] shrink-0">
            {formatCurrency(currentPrice)}
          </p>
        </div>

        <p className="text-sm text-gray-500 uppercase tracking-wider mb-2">
          {product.category?.name}
        </p>

        {product.description && (
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            {product.description}
          </p>
        )}

        {/* Variants */}
        {product.variants && product.variants.length > 0 && (
          <div className="mb-6">
            <h3
              className="font-bold text-base mb-3"
              style={{ fontFamily: "var(--playfair-display)" }}
            >
              Options
            </h3>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`px-5 py-2.5 rounded-24 text-sm font-semibold border-2 transition-all duration-200 ${
                    selectedVariant?.id === variant.id
                      ? "bg-[#b1454a] text-white border-[#b1454a]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#b1454a]/50"
                  }`}
                >
                  {variant.name}
                  {variant.price !== 0 && (
                    <span className="ml-1 text-xs opacity-75">
                      {variant.price > 0 ? "+" : ""}
                      {formatCurrency(variant.price)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="mb-6">
          <h3
            className="font-bold text-base mb-3"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            Quantity
          </h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="h-11 w-11 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-[#b1454a] transition-colors"
            >
              <Minus className="h-4 w-4 text-gray-600" />
            </button>
            <span
              className="text-2xl font-bold text-gray-900 min-w-[32px] text-center"
              style={{ fontFamily: "var(--playfair-display)" }}
            >
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="h-11 w-11 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-[#b1454a] transition-colors"
            >
              <Plus className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-8">
            <h3
              className="font-bold text-lg mb-4"
              style={{ fontFamily: "var(--playfair-display)" }}
            >
              You might also like
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 sushi__hide-scrollbar">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/menu/${item.slug}`}
                  className="shrink-0 w-40"
                >
                  <div className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                    <div className="h-28 bg-gray-100 relative overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ShoppingBag className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-semibold text-xs line-clamp-2 mb-1 text-gray-900">
                        {item.name}
                      </h4>
                      <p className="text-xs font-bold text-[#b1454a]">
                        {formatCurrency(item.base_price)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Add to Cart */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-white/40 p-4 safe-bottom z-50">
        <div className="max-w-[1280px] mx-auto flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Subtotal</p>
            <p
              className="font-bold text-lg text-gray-900"
              style={{ fontFamily: "var(--playfair-display)" }}
            >
              {formatCurrency(currentPrice * quantity)}
            </p>
          </div>
          <Button
            onClick={handleAddToCart}
            className={`flex-1 h-12 rounded-full font-bold text-white text-base transition-all duration-200 ${
              added
                ? "bg-green-500 hover:bg-green-600"
                : "bg-[#b1454a] hover:bg-[#9a3a3f] active:scale-[0.98]"
            }`}
          >
            {added ? (
              <>
                <Check className="h-5 w-5 mr-2" />
                Added!
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Toast */}
      <ToastNotification
        message={toast.message}
        isVisible={toast.visible}
        onClose={() => setToast({ visible: false, message: "" })}
      />
    </div>
  );
}
