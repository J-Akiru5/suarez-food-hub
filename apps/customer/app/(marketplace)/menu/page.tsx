"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@repo/utils";
import type { Product, Category } from "@repo/types";
import { Badge } from "@repo/ui";
import { Skeleton } from "@repo/ui";
import { ShoppingBag, Star, Search } from "lucide-react";

export default function MenuPage() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category") || "";
  const searchQuery = searchParams.get("q") || "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(categorySlug);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [catRes, prodRes] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("products")
          .select("*, category:categories(*)")
          .eq("availability", "available")
          .order("sort_order"),
      ]);

      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    setSelectedCategory(categorySlug);
  }, [categorySlug]);

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory
      ? p.category?.slug === selectedCategory
      : true;
    const matchesSearch = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          <button
            onClick={() => setSelectedCategory("")}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat.slug
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="px-4 pb-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
                <Skeleton className="h-36 w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <Link key={product.id} href={`/menu/${product.slug}`}>
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
                      </Badge>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                      {product.name}
                    </h3>
                    <p className="font-bold text-brand-600">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
