"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getBusinessConfig } from "@repo/data-access/data/business";
import { Button, Card, CardContent, Input } from "@repo/ui";
import { Loader2, MapPin, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";

// Keep in sync with the cap enforced by PATCH /api/settings.
const MAX_MIN_ORDER_AMOUNT = 100000;

export default function StaffSettingsPage() {
  const supabase = createBrowserTypedClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Kept as a string so the field can be blank (= no minimum).
  const [minOrderAmount, setMinOrderAmount] = useState("");

  const fetchConfig = useCallback(async () => {
    const data = await getBusinessConfig(supabase);
    const amount = data?.delivery_min_order_amount;
    setMinOrderAmount(amount === null || amount === undefined ? "" : String(amount));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function handleSave() {
    const trimmed = minOrderAmount.trim();
    const amount = trimmed === "" ? null : Number(trimmed);
    if (amount !== null && (!Number.isInteger(amount) || amount < 0 || amount > MAX_MIN_ORDER_AMOUNT)) {
      Swal.fire({
        icon: "error",
        title: "Invalid amount",
        text: `Enter a whole number between 0 and ${MAX_MIN_ORDER_AMOUNT}, or leave it blank for no minimum.`,
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_min_order_amount: amount }),
      });
      const response = await res.json();

      if (!response.success) {
        Swal.fire({ icon: "error", title: "Save failed", text: response.error || "Unknown error" });
        setSaving(false);
        return;
      }

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Settings saved successfully!",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      Swal.fire({ icon: "error", title: "Save failed", text: err instanceof Error ? err.message : "Network error" });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-display">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage store settings that affect customer orders</p>
      </div>

      {/* Delivery */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg font-display">Delivery</h2>
              <p className="text-sm text-muted-foreground">Rules applied to delivery orders at checkout</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="min-order-amount" className="text-sm font-medium text-gray-700 block mb-1">
                Minimum Order Amount (₱)
              </label>
              <Input
                id="min-order-amount"
                type="number"
                inputMode="numeric"
                min="0"
                max={MAX_MIN_ORDER_AMOUNT}
                step="1"
                placeholder="No minimum"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Applies to the order subtotal (before the delivery fee). Customers below this amount cannot check out.
                Leave blank for no minimum.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2 bg-brand-500 hover:bg-brand-600 text-white"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
