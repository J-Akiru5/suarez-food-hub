"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@repo/types";
import { Button } from "@repo/ui";
import { Input } from "@repo/ui";
import { Skeleton } from "@repo/ui";
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
    firstName: "",
    lastName: "",
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
        .eq("user_id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setForm({
          firstName: data.first_name,
          lastName: data.last_name,
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
        first_name: form.firstName,
        last_name: form.lastName,
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
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">
      <h1 className="text-xl font-bold">My Profile</h1>

      {/* Avatar */}
      <div className="bg-white rounded-xl p-6 shadow-sm flex flex-col items-center">
        <div className="h-20 w-20 rounded-full bg-brand-100 flex items-center justify-center mb-3">
          <User className="h-10 w-10 text-brand-600" />
        </div>
        <p className="font-bold text-lg">
          {form.firstName} {form.lastName}
        </p>
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>

      {/* Edit Profile */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold text-sm mb-4">Personal Information</h2>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={form.firstName}
              onChange={(e) => updateForm("firstName", e.target.value)}
            />
            <Input
              label="Last Name"
              value={form.lastName}
              onChange={(e) => updateForm("lastName", e.target.value)}
            />
          </div>
          <div className="relative">
            <Input
              label="Email"
              value={email}
              disabled
              className="bg-gray-50"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-8 h-4 w-4 text-muted-foreground" />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => updateForm("phone", e.target.value)}
              placeholder="09XX XXX XXXX"
              className="pl-9"
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-8 h-4 w-4 text-muted-foreground" />
            <Input
              label="Address"
              value={form.address}
              onChange={(e) => updateForm("address", e.target.value)}
              placeholder="Your delivery address"
              className="pl-9"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-4 bg-brand-500 hover:bg-brand-600 text-white"
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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => router.push("/orders")}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
        >
          <Package className="h-5 w-5 text-brand-500" />
          <span className="flex-1 font-medium text-sm">My Orders</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Logout */}
      <Button
        onClick={handleLogout}
        variant="outline"
        className="w-full border-red-200 text-red-600 hover:bg-red-50"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
