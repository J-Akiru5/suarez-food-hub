"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getBusinessConfig, updateBusinessConfig } from "@repo/data-access/data/business";
import { Button, Card, CardContent, Input } from "@repo/ui";
import { Check, Clock, Loader2, MapPin, Plus, QrCode, Save, Store, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";

// Fetch all cities/municipalities (towns) of Iloilo province from the public PSGC API
// (no key needed). Delivery is restricted to Iloilo City + selected towns.
async function fetchIloiloTowns(): Promise<{ id: string; name: string }[]> {
  try {
    const regionsRes = await fetch("https://psgc.gitlab.io/api/regions");
    const regions: { code: string; name: string }[] = await regionsRes.json();
    const region =
      regions.find((r) => r.name.toUpperCase().includes("WESTERN VISAYAS")) || regions.find((r) => r.code === "06");
    if (!region) return [];

    const provincesRes = await fetch(`https://psgc.gitlab.io/api/regions/${region.code}/provinces`);
    const provinces: { code: string; name: string }[] = await provincesRes.json();
    const iloilo = provinces.find((p) => p.name.toUpperCase() === "ILOILO");
    if (!iloilo) return [];

    const townsRes = await fetch(`https://psgc.gitlab.io/api/provinces/${iloilo.code}/cities-municipalities`);
    const towns: { code: string; name: string }[] = await townsRes.json();
    return (towns || [])
      .filter((t) => t.code && t.name)
      .map((t) => ({ id: t.code, name: t.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("Failed to fetch Iloilo towns from PSGC API:", err);
    return [];
  }
}

interface DaySchedule {
  open: boolean;
  open_time: string;
  close_time: string;
}

interface OperatingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface AboutValue {
  title: string;
  description: string;
}

interface AboutTimeline {
  year: string;
  title: string;
  description: string;
}

interface AboutContent {
  hero: { title: string; description: string };
  mission: { title: string; description: string };
  vision: { title: string; description: string };
  values: AboutValue[];
  timeline: AboutTimeline[];
}

interface BusinessConfig {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  gcash_qr_url: string;
  delivery_fee: number;
  delivery_areas: string;
  operating_hours: OperatingHours | null;
  about_content: AboutContent | null;
}

const DAYS: (keyof OperatingHours)[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DEFAULT_HOURS: OperatingHours = {
  monday: { open: true, open_time: "10:00", close_time: "21:00" },
  tuesday: { open: true, open_time: "10:00", close_time: "21:00" },
  wednesday: { open: true, open_time: "10:00", close_time: "21:00" },
  thursday: { open: true, open_time: "10:00", close_time: "21:00" },
  friday: { open: true, open_time: "10:00", close_time: "21:00" },
  saturday: { open: true, open_time: "10:00", close_time: "21:00" },
  sunday: { open: false, open_time: "10:00", close_time: "21:00" },
};

const DEFAULT_ABOUT: AboutContent = {
  hero: {
    title: "About Suarez Food Hub",
    description:
      "We are a family-owned Filipino food business based in Janiuay, Iloilo, dedicated to bringing authentic home-cooked meals to your doorstep.",
  },
  mission: {
    title: "Our Mission",
    description:
      "To provide delicious, home-cooked Filipino meals at affordable prices while supporting local suppliers and creating meaningful employment in our community.",
  },
  vision: {
    title: "Our Vision",
    description:
      "To be the most trusted food delivery service in Iloilo, known for our commitment to quality, freshness, and genuine care for every customer we serve.",
  },
  values: [
    {
      title: "Home-Style Cooking",
      description: "We cook exactly how we cook for our own family—no shortcuts, just honest, traditional methods.",
    },
    {
      title: "Rooted in Janiuay",
      description:
        "Operating from our hometown in Iloilo, we rely on local suppliers and serve our immediate neighbors.",
    },
    {
      title: "Market Fresh",
      description:
        "Our ingredients come straight from the local market each morning to ensure our food is always fresh.",
    },
    {
      title: "Family Recipes",
      description: "Our menu is built on generations of Suarez family recipes that have stood the test of time.",
    },
  ],
  timeline: [
    {
      year: "2019",
      title: "Starting Out",
      description:
        "We began as a small neighborhood kitchen, cooking our signature meals for friends and nearby families in Janiuay.",
    },
    {
      year: "2020",
      title: "Expanding Reach",
      description:
        "As demand grew through word of mouth, we expanded our daily menu and introduced a dedicated delivery service.",
    },
    {
      year: "2022",
      title: "Full Operations",
      description:
        "We officially structured our kitchen and logistics, allowing us to handle larger volumes and catering orders.",
    },
    {
      year: "2024",
      title: "Going Digital",
      description:
        "To streamline ordering, we launched our online food hub, giving our customers an easier way to browse and order.",
    },
  ],
};

export default function SettingsPage() {
  const supabase = createBrowserTypedClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingGcash, setUploadingGcash] = useState(false);
  const [towns, setTowns] = useState<{ id: string; name: string }[]>([]);
  const gcashRef = useRef<HTMLInputElement>(null);
  const [searchTown, setSearchTown] = useState("");

  const [config, setConfig] = useState<BusinessConfig>({
    name: "Suarez Food Hub",
    address: "",
    phone: "",
    email: "",
    gcash_qr_url: "",
    delivery_fee: 40,
    delivery_areas: "",
    operating_hours: null,
    about_content: null,
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
        delivery_areas: data.delivery_areas || "",
        operating_hours: data.operating_hours || null,
        about_content: data.about_content || null,
      });
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Fetch Iloilo cities/municipalities from the PSGC API
  useEffect(() => {
    fetchIloiloTowns().then((list) => {
      setTowns(list);
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
      ...(config.id ? { id: config.id } : {}),
      name: config.name,
      address: config.address,
      phone: config.phone,
      email: config.email,
      gcash_qr_url: config.gcash_qr_url,
      delivery_fee: config.delivery_fee,
      delivery_areas: config.delivery_areas || "063022000",
      operating_hours: config.operating_hours,
      about_content: config.about_content,
    };

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const response = await res.json();

      if (!response.success) {
        Swal.fire({ icon: "error", title: "Save failed", text: response.error || "Unknown error" });
        setSaving(false);
        return;
      }

      if (response.data) {
        setConfig((prev) => ({ ...prev, id: response.data.id }));
      }

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Settings saved successfully!",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Network error" });
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
                  <p className="text-sm text-muted-foreground">Delivery fees and store coordinates</p>
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
              </div>

              {/* Delivery Area Restriction */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="text-sm font-medium text-gray-700 block mb-2">Allowed Delivery Towns (Iloilo)</label>
                <p className="text-xs text-muted-foreground mb-3">
                  Delivery is limited to <strong>Iloilo City</strong> and the towns you select below. Customers outside
                  these towns cannot place an order. If no towns are selected, delivery defaults to{" "}
                  <strong>Iloilo City only</strong>.
                </p>

                {/* Selected towns as chips */}
                <div className="flex flex-wrap gap-1.5 mb-3 min-h-[28px]">
                  {config.delivery_areas
                    ? config.delivery_areas
                        .split(",")
                        .filter(Boolean)
                        .map((tid) => {
                          const t = towns.find((x) => x.id === tid);
                          return (
                            <span
                              key={tid}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-medium"
                            >
                              {t?.name || tid}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = config.delivery_areas
                                    .split(",")
                                    .filter((x) => x !== tid)
                                    .join(",");
                                  setConfig((prev) => ({ ...prev, delivery_areas: updated }));
                                }}
                                className="hover:text-red-600 focus:outline-none"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          );
                        })
                    : null}
                  {!config.delivery_areas && (
                    <span className="text-xs text-gray-400 italic">Iloilo City only (default)</span>
                  )}
                </div>

                {/* Search & add towns */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search towns (e.g. Iloilo City, Passi, Janiuay)..."
                    value={searchTown}
                    onChange={(e) => setSearchTown(e.target.value)}
                    className="w-full h-9 pl-3 pr-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 mb-2"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-0.5 border border-gray-100 rounded-md p-1 bg-white">
                    {towns
                      .filter(
                        (t) =>
                          t.name.toLowerCase().includes(searchTown.toLowerCase()) &&
                          !config.delivery_areas.split(",").includes(t.id),
                      )
                      .slice(0, 20)
                      .map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            const existing = config.delivery_areas
                              ? config.delivery_areas.split(",").filter(Boolean)
                              : [];
                            existing.push(t.id);
                            setConfig((prev) => ({ ...prev, delivery_areas: existing.join(",") }));
                            setSearchTown("");
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-2"
                        >
                          <Check size={14} className="text-gray-300" />
                          {t.name}
                        </button>
                      ))}
                    {towns.filter(
                      (t) =>
                        t.name.toLowerCase().includes(searchTown.toLowerCase()) &&
                        !config.delivery_areas.split(",").includes(t.id),
                    ).length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">
                        {searchTown ? "No towns found" : "All towns already selected"}
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

      {/* Operating Hours */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg font-display">Operating Hours</h2>
              <p className="text-sm text-muted-foreground">Set your shop's opening days and times</p>
            </div>
          </div>
          <div className="space-y-3">
            {DAYS.map((day) => {
              const schedule = config.operating_hours?.[day] || DEFAULT_HOURS[day];
              return (
                <div key={day} className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0">
                  <div className="w-28">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={schedule.open}
                        onChange={(e) => {
                          const newHours = { ...(config.operating_hours || DEFAULT_HOURS) };
                          newHours[day] = { ...schedule, open: e.target.checked };
                          setConfig((p) => ({ ...p, operating_hours: newHours }));
                        }}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                    </label>
                  </div>
                  {schedule.open ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={schedule.open_time}
                        onChange={(e) => {
                          const newHours = { ...(config.operating_hours || DEFAULT_HOURS) };
                          newHours[day] = { ...schedule, open_time: e.target.value };
                          setConfig((p) => ({ ...p, operating_hours: newHours }));
                        }}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-500">to</span>
                      <input
                        type="time"
                        value={schedule.close_time}
                        onChange={(e) => {
                          const newHours = { ...(config.operating_hours || DEFAULT_HOURS) };
                          newHours[day] = { ...schedule, close_time: e.target.value };
                          setConfig((p) => ({ ...p, operating_hours: newHours }));
                        }}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* About Us Content */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Store className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg font-display">About Us Content</h2>
              <p className="text-sm text-muted-foreground">Customize the About Us page content</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Hero Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700">Hero Section</h3>
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-1">Title</label>
                <Input
                  value={config.about_content?.hero?.title || DEFAULT_ABOUT.hero.title}
                  onChange={(e) => {
                    const about = config.about_content || DEFAULT_ABOUT;
                    setConfig((p) => ({
                      ...p,
                      about_content: { ...about, hero: { ...about.hero, title: e.target.value } },
                    }));
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-1">Description</label>
                <textarea
                  value={config.about_content?.hero?.description || DEFAULT_ABOUT.hero.description}
                  onChange={(e) => {
                    const about = config.about_content || DEFAULT_ABOUT;
                    setConfig((p) => ({
                      ...p,
                      about_content: { ...about, hero: { ...about.hero, description: e.target.value } },
                    }));
                  }}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Mission & Vision */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-gray-700">Mission</h3>
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Title</label>
                  <Input
                    value={config.about_content?.mission?.title || DEFAULT_ABOUT.mission.title}
                    onChange={(e) => {
                      const about = config.about_content || DEFAULT_ABOUT;
                      setConfig((p) => ({
                        ...p,
                        about_content: { ...about, mission: { ...about.mission, title: e.target.value } },
                      }));
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Description</label>
                  <textarea
                    value={config.about_content?.mission?.description || DEFAULT_ABOUT.mission.description}
                    onChange={(e) => {
                      const about = config.about_content || DEFAULT_ABOUT;
                      setConfig((p) => ({
                        ...p,
                        about_content: { ...about, mission: { ...about.mission, description: e.target.value } },
                      }));
                    }}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-gray-700">Vision</h3>
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Title</label>
                  <Input
                    value={config.about_content?.vision?.title || DEFAULT_ABOUT.vision.title}
                    onChange={(e) => {
                      const about = config.about_content || DEFAULT_ABOUT;
                      setConfig((p) => ({
                        ...p,
                        about_content: { ...about, vision: { ...about.vision, title: e.target.value } },
                      }));
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Description</label>
                  <textarea
                    value={config.about_content?.vision?.description || DEFAULT_ABOUT.vision.description}
                    onChange={(e) => {
                      const about = config.about_content || DEFAULT_ABOUT;
                      setConfig((p) => ({
                        ...p,
                        about_content: { ...about, vision: { ...about.vision, description: e.target.value } },
                      }));
                    }}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Values */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-700">Core Values</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const about = config.about_content || DEFAULT_ABOUT;
                    setConfig((p) => ({
                      ...p,
                      about_content: { ...about, values: [...about.values, { title: "", description: "" }] },
                    }));
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Value
                </Button>
              </div>
              {(config.about_content?.values || DEFAULT_ABOUT.values).map((val, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 p-3 bg-gray-50 rounded-lg">
                  <Input
                    placeholder="Value title"
                    value={val.title}
                    onChange={(e) => {
                      const about = config.about_content || DEFAULT_ABOUT;
                      const newValues = [...about.values];
                      newValues[idx] = { ...newValues[idx], title: e.target.value };
                      setConfig((p) => ({ ...p, about_content: { ...about, values: newValues } }));
                    }}
                  />
                  <Input
                    placeholder="Value description"
                    value={val.description}
                    onChange={(e) => {
                      const about = config.about_content || DEFAULT_ABOUT;
                      const newValues = [...about.values];
                      newValues[idx] = { ...newValues[idx], description: e.target.value };
                      setConfig((p) => ({ ...p, about_content: { ...about, values: newValues } }));
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => {
                      const about = config.about_content || DEFAULT_ABOUT;
                      setConfig((p) => ({
                        ...p,
                        about_content: { ...about, values: about.values.filter((_, i) => i !== idx) },
                      }));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-700">Story Timeline</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const about = config.about_content || DEFAULT_ABOUT;
                    setConfig((p) => ({
                      ...p,
                      about_content: {
                        ...about,
                        timeline: [...about.timeline, { year: "", title: "", description: "" }],
                      },
                    }));
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Entry
                </Button>
              </div>
              {(config.about_content?.timeline || DEFAULT_ABOUT.timeline).map((entry, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-[80px_1fr_2fr_auto] gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <Input
                    placeholder="Year"
                    value={entry.year}
                    onChange={(e) => {
                      const about = config.about_content || DEFAULT_ABOUT;
                      const newTimeline = [...about.timeline];
                      newTimeline[idx] = { ...newTimeline[idx], year: e.target.value };
                      setConfig((p) => ({ ...p, about_content: { ...about, timeline: newTimeline } }));
                    }}
                  />
                  <Input
                    placeholder="Title"
                    value={entry.title}
                    onChange={(e) => {
                      const about = config.about_content || DEFAULT_ABOUT;
                      const newTimeline = [...about.timeline];
                      newTimeline[idx] = { ...newTimeline[idx], title: e.target.value };
                      setConfig((p) => ({ ...p, about_content: { ...about, timeline: newTimeline } }));
                    }}
                  />
                  <Input
                    placeholder="Description"
                    value={entry.description}
                    onChange={(e) => {
                      const about = config.about_content || DEFAULT_ABOUT;
                      const newTimeline = [...about.timeline];
                      newTimeline[idx] = { ...newTimeline[idx], description: e.target.value };
                      setConfig((p) => ({ ...p, about_content: { ...about, timeline: newTimeline } }));
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => {
                      const about = config.about_content || DEFAULT_ABOUT;
                      setConfig((p) => ({
                        ...p,
                        about_content: { ...about, timeline: about.timeline.filter((_, i) => i !== idx) },
                      }));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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
