"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthNavbar from "../../components/AuthNavbar";
import { useAuth } from "../../components/auth-provider";
import { User, Phone, MapPin, Save, Loader2, ArrowLeft, CheckCircle } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("Full name is required"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim(), phone: phone.trim(), address: address.trim() }),
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
      <div style={{ minHeight: "100vh", background: "var(--color-creamson)", fontFamily: "var(--plus-jakarta-sans)" }}>
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
    <div style={{ minHeight: "100vh", background: "var(--color-creamson)", fontFamily: "var(--plus-jakarta-sans)" }}>
      <AuthNavbar />
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "120px 24px 60px" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 14, marginBottom: 24 }}>
          <ArrowLeft size={18} /> Back
        </button>

        <h1 style={{ fontFamily: "var(--playfair-display)", fontSize: 40, color: "var(--secondary-color)", margin: "0 0 8px" }}>My Profile</h1>
        <p style={{ color: "#64748b", margin: "0 0 32px", fontSize: 15 }}>Manage your personal information</p>

        {error && (
          <div style={{ padding: "12px 20px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 14, marginBottom: 20 }}>{error}</div>
        )}
        {saved && (
          <div style={{ padding: "12px 20px", borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontSize: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle size={18} /> Profile updated successfully
          </div>
        )}

        <form onSubmit={handleSave} style={{ background: "#fff", borderRadius: 28, padding: 40, boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block" }}>Email</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 16, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#94a3b8", fontSize: 14 }}>
                <User size={18} color="#94a3b8" />
                {user?.email}
              </div>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Email cannot be changed</p>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block" }}>Full Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                style={{ width: "100%", padding: "14px 18px", borderRadius: 16, border: "1px solid #e2e8f0", fontFamily: "var(--plus-jakarta-sans)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block" }}>Phone Number</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 16, border: "1px solid #e2e8f0" }}>
                <Phone size={18} color="#94a3b8" />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09XX XXX XXXX"
                  style={{ width: "100%", border: "none", outline: "none", fontFamily: "var(--plus-jakarta-sans)", fontSize: 14, background: "transparent" }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block" }}>Delivery Address</label>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 18px", borderRadius: 16, border: "1px solid #e2e8f0" }}>
                <MapPin size={18} color="#94a3b8" style={{ marginTop: 2 }} />
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="Your default delivery address"
                  style={{ width: "100%", border: "none", outline: "none", fontFamily: "var(--plus-jakarta-sans)", fontSize: 14, resize: "none", background: "transparent" }} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving}
            style={{ marginTop: 32, padding: "16px 36px", borderRadius: 30, border: "none", background: "var(--primary-color)", color: "#fff", fontWeight: 700, fontSize: 16, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", opacity: saving ? 0.6 : 1 }}>
            {saving && <Loader2 size={20} />}
            <Save size={18} />
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
