"use client";

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
      <div style={{ minHeight: "100vh", background: "var(--color-cream)", fontFamily: "var(--plus-jakarta-sans)" }}>
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
    <div style={{ minHeight: "100vh", background: "var(--color-cream)", fontFamily: "var(--plus-jakarta-sans)" }}>
      <AuthNavbar />
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "120px 24px 60px" }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#64748b",
            fontSize: 14,
            marginBottom: 24,
          }}
        >
          <ArrowLeft size={18} /> Back
        </button>

        <h1
          style={{
            fontFamily: "var(--playfair-display)",
            fontSize: 40,
            color: "var(--secondary-color)",
            margin: "0 0 8px",
          }}
        >
          My Profile
        </h1>
        <p style={{ color: "#64748b", margin: "0 0 32px", fontSize: 15 }}>Manage your personal information</p>

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

        <form
          onSubmit={handleSave}
          style={{ background: "#fff", borderRadius: 28, padding: 40, boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 18px",
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#94a3b8",
                  fontSize: 14,
                }}
              >
                <User size={18} color="#94a3b8" />
                {user?.email}
              </div>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Email cannot be changed</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Phone Number</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 18px",
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Phone size={18} color="#94a3b8" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09123456789"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    fontFamily: "var(--plus-jakarta-sans)",
                    fontSize: 14,
                    background: "transparent",
                  }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Street Address (House #, Street)</label>
              <input
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="123 Rizal Street"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Region</label>
              <select value={regionId} onChange={(e) => setRegionId(e.target.value)} style={inputStyle}>
                <option value="">Select Region</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Province</label>
                <select
                  value={provinceId}
                  onChange={(e) => setProvinceId(e.target.value)}
                  style={inputStyle}
                  disabled={!regionId}
                >
                  <option value="">Select Province</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Town / City</label>
                <select
                  value={townId}
                  onChange={(e) => setTownId(e.target.value)}
                  style={inputStyle}
                  disabled={!provinceId}
                >
                  <option value="">Select Town</option>
                  {towns.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Barangay</label>
                <select
                  value={barangayId}
                  onChange={(e) => setBarangayId(e.target.value)}
                  style={inputStyle}
                  disabled={!townId}
                >
                  <option value="">Select Barangay</option>
                  {barangays.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Zip Code</label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="5000"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: 32,
              padding: "16px 36px",
              borderRadius: 30,
              border: "none",
              background: "var(--primary-color)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
              opacity: saving ? 0.6 : 1,
            }}
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

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#64748b",
  marginBottom: 6,
  display: "block",
  textAlign: "left",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 18px",
  borderRadius: 16,
  border: "1px solid #e2e8f0",
  fontFamily: "var(--plus-jakarta-sans)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};
