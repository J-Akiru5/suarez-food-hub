"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, Package, DollarSign, Settings, LogOut, ChevronRight } from "lucide-react";

interface Profile {
  full_name: string;
  email: string;
  phone: string;
  total_deliveries: number;
  total_earnings: number;
}

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", user.id)
        .single();

      const { count: deliveries } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("rider_id", user.id)
        .eq("status", "delivered");

      const { data: earningsData } = await supabase
        .from("orders")
        .select("delivery_fee")
        .eq("rider_id", user.id)
        .eq("status", "delivered");

      const totalEarnings = earningsData
        ? earningsData.reduce((sum, o) => sum + (o.delivery_fee || 0), 0)
        : 0;

      setProfile({
        full_name: data?.full_name || "Rider",
        email: data?.email || user.email || "",
        phone: data?.phone || "",
        total_deliveries: deliveries || 0,
        total_earnings: totalEarnings,
      });
      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
        <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <User size={36} className="text-brand-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">{profile?.full_name}</h2>
        <p className="text-sm text-gray-500">{profile?.email}</p>
        {profile?.phone && (
          <p className="text-sm text-gray-400 mt-1">{profile.phone}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <Package size={24} className="text-brand-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-800">
            {profile?.total_deliveries}
          </p>
          <p className="text-xs text-gray-500">Deliveries</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <DollarSign size={24} className="text-brand-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-brand-600">
            ₱{profile?.total_earnings.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">Earnings</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition">
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Account Settings</span>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition text-left"
        >
          <div className="flex items-center gap-3">
            <LogOut size={20} className="text-red-500" />
            <span className="text-sm font-medium text-red-600">Logout</span>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
}
