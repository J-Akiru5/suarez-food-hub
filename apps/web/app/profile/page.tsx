"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { ArrowLeft, CheckCircle, Eye, EyeOff, Loader2, Lock, MapPin, Phone, Save, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import AuthNavbar from "../../components/AuthNavbar";
import { useAuth } from "../../components/auth-provider";

interface Location {
  id: string;
  name: string;
  type: string;
}

// The business only operates in Iloilo (Western Visayas), so region and
// province are always fixed — no dropdowns needed.
const WESTERN_VISAYAS_ID = "060000000";
const ILOILO_ID = "063000000";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [townId, setTownId] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [zipCode, setZipCode] = useState("");

  const [towns, setTowns] = useState<Location[]>([]);
  const [barangays, setBarangays] = useState<Location[]>([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const supabase = createBrowserTypedClient();

  // Basic fields pre-fill as soon as the profile arrives.
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setPhone(profile.phone || "");
      setZipCode((profile as any).zip_code || "");
      setStreetAddress((profile as any).street_address || profile.address || "");
    }
  }, [profile]);

  useEffect(() => {
    fetch(`/api/locations?type=city&parent=${ILOILO_ID}`)
      .then((r) => r.json())
      .then((response) => {
        const data = response.data || response;
        if (Array.isArray(data)) setTowns(data);
      })
      .catch(() => {});
  }, []);

  // Town/barangay pre-fill only once the option list for that level has loaded.
  // Setting the Select's controlled value before its items exist leaves Radix
  // showing the placeholder (it has no matching item to render), so gate on the
  // list being present to make the saved location actually visible.
  useEffect(() => {
    if (profile && towns.length > 0) {
      setTownId((profile as any).town_id || "");
    }
  }, [profile, towns]);

  useEffect(() => {
    if (!townId) {
      setBarangays([]);
      return;
    }
    fetch(`/api/locations?type=barangay&parent=${townId}`)
      .then((r) => r.json())
      .then((response) => {
        const data = response.data || response;
        if (Array.isArray(data)) setBarangays(data);
      })
      .catch(() => {});
  }, [townId]);

  useEffect(() => {
    // Pre-fill only while the selected town still matches the saved one — once
    // the user changes town, don't clobber their barangay pick with the saved
    // barangay (which belongs to the old town).
    if (profile && barangays.length > 0 && townId === (profile as any).town_id) {
      setBarangayId((profile as any).barangay_id || "");
    }
  }, [profile, barangays, townId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!firstName.trim()) {
      setError("First name is required");
      return;
    }
    if (!lastName.trim()) {
      setError("Last name is required");
      return;
    }

    setSaving(true);
    try {
      const regionName = "Western Visayas";
      const provinceName = "Iloilo";
      const townName = towns.find((t) => t.id === townId)?.name || "";
      const barangayName = barangays.find((b) => b.id === barangayId)?.name || "";

      const fullAddressParts = [streetAddress.trim(), barangayName, townName, provinceName, regionName].filter(Boolean);
      const fullAddress = fullAddressParts.join(", ");

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          phone: phone.trim(),
          street_address: streetAddress.trim(),
          region_id: WESTERN_VISAYAS_ID,
          province_id: ILOILO_ID,
          town_id: townId || null,
          barangay_id: barangayId || null,
          zip_code: zipCode.trim() || null,
          address: fullAddress,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const result = await Swal.fire({
      title: "Delete your account?",
      text: "Your account will be deactivated and your personal information removed. This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, continue",
    });
    if (!result.isConfirmed) return;

    const typingResult = await Swal.fire({
      title: "Type DELETE to confirm",
      input: "text",
      inputPlaceholder: "Type DELETE",
      inputValidator: (value) => (value !== "DELETE" ? "Please type DELETE to confirm" : undefined),
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete permanently",
    });
    if (!typingResult.isConfirmed) return;

    setSaving(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete account");
      }
      await signOut();
      Swal.fire({
        icon: "success",
        title: "Account deleted",
        text: "Your account has been deleted. Thank you for using Suarez Food Hub.",
        timer: 2000,
        showConfirmButton: false,
      }).then(() => router.push("/"));
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      if (!user?.email) {
        setPasswordError("Email not found. Please reload the page.");
        setSavingPassword(false);
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        setPasswordError("Current password is incorrect");
        setSavingPassword(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setPasswordError(updateError.message);
      } else {
        setPasswordSaved(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSaved(false), 3000);
      }
    } catch {
      setPasswordError("Failed to change password. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-cream)] font-sans">
        <AuthNavbar />
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "120px 24px 60px" }}>
          <div style={{ background: "#fff", borderRadius: 28, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}>
            <div style={{ width: "50%", height: 24, background: "#f1f5f9", borderRadius: 8, marginBottom: 16 }} />
            <div style={{ width: "80%", height: 14, background: "#f1f5f9", borderRadius: 6, marginBottom: 8 }} />
            <div style={{ width: "60%", height: 14, background: "#f1f5f9", borderRadius: 6 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)] font-sans">
      <AuthNavbar />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "120px 24px 60px" }}>
        <button
          onClick={() => router.back()}
          className="group flex items-center gap-2 text-slate-500 hover:text-[var(--primary-color)] transition-colors text-sm mb-6"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back
        </button>

        <h1 className="font-serif text-4xl text-[var(--secondary-color)] mb-2">My Profile</h1>
        <p className="text-slate-500 mb-8 text-[15px]">Manage your personal information</p>

        {error && (
          <div
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              fontSize: 14,
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}
        {saved && (
          <div
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#16a34a",
              fontSize: 14,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle size={18} /> Profile updated successfully
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Card 1: Personal Info */}
            <div className="bg-white/90 backdrop-blur-xl rounded-[28px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col gap-5">
              <h2 className="text-xl font-bold text-[var(--secondary-color)] mb-2">Personal Information</h2>
              <div>
                <label className={labelClass}>Email</label>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-400 text-sm shadow-sm">
                  <User size={18} color="#94a3b8" />
                  {user?.email}
                </div>
                <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className={labelClass}>First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Phone Number</label>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus-within:ring-2 focus-within:ring-[#d85c27] focus-within:border-transparent transition-all shadow-sm">
                  <Phone size={18} color="#94a3b8" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09123456789"
                    className="w-full bg-transparent outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Delivery Address */}
            <div className="bg-white/90 backdrop-blur-xl rounded-[28px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col gap-5">
              <h2 className="text-xl font-bold text-[var(--secondary-color)] mb-2">Delivery Address</h2>

              <div>
                <label className={labelClass}>Street Address (House #, Street)</label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="123 Rizal Street"
                  className={inputClass}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className={labelClass}>Region</label>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-500 text-sm shadow-sm">
                    <MapPin size={18} color="#94a3b8" />
                    Western Visayas
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Province</label>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-500 text-sm shadow-sm">
                    <MapPin size={18} color="#94a3b8" />
                    Iloilo
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 -mt-3">Fixed — the business only delivers within Iloilo</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className={labelClass}>Town / City</label>
                  <Select value={townId} onValueChange={setTownId}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select Town / City" />
                    </SelectTrigger>
                    <SelectContent>
                      {towns.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={labelClass}>Barangay</label>
                  <Select value={barangayId} onValueChange={setBarangayId} disabled={!townId}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select Barangay" />
                    </SelectTrigger>
                    <SelectContent>
                      {barangays.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Zip Code</label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="5000"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`mt-6 w-full max-w-[320px] mx-auto py-4 px-8 rounded-full font-bold text-white transition-all flex items-center justify-center gap-2 ${
              saving
                ? "opacity-60 cursor-not-allowed bg-slate-400"
                : "bg-gradient-to-r from-[var(--primary-color)] to-[#ff7a3d] hover:shadow-xl hover:-translate-y-1"
            }`}
          >
            {saving && <Loader2 size={20} />}
            <Save size={18} />
            Save Changes
          </button>
        </form>

        {/* Password Change Section */}
        <div className="mt-10 bg-white/90 backdrop-blur-xl rounded-[28px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--secondary-color)]">Password</h2>
              <p className="text-sm text-slate-500 mt-1">Change your account password</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
              style={{
                background: showPasswordForm ? "#f1f5f9" : "var(--primary-color)",
                color: showPasswordForm ? "#64748b" : "#fff",
              }}
            >
              <Lock size={16} />
              {showPasswordForm ? "Cancel" : "Change Password"}
            </button>
          </div>

          {showPasswordForm && (
            <form onSubmit={handlePasswordChange} className="mt-6 space-y-4 max-w-md">
              {passwordError && (
                <div
                  style={{
                    padding: "12px 20px",
                    borderRadius: 12,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    fontSize: 14,
                  }}
                >
                  {passwordError}
                </div>
              )}
              {passwordSaved && (
                <div
                  style={{
                    padding: "12px 20px",
                    borderRadius: 12,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    color: "#16a34a",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <CheckCircle size={18} /> Password changed successfully
                </div>
              )}

              <div>
                <label className={labelClass}>Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer"
                  >
                    {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer"
                  >
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  savingPassword
                    ? "opacity-60 cursor-not-allowed bg-slate-400 text-white"
                    : "bg-[var(--primary-color)] text-white hover:shadow-lg"
                }`}
              >
                {savingPassword && <Loader2 size={16} className="animate-spin" />}
                <Lock size={16} />
                Update Password
              </button>
            </form>
          )}
        </div>

        {/* Delete Account Section */}
        <div className="mt-10 bg-white/90 backdrop-blur-xl rounded-[28px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-red-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-red-600">Delete Account</h2>
              <p className="text-sm text-slate-500 mt-1">
                Permanently deactivate your account and remove your personal information. This cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block";
const inputClass =
  "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#d85c27] focus:border-transparent transition-all shadow-sm";
