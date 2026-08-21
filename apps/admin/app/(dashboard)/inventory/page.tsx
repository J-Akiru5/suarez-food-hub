"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getCategories } from "@repo/data-access/data/categories";
import { moveProduct } from "@repo/data-access/data/products";
import type { Category, Product } from "@repo/types";
import { Badge, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { formatCurrency } from "@repo/utils";
import { ArrowDown, ArrowUp, Image as ImageIcon, Package, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function InventoryPage() {
  const supabase = createBrowserTypedClient();
  const [products, setProducts] = useState<(Product & { category?: Category; product_variants?: any[] })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const fetchData = useCallback(async () => {
    const [prodRes, catData] = await Promise.all([
      supabase
        .from("products")
        .select("*, category:categories(*), product_variants(*)")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .then(async (res) => {
          // sort_order added in migration 0020 — live DB may not have it yet.
          if (res.error) {
            const fallback = await supabase
              .from("products")
              .select("*, category:categories(*), product_variants(*)")
              .is("deleted_at", null)
              .order("created_at", { ascending: false });
            return fallback;
          }
          return res;
        }),
      getCategories(supabase),
    ]);
    setProducts((prodRes.data as (Product & { category?: Category; product_variants?: any[] })[]) || []);
    setCategories((catData as Category[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime — stock updates appear live (e.g. after staff confirms an order)
  useEffect(() => {
    const channel = supabase
      .channel("inventory-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "product_variants" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchData]);

  async function handleMoveProduct(productId: string, direction: "up" | "down") {
    await moveProduct(supabase, productId, direction, products as any);
    fetchData();
  }

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Total sellable stock: sum of active variant quantities when the product has
  // variants (orders deduct VARIANT stock), else the main quantity. The table
  // must show this — otherwise variant sales look like "stock never decreases",
  // which is exactly the client-reported bug.
  // biome-ignore lint/suspicious/noExplicitAny: product rows carry extra fields
  const productStock = (p: any) => {
    if (p.variant_type && p.variant_type !== "none" && (p.product_variants || []).length > 0) {
      return (p.product_variants || [])
        .filter((v: any) => v.is_active !== false)
        .reduce((sum: number, v: any) => sum + (v.quantity ?? 0), 0);
    }
    return p.quantity ?? 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Inventory</h1>
          <p className="text-sm text-muted-foreground">View product stock levels (Staff manages products)</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-crimson-500 focus:border-transparent"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No products found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table — unchanged */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Product
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                      Category
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Price
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                      Stock
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                            {product.image_url ? (
                              // biome-ignore lint/performance/noImgElement: External images may not be optimizable by next/image
                              <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            {product.is_featured && (
                              <Badge className="mt-0.5 bg-crimson-100 text-crimson-700 border-0 text-[10px]">
                                Featured
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 mt-1.5">
                          <button
                            type="button"
                            onClick={() => handleMoveProduct(product.id, "up")}
                            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                            title="Move up"
                          >
                            <ArrowUp className="h-3 w-3 text-gray-500" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveProduct(product.id, "down")}
                            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                            title="Move down"
                          >
                            <ArrowDown className="h-3 w-3 text-gray-500" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm text-gray-600">{product.category?.name || "N/A"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold">{formatCurrency(product.base_price)}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-sm font-bold ${productStock(product) <= (product.buffer_quantity ?? 5) ? "text-red-600" : "text-gray-900"}`}
                          >
                            {productStock(product)}
                          </span>
                          {productStock(product) <= (product.buffer_quantity ?? 5) && (
                            <Badge className="bg-red-100 text-red-700 text-[9px] border-0">Low</Badge>
                          )}
                        </div>
                        {product.variant_type &&
                          product.variant_type !== "none" &&
                          (product.product_variants || []).length > 0 && (
                            <span className="block text-[10px] text-gray-400 font-normal mt-0.5">
                              {(product.product_variants || [])
                                .filter((v: any) => v.is_active !== false)
                                .map((v: any) => `${v.name}: ${v.quantity ?? 0}`)
                                .join(" · ")}
                            </span>
                          )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${product.availability === "available" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {product.availability.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards — lg:hidden, no desktop impact */}
          <div className="lg:hidden space-y-3">
            {filteredProducts.map((product) => (
              <Card key={product.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                      {product.image_url ? (
                        // biome-ignore lint/performance/noImgElement: External images may not be optimizable by next/image
                        <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{product.name}</p>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveProduct(product.id, "up")}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Move up"
                            >
                              <ArrowUp className="h-3 w-3 text-gray-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveProduct(product.id, "down")}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Move down"
                            >
                              <ArrowDown className="h-3 w-3 text-gray-400" />
                            </button>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                            product.availability === "available"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {product.availability === "available" ? "In Stock" : "Sold Out"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{product.category?.name || "N/A"}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className="text-sm font-bold">{formatCurrency(product.base_price)}</span>
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-xs font-bold ${productStock(product) <= (product.buffer_quantity ?? 5) ? "text-red-600" : "text-gray-900"}`}
                          >
                            Stock: {productStock(product)}
                          </span>
                          {productStock(product) <= (product.buffer_quantity ?? 5) && (
                            <Badge className="bg-red-100 text-red-700 text-[9px] border-0">Low</Badge>
                          )}
                        </div>
                        {product.variant_type &&
                          product.variant_type !== "none" &&
                          (product.product_variants || []).length > 0 && (
                            <span className="block text-[10px] text-gray-400 font-normal mt-0.5">
                              {(product.product_variants || [])
                                .filter((v: any) => v.is_active !== false)
                                .map((v: any) => `${v.name}: ${v.quantity ?? 0}`)
                                .join(" · ")}
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
