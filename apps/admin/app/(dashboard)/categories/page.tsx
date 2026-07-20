"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { createCategory, deleteCategory, getCategories, updateCategory } from "@repo/data-access/data/categories";
import type { Category } from "@repo/types";

interface CategoryWithCount extends Category {
  productCount: number;
}
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@repo/ui";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useToast } from "@/lib/use-toast";

export default function CategoriesPage() {
  const { toast } = useToast();
  const supabase = createBrowserTypedClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchCategories = useCallback(async () => {
    const data = await getCategories(supabase);

    // Get product counts
    const cats = (data as Category[]) || [];
    const counts = await Promise.all(
      cats.map(async (cat) => {
        const { count } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("category_id", cat.id);
        return { ...cat, productCount: count || 0 };
      }),
    );

    setCategories(counts as CategoryWithCount[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function openCreateDialog() {
    setEditingCategory(null);
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setFormIsActive(true);
    setDialogOpen(true);
  }

  function openEditDialog(category: Category) {
    setEditingCategory(category);
    setFormName(category.name);
    setFormSlug(category.slug);
    setFormDescription(category.description || "");
    setFormIsActive(category.is_active);
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const categoryData = {
      name: formName,
      slug: formSlug || formName.toLowerCase().replace(/\s+/g, "-"),
      description: formDescription || null,
      is_active: formIsActive,
    };

    let resultError = null;

    if (editingCategory) {
      const { error } = await updateCategory(supabase, editingCategory.id, categoryData);
      resultError = error;
    } else {
      const maxOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0);
      const { error } = await createCategory(supabase, {
        id: crypto.randomUUID(),
        ...categoryData,
        sort_order: maxOrder + 1,
      });
      resultError = error;
    }

    setSaving(false);

    if (resultError) {
      toast({
        title: "Error",
        description: resultError.message || "Something went wrong.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: editingCategory ? "Category updated successfully." : "Category created successfully.",
    });

    setDialogOpen(false);
    fetchCategories();
  }

  async function handleDeleteCategory(id: string, categoryName: string) {
    const result = await Swal.fire({
      title: "Delete Category?",
      text: `Are you sure you want to delete "${categoryName}"? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
    });
    if (!result.isConfirmed) return;

    const { error } = await deleteCategory(supabase, id);
    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Success", description: `"${categoryName}" deleted.` });
    fetchCategories();
  }

  async function moveCategory(category: Category, direction: "up" | "down") {
    const idx = categories.findIndex((c) => c.id === category.id);
    if (idx === -1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;

    const other = categories[swapIdx];
    await supabase.from("categories").update({ sort_order: other.sort_order }).eq("id", category.id);
    await supabase.from("categories").update({ sort_order: category.sort_order }).eq("id", other.id);

    fetchCategories();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Categories</h1>
          <p className="text-sm text-muted-foreground">Manage product categories</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2 bg-crimson-700 hover:bg-crimson-800 text-white">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Tag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No categories yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                    Order
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                    Slug
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Products
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
                {categories.map((category, idx) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveCategory(category, "up")}
                          disabled={idx === 0}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCategory(category, "down")}
                          disabled={idx === categories.length - 1}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{category.name}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-gray-500">{category.slug}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{(category as CategoryWithCount).productCount || 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          category.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {category.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(category)} className="gap-1">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="category-name" className="text-sm font-medium text-gray-700 block mb-1">
                Name
              </label>
              <Input
                id="category-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Category name"
              />
            </div>

            <div>
              <label htmlFor="category-slug" className="text-sm font-medium text-gray-700 block mb-1">
                Slug
              </label>
              <Input
                id="category-slug"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="category-slug (auto-generated if empty)"
              />
            </div>

            <div>
              <label htmlFor="category-description" className="text-sm font-medium text-gray-700 block mb-1">
                Description
              </label>
              <textarea
                id="category-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Category description (optional)"
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded border-gray-300 text-crimson-600 focus:ring-crimson-500"
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formName}
              className="bg-crimson-700 hover:bg-crimson-800 text-white"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
