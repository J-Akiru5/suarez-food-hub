"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@repo/types";
import { Button, Input, Skeleton } from "@repo/ui";
import {
  User,
  Phone,
  MapPin,
  Mail,
  LogOut,
  Loader2,
  Save,
  Package,
  ChevronRight,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
  });

  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || "");

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setForm({
          fullName: data.full_name || "",
          phone: data.phone || "",
          address: data.address || "",
        });
      }
      setLoading(false);
    }
    loadProfile();
  }, [supabase]);

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);

    await supabase
      .from("profiles")
      .update({
        full_name: form.fullName,
        phone: form.phone || null,
        address: form.address || null,
      })
      .eq("id", profile.id);

    setSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full rounded-32" />
        <Skeleton className="h-48 w-full rounded-32" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">
      <h1
        className="text-2xl font-bold text-gray-900"
        style={{ fontFamily: "var(--playfair-display)" }}
      >
        My Profile
      </h1>

      {/* Avatar */}
      <div className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-8 flex flex-col items-center">
        <div className="h-24 w-24 rounded-full bg-[#b1454a]/10 flex items-center justify-center mb-4">
          <User className="h-12 w-12 text-[#b1454a]" />
        </div>
        <p
          className="font-bold text-xl text-gray-900"
          style={{ fontFamily: "var(--playfair-display)" }}
        >
          {form.fullName || "Your Name"}
        </p>
        <p className="text-sm text-gray-500 mt-1">{email}</p>
      </div>

      {/* Edit Profile */}
      <div className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-5">
        <h2
          className="font-bold text-base mb-4 text-gray-900"
          style={{ fontFamily: "var(--playfair-display)" }}
        >
          Personal Information
        </h2>

        <div className="space-y-3">
          <div className="relative">
            <User className="absolute left-3 top-8 h-4 w-4 text-gray-400" />
            <Input
              label="Full Name"
              value={form.fullName}
              onChange={(e) => updateForm("fullName", e.target.value)}
              placeholder="Your full name"
              className="pl-9 rounded-2xl"
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-8 h-4 w-4 text-gray-400" />
            <Input
              label="Email"
              value={email}
              disabled
              className="pl-9 bg-gray-50 rounded-2xl"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-8 h-4 w-4 text-gray-400" />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => updateForm("phone", e.target.value)}
              placeholder="09XX XXX XXXX"
              className="pl-9 rounded-2xl"
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-8 h-4 w-4 text-gray-400" />
            <Input
              label="Address"
              value={form.address}
              onChange={(e) => updateForm("address", e.target.value)}
              placeholder="Your delivery address"
              className="pl-9 rounded-2xl"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-4 bg-[#b1454a] hover:bg-[#9a3a3f] text-white rounded-full"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Quick Links */}
      <div className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 overflow-hidden">
        <button
          onClick={() => router.push("/orders")}
          className="w-full flex items-center gap-3 p-5 hover:bg-white/50 transition-colors text-left"
        >
          <Package className="h-5 w-5 text-[#b1454a]" />
          <span className="flex-1 font-medium text-sm text-gray-900">My Orders</span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Logout */}
      <Button
        onClick={handleLogout}
        variant="outline"
        className="w-full border-red-200 text-red-600 hover:bg-red-50 rounded-full"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
