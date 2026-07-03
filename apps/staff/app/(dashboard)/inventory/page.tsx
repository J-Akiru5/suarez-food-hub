"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { updateProduct } from "@repo/data-access/data/products";
import { Badge, Button, Card, CardContent, Input } from "@repo/ui";
import { AlertTriangle, ImageIcon, Loader2, Package, Save, Search } from "lucide-react";

import { useCallback, useEffect, useState } from "react";

export default function StaffInventoryPage() {
  const supabase = createBrowserTypedClient();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [qtyEdits, setQtyEdits] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    const [prodRes, catRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, base_price, quantity, buffer_quantity, availability, image_url, category:categories(name)")
        .order("name"),
      supabase.from("categories").select("id, name").order("name"),
    ]);
    setProducts(prodRes.data || []);
    setCategories(catRes.data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function saveQuantity(productId: string) {
    const newQty = parseInt(qtyEdits[productId] ?? "", 10);
    if (Number.isNaN(newQty) || newQty < 0) return;
    setSavingId(productId);
    try {
      const availability = newQty > 0 ? "available" : "sold_out";
      await updateProduct(supabase, productId, {
        quantity: newQty,
        availability,
        low_stock_alerted_at: null,
      });
      // Clear edit
      setQtyEdits((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      fetchData();
    } finally {
      setSavingId(null);
    }
  }

  const filtered = products.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.category?.name === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-muted-foreground">Update product stock quantities</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No products found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                    Stock
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Update
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((product) => {
                  const isLow = (product.quantity ?? 0) <= (product.buffer_quantity ?? 5);
                  const currentEdit = qtyEdits[product.id];
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm text-gray-600">{product.category?.name || "—"}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${isLow ? "text-red-600" : "text-gray-900"}`}>
                            {product.quantity ?? 0}
                          </span>
                          {isLow && (
                            <Badge className="bg-red-100 text-red-700 text-[9px] border-0">
                              <AlertTriangle size={9} className="mr-1" /> Low
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            product.availability === "available"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {product.availability === "available" ? "In Stock" : "Sold Out"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                           <Input
                            type="number"
                            min="0"
                            placeholder={String(product.quantity ?? 0)}
                            value={currentEdit ?? ""}
                            onChange={(e) =>
                              setQtyEdits((prev) => ({
                                ...prev,
                                [product.id]: e.target.value,
                              }))
                            }
                            className="w-full sm:w-20 h-8 text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => saveQuantity(product.id)}
                            disabled={savingId === product.id || currentEdit === undefined || currentEdit === ""}
                            className="bg-brand-500 hover:bg-brand-600 text-white h-8"
                          >
                            {savingId === product.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Save size={12} />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
