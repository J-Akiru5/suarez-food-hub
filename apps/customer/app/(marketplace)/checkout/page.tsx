"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cart";
import { formatCurrency, validateGCashReference } from "@repo/utils";
import { Button } from "@repo/ui";
import { Input } from "@repo/ui";
import type { Profile } from "@repo/types";
import {
  MapPin,
  Phone,
  FileText,
  CreditCard,
  Truck,
  Store,
  Loader2,
  Upload,
  X,
  CheckCircle2,
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const clearCart = useCartStore((s) => s.clearCart);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    deliveryAddress: "",
    phone: "",
    notes: "",
    paymentMethod: "cash_on_delivery" as "cash_on_delivery" | "gcash",
    gcashRef: "",
  });

  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setForm((prev) => ({
          ...prev,
          deliveryAddress: data.address || "",
          phone: data.phone || "",
        }));
      }
    }
    loadProfile();
  }, [supabase]);

  if (items.length === 0 && !success) {
    router.push("/cart");
    return null;
  }

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleProofChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentProof(file);
      const reader = new FileReader();
      reader.onloadend = () => setProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  function removeProof() {
    setPaymentProof(null);
    setProofPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handlePlaceOrder() {
    if (!form.deliveryAddress || !form.phone) return;
    if (form.paymentMethod === "gcash") {
      if (!form.gcashRef || !validateGCashReference(form.gcashRef)) return;
      if (!paymentProof) return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    let paymentProofUrl: string | null = null;
    if (form.paymentMethod === "gcash" && paymentProof) {
      const fileName = `payment-proofs/${user.id}/${Date.now()}-${paymentProof.name}`;
      const { data: uploadData } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, paymentProof);

      if (uploadData) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("payment-proofs").getPublicUrl(uploadData.path);
        paymentProofUrl = publicUrl;
      }
    }

    const subtotal = getSubtotal();
    const deliveryFee = 49;
    const total = subtotal + deliveryFee;

    const orderNumber = `SFH-${new Date().getFullYear()}${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        status: "pending",
        payment_method: form.paymentMethod,
        payment_status:
          form.paymentMethod === "gcash" ? "paid" : "pending",
        subtotal,
        delivery_fee: deliveryFee,
        total,
        delivery_address: form.deliveryAddress,
        delivery_instructions: form.notes || null,
        gcash_reference: form.paymentMethod === "gcash" ? form.gcashRef : null,
        gcash_proof_url: paymentProofUrl,
      })
      .select()
      .single();

    if (orderError || !order) {
      setLoading(false);
      return;
    }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.product.id,
      product_variant_id: item.variant?.id || null,
      quantity: item.quantity,
      unit_price:
        item.product.price + (item.variant?.price_adjustment || 0),
      total_price:
        (item.product.price + (item.variant?.price_adjustment || 0)) *
        item.quantity,
      special_instructions: item.special_instructions || null,
    }));

    await supabase.from("order_items").insert(orderItems);

    for (const item of items) {
      await supabase.rpc("decrement_stock", {
        p_product_id: item.product.id,
        p_quantity: item.quantity,
      });
    }

    clearCart();
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">Order Placed!</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Your order has been placed successfully. You can track it in the
          Orders tab.
        </p>
        <Button
          onClick={() => router.push("/orders")}
          className="bg-brand-500 hover:bg-brand-600 text-white"
        >
          View Orders
        </Button>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const deliveryFee = 49;
  const total = subtotal + deliveryFee;
  const isFormValid =
    form.deliveryAddress && form.phone && (
      form.paymentMethod === "cash_on_delivery" ||
      (form.gcashRef &&
        validateGCashReference(form.gcashRef) &&
        paymentProof)
    );

  return (
    <div className="px-4 pt-4 pb-32 space-y-4">
      <h1 className="text-xl font-bold">Checkout</h1>

      {/* Delivery Address */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-brand-500" />
          <h2 className="font-semibold text-sm">Delivery Address</h2>
        </div>
        <textarea
          value={form.deliveryAddress}
          onChange={(e) => updateForm("deliveryAddress", e.target.value)}
          placeholder="Enter your complete delivery address"
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      {/* Contact */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Phone className="h-4 w-4 text-brand-500" />
          <h2 className="font-semibold text-sm">Contact Number</h2>
        </div>
        <Input
          type="tel"
          placeholder="09XX XXX XXXX"
          value={form.phone}
          onChange={(e) => updateForm("phone", e.target.value)}
        />
      </div>

      {/* Order Notes */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-brand-500" />
          <h2 className="font-semibold text-sm">Order Notes</h2>
        </div>
        <textarea
          value={form.notes}
          onChange={(e) => updateForm("notes", e.target.value)}
          placeholder="Any special instructions? (optional)"
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-brand-500" />
          <h2 className="font-semibold text-sm">Payment Method</h2>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => updateForm("paymentMethod", "cash_on_delivery")}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              form.paymentMethod === "cash_on_delivery"
                ? "border-brand-500 bg-brand-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Truck className="h-5 w-5 text-brand-500" />
            <div className="text-left">
              <p className="font-medium text-sm">Cash on Delivery</p>
              <p className="text-xs text-muted-foreground">
                Pay when you receive your order
              </p>
            </div>
          </button>

          <button
            onClick={() => updateForm("paymentMethod", "gcash")}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              form.paymentMethod === "gcash"
                ? "border-brand-500 bg-brand-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <CreditCard className="h-5 w-5 text-blue-500" />
            <div className="text-left">
              <p className="font-medium text-sm">GCash</p>
              <p className="text-xs text-muted-foreground">
                Pay via GCash
              </p>
            </div>
          </button>
        </div>

        {/* GCash Fields */}
        {form.paymentMethod === "gcash" && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Send payment to GCash: <strong>09XXXXXXXXX</strong> (Suarez Food
              Hub)
            </p>
            <Input
              label="GCash Reference Number (13 digits)"
              placeholder="e.g. 1234567890123"
              value={form.gcashRef}
              onChange={(e) => updateForm("gcashRef", e.target.value)}
              maxLength={13}
            />
            {form.gcashRef &&
              !validateGCashReference(form.gcashRef) && (
                <p className="text-xs text-red-500">
                  Must be exactly 13 digits
                </p>
              )}

            <div>
              <p className="text-sm font-medium mb-2">Payment Screenshot</p>
              {proofPreview ? (
                <div className="relative inline-block">
                  <Image
                    src={proofPreview}
                    alt="Payment proof"
                    width={200}
                    height={200}
                    className="rounded-lg object-cover"
                  />
                  <button
                    onClick={removeProof}
                    className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-brand-500 transition-colors"
                >
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Upload payment screenshot
                  </p>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProofChange}
                className="hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* Order Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold text-sm mb-3">Order Summary</h2>
        <div className="space-y-2">
          {items.map((item) => {
            const price =
              item.product.price +
              (item.variant?.price_adjustment || 0);
            return (
              <div
                key={`${item.product.id}-${item.variant?.id || "default"}`}
                className="flex justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {item.product.name} {item.variant ? `(${item.variant.name})` : ""} × {item.quantity}
                </span>
                <span>{formatCurrency(price * item.quantity)}</span>
              </div>
            );
          })}
        </div>
        <div className="border-t mt-3 pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery Fee</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="text-brand-600">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Place Order Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-bottom z-50">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handlePlaceOrder}
            disabled={!isFormValid || loading}
            className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : null}
            Place Order - {formatCurrency(total)}
          </Button>
        </div>
      </div>
    </div>
  );
}
