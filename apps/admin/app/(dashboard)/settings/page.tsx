"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getBusinessConfig, updateBusinessConfig } from "@repo/data-access/data/business";
import { Button, Card, CardContent, Input } from "@repo/ui";
import { Check, Loader2, MapPin, QrCode, Save, Store, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";

// Fetch all Philippine provinces from the public PSGC API (no key needed)
async function fetchAllProvinces(): Promise<{ id: string; name: string }[]> {
  try {
    const regionsRes = await fetch("https://psgc.gitlab.io/api/regions");
    const regions: { code: string; name: string }[] = await regionsRes.json();

    const results = await Promise.allSettled(
      regions.map((r) => fetch(`https://psgc.gitlab.io/api/regions/${r.code}/provinces`).then((res) => res.json())),
    );

    const allProvinces: { id: string; name: string }[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && Array.isArray(result.value)) {
        for (const p of result.value) {
          if (p.code && p.name) {
            allProvinces.push({ id: p.code, name: p.name });
          }
        }
      }
    }

    const seen = new Set<string>();
    return allProvinces
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("Failed to fetch provinces from PSGC API:", err);
    return [];
  }
}

interface BusinessConfig {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  gcash_qr_url: string;
  delivery_fee: number;
  free_delivery_min: number;
  delivery_provinces: string;
}

export default function SettingsPage() {
  const supabase = createBrowserTypedClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingGcash, setUploadingGcash] = useState(false);
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const gcashRef = useRef<HTMLInputElement>(null);
  const [searchProvince, setSearchProvince] = useState("");

  const [config, setConfig] = useState<BusinessConfig>({
    name: "Suarez Food Hub",
    address: "",
    phone: "",
    email: "",
    gcash_qr_url: "",
    delivery_fee: 40,
    free_delivery_min: 200,
    delivery_provinces: "",
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

        delivery_fee: Number(data.delivery_fee) || 40,
        free_delivery_min: Number(data.free_delivery_min) || 200,
        delivery_provinces: data.delivery_provinces || "",
      });
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Fetch all Philippine provinces from the PSGC API
  useEffect(() => {
    fetchAllProvinces().then((list) => {
      setProvinces(list);
    });
  }, []);

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

      setter(data.data?.url || data.url);
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

      delivery_fee: config.delivery_fee,
      free_delivery_min: config.free_delivery_min,
      delivery_provinces: config.delivery_provinces || null,
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
              </div>

              {/* Delivery Area Restriction */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="text-sm font-medium text-gray-700 block mb-2">Allowed Delivery Provinces</label>
                <p className="text-xs text-muted-foreground mb-3">
                  Select provinces where delivery is available. Leave empty for nationwide delivery. This is scalable
                  for multi-branch setups — add provinces as your business grows.
                </p>

                {/* Selected provinces as chips */}
                <div className="flex flex-wrap gap-1.5 mb-3 min-h-[28px]">
                  {config.delivery_provinces
                    ? config.delivery_provinces
                        .split(",")
                        .filter(Boolean)
                        .map((pid) => {
                          const p = provinces.find((x) => x.id === pid);
                          return (
                            <span
                              key={pid}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-medium"
                            >
                              {p?.name || pid}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = config.delivery_provinces
                                    .split(",")
                                    .filter((x) => x !== pid)
                                    .join(",");
                                  setConfig((prev) => ({ ...prev, delivery_provinces: updated }));
                                }}
                                className="hover:text-red-600 focus:outline-none"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          );
                        })
                    : null}
                  {!config.delivery_provinces && (
                    <span className="text-xs text-gray-400 italic">All provinces — no restriction</span>
                  )}
                </div>

                {/* Search & add provinces */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search provinces..."
                    value={searchProvince}
                    onChange={(e) => setSearchProvince(e.target.value)}
                    className="w-full h-9 pl-3 pr-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 mb-2"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-0.5 border border-gray-100 rounded-md p-1 bg-white">
                    {provinces
                      .filter(
                        (p) =>
                          p.name.toLowerCase().includes(searchProvince.toLowerCase()) &&
                          !config.delivery_provinces.split(",").includes(p.id),
                      )
                      .slice(0, 20)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            const existing = config.delivery_provinces
                              ? config.delivery_provinces.split(",").filter(Boolean)
                              : [];
                            existing.push(p.id);
                            setConfig((prev) => ({ ...prev, delivery_provinces: existing.join(",") }));
                            setSearchProvince("");
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-2"
                        >
                          <Check size={14} className="text-gray-300" />
                          {p.name}
                        </button>
                      ))}
                    {provinces.filter(
                      (p) =>
                        p.name.toLowerCase().includes(searchProvince.toLowerCase()) &&
                        !config.delivery_provinces.split(",").includes(p.id),
                    ).length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">
                        {searchProvince ? "No provinces found" : "All provinces already selected"}
                      </p>
                    )}
                  </div>
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
                  <p className="text-sm text-muted-foreground">Upload GCash QR code for customer payments</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
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
