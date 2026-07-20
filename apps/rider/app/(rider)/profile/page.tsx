"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getProfileById, updateProfile } from "@repo/data-access/data/profiles";
import {
  Bell,
  Bike,
  Camera,
  ChevronRight,
  DollarSign,
  Edit2,
  HelpCircle,
  Info,
  LogOut,
  MessageSquare,
  Package,
  Save,
  Star,
  User,
  Volume2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";

export default function ProfilePage() {
  const supabase = createBrowserTypedClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [online, setOnline] = useState(false);

  // Notification preferences (stored in localStorage)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Form state
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formVehicle, setFormVehicle] = useState("");
  const [formPlate, setFormPlate] = useState("");
  const [formLicense, setFormLicense] = useState("");

  // Load preferences from localStorage
  useEffect(() => {
    const savedSound = localStorage.getItem("rider_sound_enabled");
    const savedVibration = localStorage.getItem("rider_vibration_enabled");
    const savedDarkMode = localStorage.getItem("rider_dark_mode");
    if (savedSound !== null) setSoundEnabled(savedSound === "true");
    if (savedVibration !== null) setVibrationEnabled(savedVibration === "true");
    if (savedDarkMode !== null) setDarkMode(savedDarkMode === "true");
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const fetchProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const data = await getProfileById(supabase, user.id);
    setOnline(data?.rider_status === "available" || data?.rider_status === "vacant");

    const { count: deliveries } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("rider_id", user.id)
      .eq("status", "delivered");

    const { data: earningsData } = await supabase
      .from("rider_earnings")
      .select("amount, status")
      .eq("rider_id", user.id);

    const totalEarnings = earningsData ? earningsData.reduce((sum, e) => sum + (e.amount || 0), 0) : 0;

    // Fetch rider ratings
    const { data: reviewsData } = await supabase
      .from("rider_reviews")
      .select("rating, comment, created_at")
      .eq("rider_id", user.id)
      .order("created_at", { ascending: false });

    const ratingCount = reviewsData?.length || 0;
    const ratingAvg = ratingCount > 0 ? reviewsData!.reduce((sum, r) => sum + r.rating, 0) / ratingCount : 0;
    const recentReviews = (reviewsData || []).slice(0, 5).map((r) => ({
      rating: r.rating,
      comment: r.comment,
      date: r.created_at,
    }));

    const { data: cashoutData } = await supabase
      .from("rider_cashouts")
      .select("amount, status")
      .eq("rider_id", user.id);

    const cashouted = cashoutData
      ? cashoutData
          .filter((c) => c.status === "paid" || c.status === "approved")
          .reduce((sum, c) => sum + (c.amount || 0), 0)
      : 0;

    setProfile({
      first_name: data?.first_name || "",
      last_name: data?.last_name || "",
      full_name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim() || "Rider",
      email: user.email || "",
      phone: data?.phone || "N/A",
      avatar_url: data?.avatar_url || null,
      vehicle_type: data?.vehicle_type || "",
      plate_number: data?.plate_number || "",
      license_number: data?.license_number || "",
      total_deliveries: deliveries || 0,
      total_earnings: totalEarnings,
      available_balance: Math.max(0, totalEarnings - cashouted),
      member_since: data?.created_at || user.created_at,
      rating_avg: Math.round(ratingAvg * 10) / 10,
      rating_count: ratingCount,
      recent_reviews: recentReviews,
    });

    setFormFirstName(data?.first_name || "");
    setFormLastName(data?.last_name || "");
    setFormPhone(data?.phone || "");
    setFormVehicle(data?.vehicle_type || "motorcycle");
    setFormPlate(data?.plate_number || "");
    setFormLicense(data?.license_number || "");

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleToggleOnline = async () => {
    if (!userId) return;
    const next = !online;
    setOnline(next);
    await updateProfile(supabase, userId, {
      rider_status: (next ? "available" : "offline") as any,
    });
    Swal.fire({
      icon: "success",
      title: next ? "You're Online" : "You're Offline",
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: "top-end",
    });
  };

  const handleUploadPhoto = async () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      setUploadingPhoto(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("prefix", `avatar-${userId}`);

        const res = await fetch("/api/upload-avatar", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to upload");
        }

        // Update profile with avatar URL
        await updateProfile(supabase, userId!, { avatar_url: data.data.url });

        setProfile((p: any) => ({ ...p, avatar_url: data.data.url }));

        Swal.fire({
          icon: "success",
          title: "Photo Updated!",
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        });
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Upload Failed", text: err.message });
      }
      setUploadingPhoto(false);
    };
    fileInput.click();
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSaving(true);

    const fullName = `${formFirstName} ${formLastName}`.trim();
    const { error } = await updateProfile(supabase, userId, {
      first_name: formFirstName,
      last_name: formLastName,
      full_name: fullName,
      phone: formPhone,
      vehicle_type: formVehicle,
      plate_number: formPlate,
      license_number: formLicense,
    });

    if (error) {
      Swal.fire({ icon: "error", title: "Failed", text: error.message });
    } else {
      Swal.fire({
        icon: "success",
        title: "Profile Updated",
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
      setShowEdit(false);
      fetchProfile();
    }
    setSaving(false);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("rider_sound_enabled", String(next));
  };

  const toggleVibration = () => {
    const next = !vibrationEnabled;
    setVibrationEnabled(next);
    localStorage.setItem("rider_vibration_enabled", String(next));
  };

  const _toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("rider_dark_mode", String(next));
  };

  const handleLogout = async () => {
    if (online && userId) {
      await updateProfile(supabase, userId, { rider_status: "offline" as any });
    }
    await supabase.auth.signOut();
    router.refresh();
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
    <div className="p-4 space-y-4 pb-8">
      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center relative">
        <button
          onClick={() => setShowEdit(!showEdit)}
          className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 hover:bg-brand-100 flex items-center justify-center transition"
        >
          {showEdit ? <X size={15} className="text-gray-500" /> : <Edit2 size={15} className="text-gray-500" />}
        </button>

        {/* Avatar with upload */}
        <div className="relative w-20 h-20 mx-auto mb-3 group">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full object-cover shadow-md" />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center shadow-md">
              <User size={36} className="text-white" />
            </div>
          )}
          <button
            onClick={handleUploadPhoto}
            disabled={uploadingPhoto}
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center shadow-md transition disabled:opacity-50"
          >
            <Camera size={14} />
          </button>
        </div>

        <h2 className="text-xl font-bold text-gray-800">{profile.full_name}</h2>
        <p className="text-sm text-gray-500">{profile.email}</p>
        {profile.phone !== "N/A" && <p className="text-sm text-gray-400 mt-1">{profile.phone}</p>}

        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            onClick={handleToggleOnline}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              online ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-gray-400"}`} />
            {online ? "Online" : "Offline"}
          </button>
          <span className="text-[10px] text-gray-400">
            Member since{" "}
            {profile.member_since
              ? new Date(profile.member_since).toLocaleDateString("en-PH", {
                  month: "short",
                  year: "numeric",
                })
              : ""}
          </span>
        </div>
      </div>

      {/* Edit Profile Form */}
      {showEdit && (
        <div className="bg-white rounded-xl shadow-sm border border-brand-200 p-4 space-y-3 animate-fadeIn">
          <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
            <Edit2 size={15} className="text-brand-500" />
            Edit Profile
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">First Name</label>
              <input
                type="text"
                value={formFirstName}
                onChange={(e) => setFormFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-gray-900"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">Last Name</label>
              <input
                type="text"
                value={formLastName}
                onChange={(e) => setFormLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-gray-900"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">Phone</label>
            <input
              type="tel"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-gray-900"
            />
          </div>

          <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mt-2">Vehicle Details</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">Type</label>
              <select
                value={formVehicle}
                onChange={(e) => setFormVehicle(e.target.value)}
                className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-gray-900"
              >
                <option value="motorcycle">Motorcycle</option>
                <option value="bicycle">Bicycle</option>
                <option value="car">Car</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">Plate</label>
              <input
                type="text"
                value={formPlate}
                onChange={(e) => setFormPlate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-gray-900"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">License</label>
              <input
                type="text"
                value={formLicense}
                onChange={(e) => setFormLicense(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-gray-900"
              />
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-brand-100 text-center">
          <Package size={24} className="text-brand-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-800">{profile.total_deliveries}</p>
          <p className="text-xs text-gray-500">Deliveries</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-brand-100 text-center">
          <DollarSign size={24} className="text-brand-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-brand-600">₱{Number(profile.total_earnings).toFixed(2)}</p>
          <p className="text-xs text-gray-500">Earnings</p>
        </div>
      </div>

      {/* Rider Ratings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5 mb-3">
          <Star size={16} className="text-yellow-500 fill-yellow-500" />
          Rider Ratings
        </h3>

        {profile.rating_count === 0 ? (
          <div className="text-center py-4">
            <MessageSquare size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No ratings yet</p>
            <p className="text-xs text-gray-300 mt-1">Ratings appear after deliveries</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-800">{profile.rating_avg}</p>
                <div className="flex gap-0.5 mt-0.5 justify-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      className={`${
                        s <= Math.round(profile.rating_avg) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <p className="font-semibold text-gray-700">
                  {profile.rating_count} review{profile.rating_count !== 1 ? "s" : ""}
                </p>
                <p className="mt-0.5">Based on completed deliveries</p>
              </div>
            </div>

            {profile.recent_reviews.length > 0 && (
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Feedback</p>
                {profile.recent_reviews.map((r: any, i: number) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={11}
                          className={`${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                        />
                      ))}
                      <span className="text-[10px] text-gray-400 ml-auto">
                        {new Date(r.date).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    {r.comment && <p className="text-xs text-gray-600 italic">&ldquo;{r.comment}&rdquo;</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Vehicle Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-2">
        <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
          <Bike size={16} className="text-brand-500" />
          Vehicle Information
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-[10px] text-gray-500">Type</p>
            <p className="text-sm font-semibold text-gray-700 capitalize">{profile.vehicle_type || "—"}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-[10px] text-gray-500">Plate</p>
            <p className="text-sm font-semibold text-gray-700">{profile.plate_number || "—"}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-[10px] text-gray-500">License</p>
            <p className="text-sm font-semibold text-gray-700">{profile.license_number || "—"}</p>
          </div>
        </div>
      </div>

      {/* Settings Menu */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
        {/* Sound Notification Toggle */}
        <button
          onClick={toggleSound}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <Volume2 size={20} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Notification Sound</span>
          </div>
          <div
            className={`w-11 h-6 rounded-full transition-colors relative ${
              soundEnabled ? "bg-brand-600" : "bg-gray-200"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 absolute top-0.5 ${
                soundEnabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </div>
        </button>

        {/* Vibration Toggle */}
        <button
          onClick={toggleVibration}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Vibration</span>
          </div>
          <div
            className={`w-11 h-6 rounded-full transition-colors relative ${
              vibrationEnabled ? "bg-brand-600" : "bg-gray-200"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 absolute top-0.5 ${
                vibrationEnabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </div>
        </button>

        {/* Help & Support */}
        <button
          onClick={() => {
            Swal.fire({
              title: "Help & Support",
              html: `
                <div style="text-align: left; color: #64748b; font-size: 14px;">
                  <p style="margin-bottom: 12px;">Need help with your deliveries?</p>
                  <div style="background: #f8fafc; border-radius: 12px; padding: 12px;">
                    <p style="margin-bottom: 6px;"><strong>📞 Contact Support</strong></p>
                    <p style="color: #3b82f6;">support@suarezfoodhub.com</p>
                  </div>
                  <div style="background: #f8fafc; border-radius: 12px; padding: 12px; margin-top: 8px;">
                    <p style="margin-bottom: 6px;"><strong>📖 Quick Guide</strong></p>
                    <p style="color: #64748b; font-size: 13px;">Accept orders → Pick up → Deliver → Earn</p>
                  </div>
                  <hr style="border: none; border-top: 1px dashed #e2e8f0; margin: 16px 0;" />
                  <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                    <a href="/terms" style="color: #3b82f6;">Terms of Service</a> &bull;
                    <a href="/privacy" style="color: #3b82f6;"> Privacy Policy</a>
                  </p>
                </div>
              `,
              confirmButtonText: "Close",
              confirmButtonColor: "#F08013",
            });
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <HelpCircle size={20} className="text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Help & Support</span>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>

        {/* About */}
        <button
          onClick={() => {
            Swal.fire({
              title: "About",
              html: `
                <div style="text-align: center; color: #64748b; font-size: 14px;">
                  <p style="font-weight: bold; margin-bottom: 4px;">Suarez Food Hub Rider</p>
                  <p style="margin-bottom: 8px;">Version 2.0.0 — 2026 Edition</p>
                  <p style="color: #94a3b8; font-size: 12px;">Built with Next.js, Supabase & Tailwind</p>
                </div>
              `,
              confirmButtonText: "Close",
              confirmButtonColor: "#F08013",
            });
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <Info size={20} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">About</span>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition"
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
