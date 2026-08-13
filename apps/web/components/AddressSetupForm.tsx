"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { Loader2, MapPin, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-provider";

interface Location {
  id: string;
  name: string;
  type: string;
}

// The business only operates in Iloilo (Western Visayas).
const WESTERN_VISAYAS_ID = "060000000";
const ILOILO_ID = "063000000";

export default function AddressSetupForm({ onSaved }: { onSaved: (fullAddress: string) => void }) {
  const { profile } = useAuth();
  const [street, setStreet] = useState("");
  const [townId, setTownId] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [towns, setTowns] = useState<Location[]>([]);
  const [barangays, setBarangays] = useState<Location[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Only show the towns the ADMIN has enabled in Settings (delivery_areas).
  // The client's requirement: the customer's Town/City dropdown must match
  // exactly what the admin made available for delivery.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [locationsRes, businessRes] = await Promise.all([
        fetch(`/api/locations?type=city&parent=${ILOILO_ID}`),
        fetch("/api/business"),
      ]);
      const [locations, business] = await Promise.all([locationsRes.json(), businessRes.json().catch(() => ({}))]);
      if (cancelled) return;
      const allTowns = Array.isArray(locations.data || locations) ? locations.data || locations : [];
      const deliveryAreas = business?.data?.delivery_areas
        ? String(business.data.delivery_areas)
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : null;
      const filtered =
        deliveryAreas && deliveryAreas.length > 0
          ? allTowns.filter((t: { id: string }) => deliveryAreas.includes(t.id))
          : allTowns;
      setTowns(filtered);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!townId) {
      setBarangays([]);
      setBarangayId("");
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!street.trim()) {
      setError("Street address is required");
      return;
    }
    if (!townId) {
      setError("Please select your town / city");
      return;
    }
    if (!barangayId) {
      setError("Please select your barangay");
      return;
    }

    setSaving(true);
    try {
      const townName = towns.find((t) => t.id === townId)?.name || "";
      const barangayName = barangays.find((b) => b.id === barangayId)?.name || "";
      const fullAddress = [street.trim(), barangayName, townName, "Iloilo", "Western Visayas"]
        .filter(Boolean)
        .join(", ");

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: profile?.first_name || "",
          last_name: profile?.last_name || "",
          full_name:
            profile?.full_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Customer",
          phone: profile?.phone || "",
          street_address: street.trim(),
          region_id: WESTERN_VISAYAS_ID,
          province_id: ILOILO_ID,
          town_id: townId,
          barangay_id: barangayId,
          zip_code: zipCode.trim() || null,
          address: fullAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save address");
      onSaved(fullAddress);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      <div>
        <label
          style={{ fontSize: 14, fontWeight: 700, color: "var(--secondary-color)", marginBottom: 8, display: "block" }}
        >
          Street Address (House #, Street)
        </label>
        <input
          type="text"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="123 Rizal Street"
          style={{
            width: "100%",
            padding: "14px 18px",
            borderRadius: 14,
            border: "1px solid #e2e8f0",
            fontFamily: "var(--plus-jakarta-sans)",
            fontSize: 15,
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--primary-color)")}
          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--secondary-color)",
              marginBottom: 8,
              display: "block",
            }}
          >
            Town / City
          </label>
          <Select value={townId} onValueChange={(v) => setTownId(v)}>
            <SelectTrigger
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                background: "#fff",
                fontSize: 15,
                height: "auto",
                boxSizing: "border-box",
              }}
            >
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
          <label
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--secondary-color)",
              marginBottom: 8,
              display: "block",
            }}
          >
            Barangay
          </label>
          <Select value={barangayId} onValueChange={(v) => setBarangayId(v)} disabled={!townId}>
            <SelectTrigger
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                background: "#fff",
                fontSize: 15,
                height: "auto",
                boxSizing: "border-box",
                opacity: townId ? 1 : 0.6,
              }}
            >
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

      <div style={{ maxWidth: 200 }}>
        <label
          style={{ fontSize: 14, fontWeight: 700, color: "var(--secondary-color)", marginBottom: 8, display: "block" }}
        >
          Zip Code
        </label>
        <input
          type="text"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          placeholder="5000"
          style={{
            width: "100%",
            padding: "14px 18px",
            borderRadius: 14,
            border: "1px solid #e2e8f0",
            fontFamily: "var(--plus-jakarta-sans)",
            fontSize: 15,
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--primary-color)")}
          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        style={{
          alignSelf: "flex-start",
          padding: "14px 28px",
          borderRadius: 14,
          border: "none",
          background: "var(--primary-color)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 15,
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 8px 24px rgba(177,69,74,0.25)",
        }}
      >
        {saving && <Loader2 size={18} className="animate-spin" />}
        <Save size={18} /> Save Address & Continue
      </button>

      <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
        <MapPin size={14} /> Region and Province are fixed — Suarez Food Hub only delivers within Iloilo.
      </p>
    </form>
  );
}
