"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import {
  createProduct,
  deleteProduct,
  generateUniqueSlug,
  moveProduct,
  updateProduct,
} from "@repo/data-access/data/products";
import type { Category } from "@repo/types";
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
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  List,
  Loader2,
  Package,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";

export default function StaffInventoryPage() {
  const supabase = createBrowserTypedClient();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLowStock, setFilterLowStock] = useState(
    typeof window !== "undefined" && window.location.search.includes("lowStock=true"),
  );
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [qtyEdits, setQtyEdits] = useState<Record<string, string>>({});

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state for add/edit dialog
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
  const [formVariantType, setFormVariantType] = useState<string>("none");
  const [formVariants, setFormVariants] = useState<{ name: string; price: string; qty: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const [prodRes, catRes] = await Promise.all([
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
      supabase.from("categories").select("id, name, slug").is("deleted_at", null).order("name"),
    ]);
    setProducts(prodRes.data || []);
    setCategories((catRes.data as Category[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime — stock updates appear live (e.g. after confirming an order)
  useEffect(() => {
    const channel = supabase
      .channel("staff-inventory-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "product_variants" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchData]);

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

  async function handleMoveProduct(productId: string, direction: "up" | "down") {
    const { error } = await moveProduct(supabase, productId, direction, products as any);
    if (error) {
      Swal.fire({ title: "Error", text: error.message || "Failed to reorder product.", icon: "error" });
      return;
    }
    fetchData();
  }

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
    setFormVariantType("none");
    setFormVariants([]);
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
    setFormVariantType(product.variant_type || "none");
    // Load existing variants (key from Supabase select: product_variants)
    if (product.product_variants && product.product_variants.length > 0) {
      const loadedVariants = product.product_variants
        .filter((v: any) => v.is_active !== false)
        .map((v: any) => ({
          name: v.name,
          price: String(v.price),
          qty: String(v.quantity ?? 0),
        }));
      // If all variants have 0 stock but product has main stock, put main stock in first variant
      const allZeroVariantStock = loadedVariants.every((lv: any) => parseInt(lv.qty, 10) === 0);
      if (allZeroVariantStock && (product.quantity ?? 0) > 0 && loadedVariants.length > 0) {
        loadedVariants[0].qty = String(product.quantity);
      }
      setFormVariants(loadedVariants);
    } else {
      setFormVariants([]);
    }
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
    } else {
      Swal.fire({ title: "Error", text: `Failed to upload image: ${error.message}`, icon: "error" });
    }
    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    // Generate a unique slug so re-creating a product with the same name as a
    // soft-deleted one doesn't hit the "duplicate key violates unique constraint" error.
    const baseSlug = formSlug || formName.toLowerCase().replace(/\s+/g, "-");
    const slug = await generateUniqueSlug(supabase, baseSlug, editingProduct?.id);
    const productData: any = {
      name: formName,
      slug,
      description: formDescription || null,
      base_price: parseFloat(formPrice) || 0,
      category_id: formCategoryId,
      variant_type: formVariantType,
      availability: formAvailability as "available" | "sold_out",
      image_url: formImageUrl || null,
      is_featured: formIsFeatured,
      quantity: parseInt(formQuantity, 10) || 0,
      buffer_quantity: parseInt(formBuffer, 10) || 5,
    };

    let result: any;
    let productId: string;
    if (editingProduct) {
      productId = editingProduct.id;
      result = await updateProduct(supabase, productId, productData);
    } else {
      result = await createProduct(supabase, productData);
      if (result.data) productId = result.data.id;
      else productId = result[0]?.id;
    }

    if (result.error) {
      Swal.fire({
        title: "Error",
        text: `Failed to save product: ${result.error.message || "Unknown error"}`,
        icon: "error",
      });
      setSaving(false);
      return;
    }

    // Save variants if variant type is selected.
    // NOTE: staff cannot hard-delete product_variants (RLS), so instead of
    // delete-all-then-reinsert (which silently failed and left duplicates on the
    // customer menu), we upsert by name and soft-deactivate removed variants.
    if (formVariantType !== "none" && productId) {
      const { data: existingVariants } = await supabase
        .from("product_variants")
        .select("id, name")
        .eq("product_id", productId);
      // Group existing variant ids by name (there may be duplicate rows left over from
      // the old delete-then-reinsert bug). We keep only one id per name and deactivate
      // the rest so duplicates never linger on the customer menu.
      const existingByName = new Map<string, string[]>();
      for (const v of existingVariants || []) {
        const list = existingByName.get(v.name) || [];
        list.push(v.id);
        existingByName.set(v.name, list);
      }
      const newNames = new Set(formVariants.map((v) => v.name.trim()).filter(Boolean));

      // Soft-deactivate every existing row whose name was removed from the form
      let varError: { message?: string } | null = null;
      for (const [name, ids] of existingByName) {
        if (!newNames.has(name)) {
          const { error: removeError } = await supabase
            .from("product_variants")
            .update({ is_active: false })
            .in("id", ids);
          if (removeError) varError = removeError;
        }
      }

      // Upsert the current form variants (dedupe repeated names within the form)
      const seenNames = new Set<string>();
      for (let i = 0; i < formVariants.length; i++) {
        const v = formVariants[i];
        const name = v.name.trim();
        if (!name || seenNames.has(name)) continue;
        seenNames.add(name);
        const payload = {
          name,
          price: parseFloat(v.price) || 0,
          quantity: parseInt(v.qty, 10) || 0,
          sort_order: i,
          is_active: true,
        };
        const existingIds = existingByName.get(name) || [];
        if (existingIds.length > 0) {
          // Keep the first existing row, deactivate any duplicate rows
          const { error: updateError } = await supabase
            .from("product_variants")
            .update(payload)
            .eq("id", existingIds[0]);
          if (updateError) varError = updateError;
          if (existingIds.length > 1) {
            const { error: dupError } = await supabase
              .from("product_variants")
              .update({ is_active: false })
              .in("id", existingIds.slice(1));
            if (dupError) varError = dupError;
          }
        } else {
          const { error } = await supabase
            .from("product_variants")
            .insert({ id: crypto.randomUUID(), product_id: productId, ...payload });
          if (error) varError = error;
        }
      }
      if (varError) {
        const msg = varError?.message || JSON.stringify(varError);
        Swal.fire({
          icon: "error",
          title: "Variants failed to save",
          text: `Product was saved but variants failed: ${msg}. Please edit the product to add variants.`,
          footer: `<span style="font-size:11px;color:#94a3b8;">Check console for details</span>`,
        });
        console.error("Failed to save variants:", varError);
        fetchData();
        setSaving(false);
        return;
      }
    } else if (editingProduct && productId) {
      // If switching to no variants, soft-deactivate existing ones (staff can't hard-delete)
      await supabase.from("product_variants").update({ is_active: false }).eq("product_id", productId);
    }

    Swal.fire({ title: "Success", text: `Product ${editingProduct ? "updated" : "created"}!`, icon: "success" });
    setDialogOpen(false);
    fetchData();
    setSaving(false);
  }

  async function handleDeleteProduct(product: any) {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Delete ${product.name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });
    if (!result.isConfirmed) return;

    const { error } = await deleteProduct(supabase, product.id);
    if (error) {
      Swal.fire({ title: "Error", text: error.message, icon: "error" });
    } else {
      Swal.fire({ title: "Deleted!", text: "Product deleted.", icon: "success" });
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    }
  }

  // Low stock = total available units (sum of active variant quantities for
  // variant products, else main quantity) at or below the buffer.
  // Matches the staff dashboard's low-stock count exactly.
  const isLowStock = (p: any) => {
    const buffer = p.buffer_quantity ?? 5;
    if (p.variant_type && p.variant_type !== "none") {
      const totalVariantStock = (p.product_variants || [])
        .filter((v: any) => v.is_active !== false)
        .reduce((sum: number, v: any) => sum + (v.quantity ?? 0), 0);
      return totalVariantStock <= buffer;
    }
    return (p.quantity ?? 0) <= buffer;
  };

  // Total sellable stock: sum of active variant quantities when the product has
  // variants (orders deduct VARIANT stock), else the main quantity. The table
  // must show this — otherwise variant sales look like "stock never decreases",
  // which is exactly the client-reported bug.
  const productStock = (p: any) => {
    if (p.variant_type && p.variant_type !== "none" && (p.product_variants || []).length > 0) {
      return (p.product_variants || [])
        .filter((v: any) => v.is_active !== false)
        .reduce((sum: number, v: any) => sum + (v.quantity ?? 0), 0);
    }
    return p.quantity ?? 0;
  };

  const filtered = products.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.category_id === filterCategory;
    // Only "available" products are counted on the staff dashboard banner,
    // so the low-stock filter must match that exactly (sold-out products are
    // already known to be out — they don't belong in the "needs restocking" list).
    const matchesLowStock = !filterLowStock || (p.availability === "available" && isLowStock(p));
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Inventory</h1>
          <p className="text-sm text-muted-foreground">Manage products, stock, and categories</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2 bg-brand-500 hover:bg-brand-600 text-white">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
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
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setFilterLowStock(!filterLowStock)}
          className={`h-10 px-4 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
            filterLowStock
              ? "bg-red-100 border-red-300 text-red-700"
              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Low Stock Only
        </button>
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
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((product) => {
                    const isLow = isLowStock(product);
                    const currentEdit = qtyEdits[product.id];
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{product.name}</p>
                              {product.is_featured && (
                                <Badge className="mt-0.5 bg-amber-100 text-amber-700 border-0 text-[10px]">
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
                          <span className="text-sm text-gray-600">{product.category?.name || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold">{formatCurrency(product.base_price)}</span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isLow ? "text-red-600" : "text-gray-900"}`}>
                              {productStock(product)}
                            </span>
                            {isLow && (
                              <Badge className="bg-red-100 text-red-700 text-[9px] border-0">
                                <AlertTriangle size={9} className="mr-1" /> Low
                              </Badge>
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
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(product)}
                              className="gap-1 px-2"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteProduct(product)}
                              className="gap-1 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          {/* Quick stock update */}
                          <div className="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-gray-100">
                            <button
                              onClick={() =>
                                setQtyEdits((prev) => ({
                                  ...prev,
                                  [product.id]: String(
                                    Math.max(0, parseInt(prev[product.id] ?? String(product.quantity), 10) - 1),
                                  ),
                                }))
                              }
                              className="h-7 w-7 shrink-0 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-lg font-bold leading-none cursor-pointer bg-white"
                            >
                              &minus;
                            </button>
                            <Input
                              type="number"
                              min="0"
                              placeholder={String(product.quantity)}
                              value={currentEdit ?? ""}
                              onChange={(e) => setQtyEdits((prev) => ({ ...prev, [product.id]: e.target.value }))}
                              className="w-14 h-7 text-xs text-center"
                            />
                            <button
                              onClick={() =>
                                setQtyEdits((prev) => ({
                                  ...prev,
                                  [product.id]: String(
                                    (parseInt(prev[product.id] ?? String(product.quantity), 10) || 0) + 1,
                                  ),
                                }))
                              }
                              className="h-7 w-7 shrink-0 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-lg font-bold leading-none cursor-pointer bg-white"
                            >
                              +
                            </button>
                            <Button
                              size="sm"
                              onClick={() => saveQuantity(product.id)}
                              disabled={savingId === product.id || currentEdit === undefined || currentEdit === ""}
                              className="bg-brand-500 hover:bg-brand-600 text-white h-7 w-7 shrink-0 p-0"
                            >
                              {savingId === product.id ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <Save size={10} />
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

          {/* Mobile Cards — lg:hidden, no desktop impact */}
          <div className="lg:hidden space-y-3">
            {filtered.map((product) => {
              const isLow = isLowStock(product);
              const currentEdit = qtyEdits[product.id];
              return (
                <Card key={product.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        {product.image_url ? (
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
                        <p className="text-xs text-gray-500 mt-0.5">{product.category?.name || "—"}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          <span className="text-sm font-bold">{formatCurrency(product.base_price)}</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-bold ${isLow ? "text-red-600" : "text-gray-900"}`}>
                              Stock: {productStock(product)}
                            </span>
                            {isLow && (
                              <Badge className="bg-red-100 text-red-700 text-[9px] border-0">
                                <AlertTriangle size={9} className="mr-1" /> Low
                              </Badge>
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
                        {/* Actions row */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(product)}
                              className="gap-1 px-2.5"
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteProduct(product)}
                              className="gap-1 px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                setQtyEdits((prev) => ({
                                  ...prev,
                                  [product.id]: String(
                                    Math.max(0, parseInt(prev[product.id] ?? String(product.quantity), 10) - 1),
                                  ),
                                }))
                              }
                              className="h-8 w-8 shrink-0 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-lg font-bold leading-none cursor-pointer bg-white"
                            >
                              &minus;
                            </button>
                            <Input
                              type="number"
                              min="0"
                              placeholder={String(product.quantity)}
                              value={currentEdit ?? ""}
                              onChange={(e) => setQtyEdits((prev) => ({ ...prev, [product.id]: e.target.value }))}
                              className="w-16 h-8 text-xs text-center"
                            />
                            <button
                              onClick={() =>
                                setQtyEdits((prev) => ({
                                  ...prev,
                                  [product.id]: String(
                                    (parseInt(prev[product.id] ?? String(product.quantity), 10) || 0) + 1,
                                  ),
                                }))
                              }
                              className="h-8 w-8 shrink-0 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-lg font-bold leading-none cursor-pointer bg-white"
                            >
                              +
                            </button>
                            <Button
                              size="sm"
                              onClick={() => saveQuantity(product.id)}
                              disabled={savingId === product.id || currentEdit === undefined || currentEdit === ""}
                              className="bg-brand-500 hover:bg-brand-600 text-white h-8 w-8 shrink-0 p-0"
                            >
                              {savingId === product.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Save size={12} />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
            <div className="space-y-5">
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
                      className="gap-2"
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
                <label htmlFor="inv-slug" className="text-sm font-medium text-gray-700 block mb-1">
                  Slug
                </label>
                <Input
                  id="inv-slug"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="product-slug"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Product description"
                  rows={5}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Variant Type</label>
                  <Select
                    value={formVariantType}
                    onValueChange={(val) => {
                      setFormVariantType(val);
                      if (val === "none") setFormVariants([]);
                      else if (formVariants.length === 0) {
                        // Pre-fill default variants based on type
                        if (val === "size")
                          setFormVariants([
                            { name: "Small", price: "", qty: "20" },
                            { name: "Medium", price: "", qty: "15" },
                            { name: "Large", price: "", qty: "10" },
                          ]);
                        else if (val === "sugar_level")
                          setFormVariants([
                            { name: "Less Sugar", price: "", qty: "20" },
                            { name: "Regular", price: "", qty: "20" },
                            { name: "Extra Sweet", price: "", qty: "20" },
                          ]);
                        else if (val === "preparation")
                          setFormVariants([
                            { name: "Steamed", price: "", qty: "20" },
                            { name: "Fried", price: "", qty: "20" },
                          ]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Variants</SelectItem>
                      <SelectItem value="size">Size (Small/Medium/Large)</SelectItem>
                      <SelectItem value="sugar_level">Sugar Level</SelectItem>
                      <SelectItem value="preparation">Preparation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Price section: Single price or Variant prices */}
              {formVariantType === "none" ? (
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
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 block">
                      <span className="inline-flex items-center gap-1">
                        <List className="h-4 w-4" />
                        Variant Options
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormVariants([...formVariants, { name: "", price: "", qty: "0" }])}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium bg-transparent border-none cursor-pointer"
                    >
                      + Add Variant
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formVariants.map((v, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={v.name}
                          onChange={(e) => {
                            const updated = [...formVariants];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setFormVariants(updated);
                          }}
                          placeholder={
                            formVariantType === "size"
                              ? "e.g. Small"
                              : formVariantType === "sugar_level"
                                ? "e.g. Regular"
                                : "e.g. Steamed"
                          }
                          className="flex-[2] h-9 px-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 min-w-0"
                        />
                        <div className="relative w-[70px] shrink-0">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                            ₱
                          </span>
                          <input
                            type="number"
                            value={v.price}
                            onChange={(e) => {
                              const updated = [...formVariants];
                              updated[idx] = { ...updated[idx], price: e.target.value };
                              setFormVariants(updated);
                            }}
                            placeholder="0"
                            min="0"
                            step="0.01"
                            className="w-full h-9 pl-4 pr-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                        <input
                          type="number"
                          value={v.qty}
                          onChange={(e) => {
                            const updated = [...formVariants];
                            updated[idx] = { ...updated[idx], qty: e.target.value };
                            setFormVariants(updated);
                          }}
                          placeholder="Qty"
                          min="0"
                          className="w-14 h-9 px-1.5 rounded-lg border border-gray-200 text-xs text-center focus:outline-none focus:ring-1 focus:ring-brand-500 shrink-0"
                          title="Stock quantity for this variant"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (formVariants.length <= 1) return;
                            setFormVariants(formVariants.filter((_, i) => i !== idx));
                          }}
                          disabled={formVariants.length <= 1}
                          className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 bg-transparent border-none cursor-pointer shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formVariantType === "none" ? (
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
              ) : (
                <div className="text-xs text-gray-400 italic">
                  Stock is managed per variant above. Total:{" "}
                  {formVariants.reduce((sum, v) => sum + (parseInt(v.qty, 10) || 0), 0)} units
                </div>
              )}
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
                  className="h-4 w-4 rounded border-gray-300"
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
              disabled={
                saving || !formName || (formVariantType === "none" ? !formPrice : formVariants.every((v) => !v.price))
              }
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
