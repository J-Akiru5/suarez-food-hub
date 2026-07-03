"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { ArrowLeft, CheckCircle, Loader2, Phone, Save, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthNavbar from "../../components/AuthNavbar";
import { useAuth } from "../../components/auth-provider";

interface Location {
  id: string;
  name: string;
  type: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [regionId, setRegionId] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [townId, setTownId] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [zipCode, setZipCode] = useState("");

  const [regions, setRegions] = useState<Location[]>([]);
  const [provinces, setProvinces] = useState<Location[]>([]);
  const [towns, setTowns] = useState<Location[]>([]);
  const [barangays, setBarangays] = useState<Location[]>([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setPhone(profile.phone || "");
      setRegionId((profile as any).region_id || "");
      setProvinceId((profile as any).province_id || "");
      setTownId((profile as any).town_id || "");
      setBarangayId((profile as any).barangay_id || "");
      setZipCode((profile as any).zip_code || "");
      setStreetAddress((profile as any).street_address || profile.address || "");
    }
  }, [profile]);

  useEffect(() => {
    fetch("/api/locations?type=region")
      .then((r) => r.json())
      .then(setRegions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!regionId) {
      setProvinces([]);
      return;
    }
    fetch(`/api/locations?type=province&parent=${regionId}`)
      .then((r) => r.json())
      .then(setProvinces)
      .catch(() => {});
  }, [regionId]);

  useEffect(() => {
    if (!provinceId) {
      setTowns([]);
      return;
    }
    fetch(`/api/locations?type=city&parent=${provinceId}`)
      .then((r) => r.json())
      .then(setTowns)
      .catch(() => {});
  }, [provinceId]);

  useEffect(() => {
    if (!townId) {
      setBarangays([]);
      return;
    }
    fetch(`/api/locations?type=barangay&parent=${townId}`)
      .then((r) => r.json())
      .then(setBarangays)
      .catch(() => {});
  }, [townId]);

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
      const regionName = regions.find((r) => r.id === regionId)?.name || "";
      const provinceName = provinces.find((p) => p.id === provinceId)?.name || "";
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
          region_id: regionId || null,
          province_id: provinceId || null,
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

              <div>
                <label className={labelClass}>Region</label>
                <Select value={regionId || "none"} onValueChange={(v) => setRegionId(v === "none" ? "" : v)}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-slate-400 italic">
                      Select Region
                    </SelectItem>
                    {regions.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className={labelClass}>Province</label>
                  <Select
                    value={provinceId || "none"}
                    onValueChange={(v) => setProvinceId(v === "none" ? "" : v)}
                    disabled={!regionId}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select Province" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-slate-400 italic">
                        Select Province
                      </SelectItem>
                      {provinces.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={labelClass}>Town / City</label>
                  <Select
                    value={townId || "none"}
                    onValueChange={(v) => setTownId(v === "none" ? "" : v)}
                    disabled={!provinceId}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select Town" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-slate-400 italic">
                        Select Town / City
                      </SelectItem>
                      {towns.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className={labelClass}>Barangay</label>
                  <Select
                    value={barangayId || "none"}
                    onValueChange={(v) => setBarangayId(v === "none" ? "" : v)}
                    disabled={!townId}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select Barangay" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-slate-400 italic">
                        Select Barangay
                      </SelectItem>
                      {barangays.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
      </div>
    </div>
  );
}

const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block";
const inputClass =
  "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#d85c27] focus:border-transparent transition-all shadow-sm";
