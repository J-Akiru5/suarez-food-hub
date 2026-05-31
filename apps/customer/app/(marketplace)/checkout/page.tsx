"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cart";
import { formatCurrency, validateGCashReference } from "@repo/utils";
import { Button, Input } from "@repo/ui";
import type { Profile } from "@repo/types";
import {
  MapPin,
  Phone,
  FileText,
  CreditCard,
  Truck,
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
        .eq("id", user.id)
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

    const now = new Date();
    const orderNumber = `SFH-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        status: "pending",
        payment_method: form.paymentMethod === "cash_on_delivery" ? "cod" : "gcash",
        payment_status:
          form.paymentMethod === "gcash" ? "paid" : "pending",
        subtotal,
        delivery_fee: deliveryFee,
        total,
        delivery_address: form.deliveryAddress,
        delivery_instructions: form.notes || null,
        gcash_reference_no: form.paymentMethod === "gcash" ? form.gcashRef : null,
        payment_proof_url: paymentProofUrl,
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
      variant_id: item.variant?.id || null,
      product_name: item.product.name,
      variant_name: item.variant?.name || null,
      quantity: item.quantity,
      unit_price:
        (item.variant?.price ?? item.product.base_price),
      total_price:
        (item.variant?.price ?? item.product.base_price) *
        item.quantity,
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
        <h2
          className="text-2xl font-bold mb-2 text-gray-900"
          style={{ fontFamily: "var(--playfair-display)" }}
        >
          Order Placed!
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6 max-w-xs">
          Your order has been placed successfully. You can track it in the Orders tab.
        </p>
        <Button
          onClick={() => router.push("/orders")}
          className="bg-[#b1454a] hover:bg-[#9a3a3f] text-white rounded-full px-8"
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
    form.deliveryAddress &&
    form.phone &&
    (form.paymentMethod === "cash_on_delivery" ||
      (form.gcashRef &&
        validateGCashReference(form.gcashRef) &&
        paymentProof));

  return (
    <div className="px-4 pt-4 pb-32 space-y-4">
      <h1
        className="text-2xl font-bold text-gray-900"
        style={{ fontFamily: "var(--playfair-display)" }}
      >
        Checkout
      </h1>

      {/* Delivery Address */}
      <div className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-5">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-[#b1454a]" />
          <h2 className="font-semibold text-sm text-gray-900">Delivery Address</h2>
        </div>
        <textarea
          value={form.deliveryAddress}
          onChange={(e) => updateForm("deliveryAddress", e.target.value)}
          placeholder="Enter your complete delivery address"
          rows={2}
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-[#b1454a] focus:ring-1 focus:ring-[#b1454a]/30 resize-none transition-all"
        />
      </div>

      {/* Contact */}
      <div className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Phone className="h-4 w-4 text-[#b1454a]" />
          <h2 className="font-semibold text-sm text-gray-900">Contact Number</h2>
        </div>
        <Input
          type="tel"
          placeholder="09XX XXX XXXX"
          value={form.phone}
          onChange={(e) => updateForm("phone", e.target.value)}
          className="rounded-2xl"
        />
      </div>

      {/* Order Notes */}
      <div className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-[#b1454a]" />
          <h2 className="font-semibold text-sm text-gray-900">Order Notes</h2>
        </div>
        <textarea
          value={form.notes}
          onChange={(e) => updateForm("notes", e.target.value)}
          placeholder="Any special instructions? (optional)"
          rows={2}
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-[#b1454a] focus:ring-1 focus:ring-[#b1454a]/30 resize-none transition-all"
        />
      </div>

      {/* Payment Method */}
      <div className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-5">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-[#b1454a]" />
          <h2 className="font-semibold text-sm text-gray-900">Payment Method</h2>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => updateForm("paymentMethod", "cash_on_delivery")}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 ${
              form.paymentMethod === "cash_on_delivery"
                ? "border-[#b1454a] bg-[#b1454a]/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Truck className="h-5 w-5 text-[#b1454a]" />
            <div className="text-left">
              <p className="font-medium text-sm">Cash on Delivery</p>
              <p className="text-xs text-gray-500">Pay when you receive your order</p>
            </div>
          </button>

          <button
            onClick={() => updateForm("paymentMethod", "gcash")}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 ${
              form.paymentMethod === "gcash"
                ? "border-[#b1454a] bg-[#b1454a]/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <CreditCard className="h-5 w-5 text-blue-500" />
            <div className="text-left">
              <p className="font-medium text-sm">GCash</p>
              <p className="text-xs text-gray-500">Pay via GCash</p>
            </div>
          </button>
        </div>

        {/* GCash Fields */}
        {form.paymentMethod === "gcash" && (
          <div className="mt-4 space-y-4 border-t border-dashed border-gray-200 pt-4">
            {/* GCash QR Code */}
            <div className="text-center">
              <div className="bg-white rounded-2xl p-4 inline-block shadow-sm border border-gray-100">
                <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center mx-auto">
                  <div className="text-center">
                    <CreditCard className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 font-medium">GCash QR Code</p>
                    <p className="text-[10px] text-gray-400 mt-1">Scan to pay</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Send payment to: <strong>09XXXXXXXXX</strong> (Suarez Food Hub)
              </p>
            </div>

            <Input
              label="GCash Reference Number (13 digits)"
              placeholder="e.g. 1234567890123"
              value={form.gcashRef}
              onChange={(e) => updateForm("gcashRef", e.target.value)}
              maxLength={13}
              className="rounded-2xl"
            />
            {form.gcashRef && !validateGCashReference(form.gcashRef) && (
              <p className="text-xs text-red-500">Must be exactly 13 digits</p>
            )}

            <div>
              <p className="text-sm font-medium mb-2 text-gray-900">Payment Screenshot</p>
              {proofPreview ? (
                <div className="relative inline-block">
                  <Image
                    src={proofPreview}
                    alt="Payment proof"
                    width={200}
                    height={200}
                    className="rounded-2xl object-cover"
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
                  className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-[#b1454a] transition-colors"
                >
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Upload payment screenshot</p>
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
      <div className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-5">
        <h2
          className="font-bold text-base mb-4 text-gray-900"
          style={{ fontFamily: "var(--playfair-display)" }}
        >
          Order Summary
        </h2>
        <div className="space-y-3">
          {items.map((item) => {
            const price = item.variant?.price ?? item.product.base_price;
            return (
              <div
                key={`${item.product.id}-${item.variant?.id || "default"}`}
                className="flex justify-between text-sm"
              >
                <span className="text-gray-500">
                  {item.product.name} {item.variant ? `(${item.variant.name})` : ""} × {item.quantity}
                </span>
                <span className="font-medium text-gray-900">{formatCurrency(price * item.quantity)}</span>
              </div>
            );
          })}
        </div>
        <div className="border-t-2 border-dashed border-gray-200 mt-4 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Delivery Fee</span>
            <span className="text-gray-900">{formatCurrency(deliveryFee)}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-gray-200 pt-2">
            <span className="text-gray-900">Total</span>
            <span className="text-[#b1454a]">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Place Order Button */}
      <button
        onClick={handlePlaceOrder}
        disabled={!isFormValid || loading}
        className="w-full py-4 bg-[#b1454a] text-white font-semibold rounded-full text-base hover:bg-[#9a3a3f] transition-all duration-200 active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : null}
        Place Order — {formatCurrency(total)}
      </button>
    </div>
  );
}
