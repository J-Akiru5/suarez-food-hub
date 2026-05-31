"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cart";
import { formatCurrency } from "@repo/utils";
import type { Product, ProductVariant } from "@repo/types";
import { Button } from "@repo/ui";
import { Badge } from "@repo/ui";
import { Skeleton } from "@repo/ui";
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Star,
  ShoppingBag,
  Check,
} from "lucide-react";

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
          (v: ProductVariant) => v.is_default
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
    setTimeout(() => setAdded(false), 2000);
  }

  const currentPrice =
    (product?.price || 0) + (selectedVariant?.price_adjustment || 0);

  if (loading) {
    return (
      <div className="min-h-dvh bg-white">
        <div className="h-72 bg-gray-100" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-dvh bg-white flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">Product not found</p>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white pb-28">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-10 h-9 w-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Product Image */}
      <div className="relative h-72 bg-gray-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ShoppingBag className="h-20 w-20 text-gray-300" />
          </div>
        )}
        {product.is_featured && (
          <Badge className="absolute top-4 right-4 bg-brand-500 text-white border-0">
            <Star className="h-3 w-3 mr-1 fill-current" />
            Featured
          </Badge>
        )}
      </div>

      {/* Product Info */}
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-xl font-bold">{product.name}</h1>
          <p className="text-xl font-bold text-brand-600 shrink-0">
            {formatCurrency(currentPrice)}
          </p>
        </div>

        <p className="text-sm text-muted-foreground mb-1">
          {product.category?.name}
        </p>

        {product.description && (
          <p className="text-sm text-gray-600 mt-3 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Variants */}
        {product.variants && product.variants.length > 0 && (
          <div className="mt-5">
            <h3 className="font-semibold text-sm mb-3">
              {product.variants[0]?.type === "size"
                ? "Select Size"
                : product.variants[0]?.type === "add_on"
                ? "Add-ons"
                : "Options"}
            </h3>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    selectedVariant?.id === variant.id
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span>{variant.name}</span>
                  {variant.price_adjustment !== 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {variant.price_adjustment > 0 ? "+" : ""}
                      {formatCurrency(variant.price_adjustment)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="mt-5">
          <h3 className="font-semibold text-sm mb-3">Quantity</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="h-10 w-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="font-bold text-lg w-8 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="h-10 w-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="px-4 mt-4">
          <h3 className="font-bold text-lg mb-3">You might also like</h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/menu/${item.slug}`}
                className="shrink-0 w-36"
              >
                <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                  <div className="h-24 bg-gray-100 relative">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ShoppingBag className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h4 className="font-medium text-xs line-clamp-2 mb-1">
                      {item.name}
                    </h4>
                    <p className="text-xs font-bold text-brand-600">
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Add to Cart */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-bottom z-50">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <p className="font-bold text-lg">
              {formatCurrency(currentPrice * quantity)}
            </p>
          </div>
          <Button
            onClick={handleAddToCart}
            className={`flex-1 h-12 rounded-xl font-bold text-white ${
              added
                ? "bg-green-500 hover:bg-green-600"
                : "bg-brand-500 hover:bg-brand-600"
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
    </div>
  );
}
