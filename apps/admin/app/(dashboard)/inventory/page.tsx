"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@repo/ui";
import { Button } from "@repo/ui";
import { Badge } from "@repo/ui";
import { Input } from "@repo/ui";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@repo/ui";
import { formatCurrency } from "@repo/utils";
import {
  Plus,
  Pencil,
  Search,
  Package,
  Loader2,
  Minus,
  Image as ImageIcon,
} from "lucide-react";
import type { Product, Category } from "@repo/types";

export default function InventoryPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<(Product & { category?: Category })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formAvailability, setFormAvailability] = useState<string>("available");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formIsFeatured, setFormIsFeatured] = useState(false);

  const fetchData = useCallback(async () => {
    const [prodRes, catRes] = await Promise.all([
      supabase
        .from("products")
        .select("*, category:categories(*)")
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("*")
        .order("sort_order"),
    ]);
    setProducts((prodRes.data as any[]) || []);
    setCategories((catRes.data as Category[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreateDialog() {
    setEditingProduct(null);
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setFormPrice("");
    setFormCategoryId(categories[0]?.id || "");
    setFormAvailability("available");
    setFormImageUrl("");
    setFormIsFeatured(false);
    setDialogOpen(true);
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setFormName(product.name);
    setFormSlug(product.slug);
    setFormDescription(product.description || "");
    setFormPrice(String(product.price));
    setFormCategoryId(product.category_id);
    setFormAvailability(product.availability);
    setFormImageUrl(product.image_url || "");
    setFormIsFeatured(product.is_featured);
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const productData = {
      name: formName,
      slug: formSlug || formName.toLowerCase().replace(/\s+/g, "-"),
      description: formDescription || null,
      price: parseFloat(formPrice) || 0,
      category_id: formCategoryId,
      availability: formAvailability,
      image_url: formImageUrl || null,
      is_featured: formIsFeatured,
    };

    if (editingProduct) {
      await supabase.from("products").update(productData).eq("id", editingProduct.id);
    } else {
      await supabase.from("products").insert(productData);
    }

    setDialogOpen(false);
    setSaving(false);
    fetchData();
  }

  async function toggleAvailability(product: Product) {
    const newStatus = product.availability === "available" ? "unavailable" : "available";
    await supabase
      .from("products")
      .update({ availability: newStatus })
      .eq("id", product.id);
    fetchData();
  }

  async function adjustStock(productId: string, delta: number) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    // Assuming stock is tracked as a field - if not, this is a placeholder
    // For now we just toggle availability based on logic
    await supabase.from("products").update({ updated_at: new Date().toISOString() }).eq("id", productId);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Manage your products and stock
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2 bg-brand-500 hover:bg-brand-600 text-white">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
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

      {/* Products Table */}
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
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Price
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Actions
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
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              width={40}
                              height={40}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          {product.is_featured && (
                            <Badge className="mt-0.5 bg-brand-100 text-brand-700 border-0 text-[10px]">
                              Featured
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-gray-600">
                        {product.category?.name || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold">
                        {formatCurrency(product.price)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAvailability(product)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                          product.availability === "available"
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : product.availability === "pre_order"
                              ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                        }`}
                      >
                        {product.availability.replace(/_/g, " ")}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(product)}
                        className="gap-1"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Name
              </label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Product name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Slug
              </label>
              <Input
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="product-slug (auto-generated if empty)"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Description
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Product description"
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Price
                </label>
                <Input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Category
                </label>
                <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Image URL
              </label>
              <Input
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Availability
              </label>
              <Select value={formAvailability} onValueChange={setFormAvailability}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                  <SelectItem value="pre_order">Pre-order</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="featured"
                checked={formIsFeatured}
                onChange={(e) => setFormIsFeatured(e.target.checked)}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <label htmlFor="featured" className="text-sm font-medium text-gray-700">
                Featured Product
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formName || !formPrice}
              className="bg-brand-500 hover:bg-brand-600 text-white"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingProduct ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
