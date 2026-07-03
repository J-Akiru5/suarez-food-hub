"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getBusinessConfig, updateBusinessConfig } from "@repo/data-access/data/business";
import { Button, Card, CardContent, Input } from "@repo/ui";
import { Loader2, MapPin, QrCode, Save, Store, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";

interface BusinessConfig {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  gcash_qr_url: string;
  maya_qr_url: string;
  delivery_fee: number;
  free_delivery_min: number;
  base_lat: number;
  base_lng: number;
}

export default function SettingsPage() {
  const supabase = createBrowserTypedClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingGcash, setUploadingGcash] = useState(false);
  const [uploadingMaya, setUploadingMaya] = useState(false);
  const gcashRef = useRef<HTMLInputElement>(null);
  const mayaRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState<BusinessConfig>({
    name: "Suarez Food Hub",
    address: "",
    phone: "",
    email: "",
    gcash_qr_url: "",
    maya_qr_url: "",
    delivery_fee: 40,
    free_delivery_min: 200,
    base_lat: 0,
    base_lng: 0,
  });

  const fetchConfig = useCallback(async () => {
    const data = await getBusinessConfig(supabase);
    if (data) {
      setConfig({
        id: data.id,
        name: data.name || "Suarez Food Hub",
        address: data.address || "",
        phone: data.phone || "",
        email: data.email || "",
        gcash_qr_url: data.gcash_qr_url || "",
        maya_qr_url: data.maya_qr_url || "",
        delivery_fee: Number(data.delivery_fee) || 40,
        free_delivery_min: Number(data.free_delivery_min) || 200,
        base_lat: Number(data.base_lat) || 0,
        base_lng: Number(data.base_lng) || 0,
      });
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function uploadQR(
    file: File,
    prefix: string,
    setter: (url: string) => void,
    setUpdating: (v: boolean) => void,
  ) {
    if (!file) return;
    setUpdating(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("prefix", prefix);

      const res = await fetch("/api/upload-qr", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload");
      }

      setter(data.url);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Upload failed",
        text: err.message,
      });
    }

    setUpdating(false);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      name: config.name,
      address: config.address,
      phone: config.phone,
      email: config.email,
      gcash_qr_url: config.gcash_qr_url,
      maya_qr_url: config.maya_qr_url,
      delivery_fee: config.delivery_fee,
      free_delivery_min: config.free_delivery_min,
      updated_at: new Date().toISOString(),
    };

    if (config.id) {
      const { error } = await updateBusinessConfig(supabase, config.id, payload);
      if (error) {
        Swal.fire({ icon: "error", title: "Update failed", text: error.message });
        console.error("Update error:", error);
      } else {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Settings saved successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } else {
      const newId = crypto.randomUUID();
      const insertPayload = { ...payload, id: newId };
      const { data, error } = await supabase.from("business").insert(insertPayload).select().single();
      if (error) {
        Swal.fire({ icon: "error", title: "Insert failed", text: error.message });
        console.error("Insert error:", error);
      }
      if (data) {
        setConfig((prev) => ({ ...prev, id: data.id }));
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Settings saved successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-crimson-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-display">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage store settings, payment QR codes, and delivery configuration
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-6 flex flex-col">
          {/* Store Information */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-10 w-10 rounded-lg bg-crimson-100 flex items-center justify-center">
                  <Store className="h-5 w-5 text-crimson-700" />
                </div>
                <div>
                  <h2 className="font-bold text-lg font-display">Store Information</h2>
                  <p className="text-sm text-muted-foreground">Basic store details and contact info</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Store Name</label>
                  <Input value={config.name} onChange={(e) => setConfig((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Address</label>
                  <textarea
                    value={config.address}
                    onChange={(e) => setConfig((p) => ({ ...p, address: e.target.value }))}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
                    <Input value={config.phone} onChange={(e) => setConfig((p) => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                    <Input value={config.email} onChange={(e) => setConfig((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery & Location */}
          <Card className="flex-1">
            <CardContent className="p-6 h-full">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="font-bold text-lg font-display">Delivery & Location</h2>
                  <p className="text-sm text-muted-foreground">
                    Delivery fees, free delivery threshold, and store coordinates
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Delivery Fee (₱)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.delivery_fee}
                    onChange={(e) => setConfig((p) => ({ ...p, delivery_fee: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Free Delivery Min (₱)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.free_delivery_min}
                    onChange={(e) => setConfig((p) => ({ ...p, free_delivery_min: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Latitude</label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={config.base_lat}
                    onChange={(e) => setConfig((p) => ({ ...p, base_lat: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Longitude</label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={config.base_lng}
                    onChange={(e) => setConfig((p) => ({ ...p, base_lng: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-5 space-y-6">
          {/* Payment QR Codes */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <QrCode className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-bold text-lg font-display">Payment QR Codes</h2>
                  <p className="text-sm text-muted-foreground">Upload GCash and Maya QR codes for customer payments</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* GCash */}
                <div className="space-y-3 p-4 border border-gray-200 rounded-xl">
                  <h3 className="font-semibold text-sm text-blue-600">GCash</h3>
                  <div className="h-36 w-36 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 mx-auto">
                    {config.gcash_qr_url ? (
                      <Image
                        src={config.gcash_qr_url}
                        alt="GCash QR"
                        width={144}
                        height={144}
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <QrCode className="h-12 w-12 text-gray-300" />
                    )}
                  </div>
                  <input
                    ref={gcashRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        uploadQR(
                          f,
                          "gcash",
                          (url) => setConfig((p) => ({ ...p, gcash_qr_url: url })),
                          setUploadingGcash,
                        );
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => gcashRef.current?.click()}
                      disabled={uploadingGcash}
                    >
                      {uploadingGcash ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Upload className="h-3 w-3 mr-1" />
                      )}
                      Upload
                    </Button>
                    {config.gcash_qr_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                        onClick={() => setConfig((p) => ({ ...p, gcash_qr_url: "" }))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Maya */}
                <div className="space-y-3 p-4 border border-gray-200 rounded-xl">
                  <h3 className="font-semibold text-sm text-purple-600">Maya</h3>
                  <div className="h-36 w-36 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 mx-auto">
                    {config.maya_qr_url ? (
                      <Image
                        src={config.maya_qr_url}
                        alt="Maya QR"
                        width={144}
                        height={144}
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <QrCode className="h-12 w-12 text-gray-300" />
                    )}
                  </div>
                  <input
                    ref={mayaRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        uploadQR(f, "maya", (url) => setConfig((p) => ({ ...p, maya_qr_url: url })), setUploadingMaya);
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => mayaRef.current?.click()}
                      disabled={uploadingMaya}
                    >
                      {uploadingMaya ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Upload className="h-3 w-3 mr-1" />
                      )}
                      Upload
                    </Button>
                    {config.maya_qr_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                        onClick={() => setConfig((p) => ({ ...p, maya_qr_url: "" }))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-crimson-700 hover:bg-crimson-800 text-white px-8"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
