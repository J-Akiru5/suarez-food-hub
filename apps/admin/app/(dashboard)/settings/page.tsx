"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@repo/ui";
import { Button } from "@repo/ui";
import { Input } from "@repo/ui";
import {
  Settings,
  Upload,
  Loader2,
  Image as ImageIcon,
  Save,
  Store,
  CreditCard,
  QrCode,
  Trash2,
} from "lucide-react";

interface StoreSettings {
  id?: string;
  store_name: string;
  store_address: string;
  store_phone: string;
  store_email: string;
  gcash_qr_url: string;
  gcash_number: string;
  gcash_name: string;
  is_gcash_enabled: boolean;
}

export default function SettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<StoreSettings>({
    store_name: "Suarez Food Hub",
    store_address: "",
    store_phone: "",
    store_email: "",
    gcash_qr_url: "",
    gcash_number: "",
    gcash_name: "",
    is_gcash_enabled: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const { data } = await supabase
      .from("store_settings")
      .select("*")
      .limit(1)
      .single();

    if (data) {
      setSettings({
        id: data.id,
        store_name: data.store_name || "Suarez Food Hub",
        store_address: data.store_address || "",
        store_phone: data.store_phone || "",
        store_email: data.store_email || "",
        gcash_qr_url: data.gcash_qr_url || "",
        gcash_number: data.gcash_number || "",
        gcash_name: data.gcash_name || "",
        is_gcash_enabled: data.is_gcash_enabled ?? true,
      });
    }
    setLoading(false);
  }

  async function handleQRUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `gcash-qr-${Date.now()}.${fileExt}`;
    const filePath = `settings/${fileName}`;

    const { error } = await supabase.storage
      .from("store-assets")
      .upload(filePath, file, { upsert: true });

    if (!error) {
      const { data } = supabase.storage
        .from("store-assets")
        .getPublicUrl(filePath);
      setSettings((prev) => ({ ...prev, gcash_qr_url: data.publicUrl }));
    }

    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);

    const updateData = {
      store_name: settings.store_name,
      store_address: settings.store_address,
      store_phone: settings.store_phone,
      store_email: settings.store_email,
      gcash_qr_url: settings.gcash_qr_url,
      gcash_number: settings.gcash_number,
      gcash_name: settings.gcash_name,
      is_gcash_enabled: settings.is_gcash_enabled,
      updated_at: new Date().toISOString(),
    };

    if (settings.id) {
      await supabase
        .from("store_settings")
        .update(updateData)
        .eq("id", settings.id);
    } else {
      const { data } = await supabase
        .from("store_settings")
        .insert(updateData)
        .select()
        .single();
      if (data) {
        setSettings((prev) => ({ ...prev, id: data.id }));
      }
    }

    setSaving(false);
  }

  async function removeQR() {
    setSettings((prev) => ({ ...prev, gcash_qr_url: "" }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-crimson-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-display">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage store settings and payment configuration
        </p>
      </div>

      {/* GCash QR Code Settings */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <QrCode className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg font-display">GCash QR Code</h2>
              <p className="text-sm text-muted-foreground">
                Upload your GCash QR code for customer payments
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* QR Code Preview */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Current QR Code
              </label>
              <div className="flex items-start gap-4">
                <div className="h-40 w-40 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                  {settings.gcash_qr_url ? (
                    <Image
                      src={settings.gcash_qr_url}
                      alt="GCash QR Code"
                      width={160}
                      height={160}
                      className="object-contain w-full h-full"
                    />
                  ) : (
                    <div className="text-center">
                      <QrCode className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">No QR code uploaded</p>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleQRUpload}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="gap-2"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {settings.gcash_qr_url ? "Replace QR Code" : "Upload QR Code"}
                    </Button>
                    {settings.gcash_qr_url && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={removeQR}
                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended size: 500x500px. Supports PNG, JPG, or SVG.
                  </p>
                </div>
              </div>
            </div>

            {/* GCash Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  GCash Number
                </label>
                <Input
                  value={settings.gcash_number}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, gcash_number: e.target.value }))
                  }
                  placeholder="09XXXXXXXXX"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Account Name
                </label>
                <Input
                  value={settings.gcash_name}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, gcash_name: e.target.value }))
                  }
                  placeholder="Account holder name"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="gcash_enabled"
                checked={settings.is_gcash_enabled}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    is_gcash_enabled: e.target.checked,
                  }))
                }
                className="rounded border-gray-300 text-crimson-600 focus:ring-crimson-500"
              />
              <label htmlFor="gcash_enabled" className="text-sm font-medium text-gray-700">
                Enable GCash payments
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store Information */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-lg bg-crimson-100 flex items-center justify-center">
              <Store className="h-5 w-5 text-crimson-700" />
            </div>
            <div>
              <h2 className="font-bold text-lg font-display">Store Information</h2>
              <p className="text-sm text-muted-foreground">
                Basic store details and contact information
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Store Name
              </label>
              <Input
                value={settings.store_name}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, store_name: e.target.value }))
                }
                placeholder="Store name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Address
              </label>
              <textarea
                value={settings.store_address}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, store_address: e.target.value }))
                }
                placeholder="Store address"
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Phone Number
                </label>
                <Input
                  value={settings.store_phone}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, store_phone: e.target.value }))
                  }
                  placeholder="09XXXXXXXXX"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={settings.store_email}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, store_email: e.target.value }))
                  }
                  placeholder="store@example.com"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Settings Placeholder */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg font-display">Business Settings</h2>
              <p className="text-sm text-muted-foreground">
                Configure delivery fees, minimum orders, and more
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Delivery Fee (₱)
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Minimum Order (₱)
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Free Delivery Minimum (₱)
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Service Fee (₱)
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                Additional business settings coming soon...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-crimson-700 hover:bg-crimson-800 text-white px-8"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
