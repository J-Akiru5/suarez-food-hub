"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getCategories } from "@repo/data-access/data/categories";
import { createProduct, deleteProduct, updateProduct } from "@repo/data-access/data/products";
import type { Category, Product } from "@repo/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { formatCurrency } from "@repo/utils";
import { Image as ImageIcon, Loader2, Package, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";

export default function InventoryPage() {
  const supabase = createBrowserTypedClient();
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
  const [formQuantity, setFormQuantity] = useState("");
  const [formBuffer, setFormBuffer] = useState("5");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const [prodRes, catData] = await Promise.all([
      supabase.from("products").select("*, category:categories(*)").order("created_at", { ascending: false }),
      getCategories(supabase),
    ]);
    setProducts((prodRes.data as any[]) || []);
    setCategories((catData as Category[]) || []);
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
    setFormQuantity("0");
    setFormBuffer("5");
    setDialogOpen(true);
  }

  function openEditDialog(product: any) {
    setEditingProduct(product);
    setFormName(product.name);
    setFormSlug(product.slug);
    setFormDescription(product.description || "");
    setFormPrice(String(product.base_price));
    setFormCategoryId(product.category_id || "");
    setFormAvailability(product.availability);
    setFormImageUrl(product.image_url || "");
    setFormIsFeatured(!!product.is_featured);
    setFormQuantity(String(product.quantity ?? 0));
    setFormBuffer(String(product.buffer_quantity ?? 5));
    setDialogOpen(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error } = await supabase.storage
      .from("images")
      .upload(filePath, file, { contentType: file.type, upsert: true });

    if (!error) {
      const { data } = supabase.storage.from("images").getPublicUrl(filePath);
      setFormImageUrl(data.publicUrl);
      Swal.fire({
        title: "Success",
        text: "Image uploaded successfully!",
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
      });
    } else {
      console.error("Supabase Storage Error:", error);
      Swal.fire({
        title: "Error",
        text: `Failed to upload image: ${error.message || "Unknown error"}`,
        icon: "error",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
      });
    }

    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    const productData = {
      name: formName,
      slug: formSlug || formName.toLowerCase().replace(/\s+/g, "-"),
      description: formDescription || null,
      base_price: parseFloat(formPrice) || 0,
      category_id: formCategoryId,
      availability: formAvailability as "available" | "sold_out",
      image_url: formImageUrl || null,
      is_featured: formIsFeatured,
      quantity: parseInt(formQuantity, 10) || 0,
      buffer_quantity: parseInt(formBuffer, 10) || 5,
    };

    let result;
    if (editingProduct) {
      result = await updateProduct(supabase, editingProduct.id, productData);
    } else {
      result = await createProduct(supabase, productData);
    }

    if (result.error) {
      console.error("Product Save Error:", result.error);
      Swal.fire({
        title: "Error",
        text: `Failed to save product: ${result.error.message || "Unknown error"}`,
        icon: "error",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
      });
    } else {
      Swal.fire({
        title: "Success",
        text: `Product ${editingProduct ? "updated" : "created"} successfully!`,
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
      });
      setDialogOpen(false);
      fetchData();
    }
    setSaving(false);
  }

  async function toggleAvailability(product: Product) {
    const newStatus = product.availability === "available" ? "sold_out" : "available";
    await supabase.from("products").update({ availability: newStatus }).eq("id", product.id);
    fetchData();
  }

  async function handleDeleteProduct(product: Product) {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete ${product.name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      const { error } = await deleteProduct(supabase, product.id);
      if (error) {
        Swal.fire({
          title: "Error",
          text: `Failed to delete product: ${error.message || "Unknown error"}`,
          icon: "error",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
        });
      } else {
        Swal.fire({
          title: "Deleted!",
          text: "Product has been deleted.",
          icon: "success",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
        });
        fetchData();
      }
    }
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
          <h1 className="text-2xl font-bold text-gray-900 font-display">Inventory</h1>
          <p className="text-sm text-muted-foreground">Manage your products and stock</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2 bg-crimson-700 hover:bg-crimson-800 text-white">
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
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                    Stock
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
                          className={`text-sm font-bold ${
                            (product.quantity ?? 0) <= (product.buffer_quantity ?? 5) ? "text-red-600" : "text-gray-900"
                          }`}
                        >
                          {product.quantity ?? 0}
                        </span>
                        {(product.quantity ?? 0) <= (product.buffer_quantity ?? 5) && (
                          <Badge className="bg-red-100 text-red-700 text-[9px] border-0">Low</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAvailability(product)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                          product.availability === "available"
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                        }`}
                      >
                        {product.availability.replace(/_/g, " ")}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(product)} className="gap-1">
                          <Pencil className="h-3 w-3" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteProduct(product)}
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
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
        <DialogContent aria-describedby={undefined} className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
            {/* Left Column */}
            <div className="space-y-5">
              {/* Image Upload */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Product Image</label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                    {formImageUrl ? (
                      <img src={formImageUrl} alt="Product" className="object-cover w-full h-full" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="gap-2 w-full sm:w-auto"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Upload Image
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Name</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Product name" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Slug</label>
                <Input
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="product-slug (auto-generated if empty)"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Product description"
                  rows={5}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Price</label>
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
                  <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Stock Quantity</label>
                  <Input
                    type="number"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Low-stock Buffer</label>
                  <Input
                    type="number"
                    value={formBuffer}
                    onChange={(e) => setFormBuffer(e.target.value)}
                    placeholder="5"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Availability</label>
                <Select value={formAvailability} onValueChange={setFormAvailability}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="sold_out">Sold Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formIsFeatured}
                  onChange={(e) => setFormIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-crimson-600 focus:ring-crimson-500"
                />
                <label htmlFor="featured" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Featured Product
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formName || !formPrice}
              className="bg-crimson-700 hover:bg-crimson-800 text-white"
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
