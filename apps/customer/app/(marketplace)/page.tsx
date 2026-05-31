"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@repo/utils";
import type { Product, Category } from "@repo/types";
import { Card, CardContent } from "@repo/ui";
import { Badge } from "@repo/ui";
import { Skeleton } from "@repo/ui";
import {
  Star,
  ShoppingBag,
  ChevronRight,
  Flame,
  Zap,
} from "lucide-react";

function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      <Skeleton className="h-36 w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="flex gap-3 px-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const supabase = createClient();

  async function fetchData() {
    const [catRes, featRes, prodRes] = await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("products")
        .select("*, category:categories(*)")
        .eq("is_featured", true)
        .eq("availability", "available")
        .order("sort_order")
        .limit(10),
      supabase
        .from("products")
        .select("*, category:categories(*)")
        .eq("availability", "available")
        .order("sort_order"),
    ]);

    setCategories(catRes.data || []);
    setFeatured(featRes.data || []);
    setProducts(prodRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  const filteredProducts = searchQuery
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  return (
    <div className="space-y-6">
      {/* Search Results Header */}
      {searchQuery && (
        <div className="px-4 pt-4">
          <h2 className="text-lg font-bold">
            Results for &quot;{searchQuery}&quot;
          </h2>
          <p className="text-sm text-muted-foreground">
            {filteredProducts.length} item(s) found
          </p>
        </div>
      )}

      {/* Hero Banner */}
      {!searchQuery && (
        <div className="px-4 pt-4">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-brand-500 to-brand-600 p-6 text-white">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5" />
                <span className="text-sm font-medium">Fast Delivery</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">
                Craving something?
              </h2>
              <p className="text-sm text-white/80 mb-4">
                Order from your favorite local restaurants
              </p>
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 bg-white text-brand-600 px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-100 transition-colors"
              >
                <ShoppingBag className="h-4 w-4" />
                Browse Menu
              </Link>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
              <Flame className="h-24 w-24" />
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      {!searchQuery && (
        <div>
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="font-bold text-lg">Categories</h2>
            <Link
              href="/menu"
              className="text-sm text-brand-600 font-medium flex items-center gap-1"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {loading ? (
            <CategorySkeleton />
          ) : (
            <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/menu?category=${cat.slug}`}
                  className="flex flex-col items-center gap-2 shrink-0"
                >
                  <div className="h-16 w-16 rounded-2xl bg-brand-50 flex items-center justify-center overflow-hidden border border-brand-100">
                    {cat.image_url ? (
                      <Image
                        src={cat.image_url}
                        alt={cat.name}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <ShoppingBag className="h-7 w-7 text-brand-500" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Featured Products */}
      {!searchQuery && featured.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-4 mb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-brand-500" />
              <h2 className="font-bold text-lg">Featured</h2>
            </div>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 px-4">
              {[1, 2, 3, 4].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
              {featured.map((product) => (
                <Link
                  key={product.id}
                  href={`/menu/${product.slug}`}
                  className="shrink-0 w-44"
                >
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="h-32 bg-gray-100 relative">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ShoppingBag className="h-10 w-10 text-gray-300" />
                        </div>
                      )}
                      <Badge className="absolute top-2 left-2 bg-brand-500 text-white border-0 text-[10px]">
                        <Star className="h-3 w-3 mr-0.5 fill-current" />
                        Featured
                      </Badge>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {product.category?.name}
                      </p>
                      <p className="font-bold text-brand-600 mt-1">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Products Grid */}
      <div className="px-4 pb-4">
        <h2 className="font-bold text-lg mb-3">
          {searchQuery ? "Search Results" : "All Products"}
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/menu/${product.slug}`}
              >
                <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-36 bg-gray-100 relative">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ShoppingBag className="h-10 w-10 text-gray-300" />
                      </div>
                    )}
                    {product.is_featured && (
                      <Badge className="absolute top-2 right-2 bg-brand-500 text-white border-0 text-[10px]">
                        <Star className="h-3 w-3 mr-0.5 fill-current" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                      {product.category?.name}
                    </p>
                    <p className="font-bold text-brand-600">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pull to refresh indicator */}
        {refreshing && (
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && !refreshing && (
          <button
            onClick={handleRefresh}
            className="w-full mt-4 py-2 text-sm text-brand-600 font-medium hover:bg-brand-50 rounded-lg transition-colors"
          >
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}
