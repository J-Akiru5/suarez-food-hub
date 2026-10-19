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

const fieldLabelStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "var(--secondary-color)",
  marginBottom: 8,
  display: "block",
} as const;

const selectTriggerStyle = {
  width: "100%",
  padding: "14px 18px",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#fff",
  fontSize: 15,
  height: "auto",
  boxSizing: "border-box",
} as const;

export default function AddressSetupForm({ onSaved }: { onSaved: (fullAddress: string) => void }) {
  const { profile } = useAuth();
  const [street, setStreet] = useState("");
  const [townId, setTownId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [towns, setTowns] = useState<Location[]>([]);
  const [districts, setDistricts] = useState<Location[]>([]);
  const [barangays, setBarangays] = useState<Location[]>([]);
  const [loadingTowns, setLoadingTowns] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  // Districts must finish loading before barangays are requested, otherwise a
  // city with districts would briefly show its full flat barangay list.
  const [districtsLoaded, setDistrictsLoaded] = useState(false);
  const [townsError, setTownsError] = useState("");
  const [districtsError, setDistrictsError] = useState("");
  const [barangaysError, setBarangaysError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Only show the towns the ADMIN has enabled in Settings (delivery_areas).
  // The client's requirement: the customer's Town/City dropdown must match
  // exactly what the admin made available for delivery.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTowns(true);
      setTownsError("");
      try {
        const [locationsRes, businessRes] = await Promise.all([
          fetch(`/api/locations?type=city&parent=${ILOILO_ID}`),
          fetch("/api/business"),
        ]);
        if (cancelled) return;
        const locations = await locationsRes.json().catch(() => ({}));
        const business = await businessRes.json().catch(() => ({}));
        if (!locationsRes.ok) throw new Error(locations?.error || "Failed to load towns");
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
        if (!cancelled) setTowns(filtered);
      } catch {
        if (!cancelled) setTownsError("Could not load delivery towns. Please refresh and try again.");
      } finally {
        if (!cancelled) setLoadingTowns(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Some cities have districts (Iloilo City → Jaro, Molo, ...). Ask the API
  // for every selected town; towns without districts just return [] and keep
  // the original flat barangay flow.
  useEffect(() => {
    let cancelled = false;
    setDistricts([]);
    setDistrictId("");
    setDistrictsLoaded(false);
    setDistrictsError("");
    setBarangays([]);
    setBarangayId("");
    setBarangaysError("");
    if (!townId) return;

    setLoadingDistricts(true);
    (async () => {
      try {
        const res = await fetch(`/api/locations?type=district&parent=${townId}`);
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) throw new Error(json?.error || "Failed to load districts");
        setDistricts(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (!cancelled) setDistrictsError("Could not load districts for this city. Please refresh and try again.");
      } finally {
        if (!cancelled) {
          setDistrictsLoaded(true);
          setLoadingDistricts(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [townId]);

  // Barangays come from the district when the city has districts, otherwise
  // straight from the city (Passi, Janiuay, ... — unchanged behaviour).
  useEffect(() => {
    let cancelled = false;
    setBarangays([]);
    setBarangayId("");
    setBarangaysError("");
    // If district loading failed we deliberately do NOT fall back to the city's
    // flat barangay list: the server would reject a district-less barangay.
    if (!townId || !districtsLoaded || districtsError) return;

    const parent = districts.length > 0 ? districtId : townId;
    if (!parent) return;

    setLoadingBarangays(true);
    (async () => {
      try {
        const res = await fetch(`/api/locations?type=barangay&parent=${parent}`);
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) throw new Error(json?.error || "Failed to load barangays");
        setBarangays(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (!cancelled) setBarangaysError("Could not load barangays. Please refresh and try again.");
      } finally {
        if (!cancelled) setLoadingBarangays(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [townId, districtId, districtsLoaded, districts.length, districtsError]);

  const hasDistricts = districts.length > 0;
  const barangayDisabled = !townId || loadingDistricts || (hasDistricts && !districtId);

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
    if (districtsError) {
      setError("We couldn't load the districts for this city. Please refresh and try again.");
      return;
    }
    if (hasDistricts && !districtId) {
      setError("Please select your district");
      return;
    }
    if (!barangayId) {
      setError("Please select your barangay");
      return;
    }

    setSaving(true);
    try {
      const townName = towns.find((t) => t.id === townId)?.name || "";
      const districtName = districts.find((d) => d.id === districtId)?.name || "";
      const barangayName = barangays.find((b) => b.id === barangayId)?.name || "";
      // District is inserted before the city so the saved label reads
      // "..., Barangay, District, City, Province, Region".
      const fullAddress = [street.trim(), barangayName, districtName, townName, "Iloilo", "Western Visayas"]
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
          // Explicit null clears a previously saved district when switching to
          // a city that has none (the PATCH only skips undefined fields).
          district_id: hasDistricts ? districtId : null,
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
        <label style={fieldLabelStyle}>Street Address (House #, Street)</label>
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
          <label style={fieldLabelStyle}>Town / City</label>
          <Select value={townId} onValueChange={(v) => setTownId(v)}>
            <SelectTrigger style={selectTriggerStyle}>
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
          {loadingTowns && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#94a3b8" }}>Loading towns...</p>}
          {!loadingTowns && towns.length === 0 && (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#94a3b8" }}>
              No delivery towns are available right now.
            </p>
          )}
          {townsError && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#dc2626" }}>{townsError}</p>}
        </div>

        {hasDistricts ? (
          <div>
            <label style={fieldLabelStyle}>District</label>
            <Select value={districtId} onValueChange={(v) => setDistrictId(v)}>
              <SelectTrigger style={selectTriggerStyle}>
                <SelectValue placeholder="Select District" />
              </SelectTrigger>
              <SelectContent>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <label style={fieldLabelStyle}>Barangay</label>
            <Select value={barangayId} onValueChange={(v) => setBarangayId(v)} disabled={barangayDisabled}>
              <SelectTrigger style={{ ...selectTriggerStyle, opacity: barangayDisabled ? 0.6 : 1 }}>
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
        )}
      </div>

      {loadingDistricts && townId && districts.length === 0 && (
        <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Loading districts...</p>
      )}
      {districtsError && <p style={{ margin: 0, fontSize: 12, color: "#dc2626" }}>{districtsError}</p>}

      {hasDistricts && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={fieldLabelStyle}>Barangay</label>
            <Select value={barangayId} onValueChange={(v) => setBarangayId(v)} disabled={barangayDisabled}>
              <SelectTrigger style={{ ...selectTriggerStyle, opacity: barangayDisabled ? 0.6 : 1 }}>
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
            {!districtId && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#94a3b8" }}>Choose a district first.</p>
            )}
            {loadingBarangays && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#94a3b8" }}>Loading barangays...</p>
            )}
            {barangaysError && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#dc2626" }}>{barangaysError}</p>}
          </div>
          <div />
        </div>
      )}

      {!hasDistricts && (
        <>
          {loadingBarangays && <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>Loading barangays...</p>}
          {barangaysError && <p style={{ margin: 0, fontSize: 12, color: "#dc2626" }}>{barangaysError}</p>}
        </>
      )}

      {!loadingBarangays && !barangaysError && barangays.length === 0 && (hasDistricts ? !!districtId : !!townId) && (
        <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>No barangays found for this area.</p>
      )}

      <div style={{ maxWidth: 200 }}>
        <label style={fieldLabelStyle}>Zip Code</label>
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
