"use client";

import {
  addressChangeInvalidatesPin,
  buildAddressSearchQueries,
  buildNominatimSearchUrl,
  deliveryEstimateKey,
  type GeocodeCandidate,
  isValidCoordinates,
  normalizeAddressQuery,
  type PinSource,
  parseNominatimSearchResults,
} from "@repo/utils";
import {
  ArrowLeft,
  Banknote,
  CheckCircle,
  CreditCard,
  Loader2,
  MapPin,
  Search,
  ShoppingBag,
  ShoppingCart,
  X,
  ZoomIn,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AddressSetupForm from "../../components/AddressSetupForm";
import AuthNavbar from "../../components/AuthNavbar";
import { useAuth } from "../../components/auth-provider";

// Leaflet map for the optional delivery pin — client-only.
const LocationPicker = dynamic(() => import("../../components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 256,
        borderRadius: 16,
        background: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        fontSize: 14,
      }}
    >
      Loading map...
    </div>
  ),
});

interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variant: string;
  variantId?: string;
  isPack?: boolean;
}

interface Business {
  gcash_qr_url: string | null;
  delivery_fee: number;
  delivery_tiers?: { max_km: number; fee: number }[] | null;
  max_delivery_km?: number;
  delivery_provinces?: string | null;
  delivery_areas?: string | null;
  delivery_min_order_amount?: number | null;
  base_lat?: number | null;
  base_lng?: number | null;
}

interface FeeEstimate {
  fee: number;
  distance_km: number | null;
  source: "pin" | "town_centroid" | "flat_fee";
  out_of_range: boolean;
  max_km: number | null;
}

/** The request identity is stored with the response so a slow old estimate
 * can never be rendered for a newer pin. */
interface KeyedFeeEstimate extends FeeEstimate {
  key: string;
}

const PH_REGEX = /^(?:\+63|0)9\d{9}$/;
const REF_REGEX = /^[A-Za-z0-9]{5,20}$/;

type PaymentMethod = "cod" | "gcash";

export default function CheckoutPage() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [refNumber, setRefNumber] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState("");
  const [error, setError] = useState("");
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [pinAddress, setPinAddress] = useState("");
  const [pinSource, setPinSource] = useState<PinSource>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");
  const [geocodeNotice, setGeocodeNotice] = useState("");
  const [geocodeNoticeTone, setGeocodeNoticeTone] = useState<"info" | "success" | "warning">("info");
  const [geocodeCandidates, setGeocodeCandidates] = useState<GeocodeCandidate[]>([]);
  const [geocodeQuery, setGeocodeQuery] = useState("");
  const [addressNeedsResolution, setAddressNeedsResolution] = useState(false);
  const [estimate, setEstimate] = useState<KeyedFeeEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState("");
  const [estimateRetry, setEstimateRetry] = useState(0);
  const [step, setStep] = useState(1);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const addressRef = useRef<HTMLTextAreaElement>(null);
  const initialProfileLoaded = useRef(false);
  const estimateSeq = useRef(0);
  const geocodeSeq = useRef(0);
  const geocodeAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sfh_cart");
      if (saved) {
        const items = JSON.parse(saved);
        if (Array.isArray(items)) setCart(items);
      }
    } catch {
      localStorage.removeItem("sfh_cart");
    }
    setCartLoaded(true);
  }, []);

  useEffect(() => {
    if (profile && !initialProfileLoaded.current) {
      initialProfileLoaded.current = true;
      setAddress((profile as any).address || (profile as any).street_address || "");
      if (!phone) setPhone(profile.phone || "");
    }
  }, [profile, phone]);

  useEffect(() => {
    fetch("/api/business")
      .then((r) => r.json())
      .then((response) => setBusiness(response.data || response))
      .catch(() => {});
  }, []);

  // Cancel an in-flight address lookup if checkout unmounts.
  useEffect(() => {
    return () => geocodeAbort.current?.abort();
  }, []);

  // Live delivery-fee estimate — recomputed whenever the pin or the profile
  // town changes. The server recomputes authoritatively on placement. Each
  // response is keyed to its request so a slow old response can never
  // overwrite a newer pin's fee.
  const townId = (profile as any)?.town_id as string | undefined;
  const profileLoaded = !!profile;
  const pin = position && isValidCoordinates(position.lat, position.lng) ? position : null;
  const pinIsInvalid = !!position && !pin;
  const estimateKey = `${deliveryEstimateKey(pin, townId)}#${estimateRetry}`;

  useEffect(() => {
    if (pinIsInvalid) {
      setEstimate(null);
      setEstimateLoading(false);
      setEstimateError("The selected pin location is invalid. Please choose it again on the map.");
      return;
    }
    if (!profileLoaded && !pin) return;

    const seq = ++estimateSeq.current;
    const controller = new AbortController();
    const requestKey = estimateKey;

    setEstimateError("");
    setEstimateLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/delivery-estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            lat: pin?.lat ?? null,
            lng: pin?.lng ?? null,
            town_id: pin ? null : (townId ?? null),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (seq !== estimateSeq.current) return; // a newer pin/town already won
        if (!res.ok || !data?.data) throw new Error(data?.error || "Could not calculate the delivery fee.");
        setEstimate({ ...(data.data as FeeEstimate), key: requestKey });
      } catch (err) {
        if (controller.signal.aborted || seq !== estimateSeq.current) return;
        setEstimate(null);
        setEstimateError(err instanceof Error ? err.message : "Could not calculate the delivery fee.");
      } finally {
        if (seq === estimateSeq.current) setEstimateLoading(false);
      }
    }, 350); // debounce rapid pin drags

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [estimateKey, pin, pinIsInvalid, profileLoaded, townId]);

  const estimateForCurrent = estimate?.key === estimateKey ? estimate : null;
  const feeReady = !!estimateForCurrent && !estimateLoading && !estimateError;
  const continueDisabled = !feeReady || pinIsInvalid;

  // Authoritative restaurant origin from the business config. Used only to
  // centre the map — never as a customer pin.
  const storePosition =
    business?.base_lat != null && business?.base_lng != null && isValidCoordinates(business.base_lat, business.base_lng)
      ? { lat: Number(business.base_lat), lng: Number(business.base_lng) }
      : null;

  // Town/city-level delivery restriction (Iloilo Province + selected towns), with
  // province-level fallback for backwards compatibility.
  const deliveryAreaList = business?.delivery_areas ? business.delivery_areas.split(",").filter(Boolean) : null;
  const deliveryProvinceList = business?.delivery_provinces
    ? business.delivery_provinces.split(",").filter(Boolean)
    : null;
  // No saved address at all — block ordering and ask the customer to set one up.
  const needsAddressSetup = !!profile && !(profile as any).town_id;
  const isAreaRestricted =
    !!profile &&
    !needsAddressSetup &&
    (deliveryAreaList && deliveryAreaList.length > 0
      ? !deliveryAreaList.includes((profile as any).town_id)
      : deliveryProvinceList && deliveryProvinceList.length > 0
        ? !deliveryProvinceList.includes((profile as any).province_id)
        : false);

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  // No stale fallback: while the current destination's estimate is loading or
  // failed, the fee/total are shown as pending instead of a made-up number.
  const fee = estimateForCurrent?.fee ?? null;
  const total = fee != null ? subtotal + fee : null;
  const feeOutOfRange = !!estimateForCurrent?.out_of_range;
  // Delivery orders must reach the minimum SUBTOTAL (before delivery fee). The server enforces it too.
  const minOrderAmount = business?.delivery_min_order_amount ?? 0;
  const isBelowMinimum = minOrderAmount > 0 && subtotal < minOrderAmount;
  const belowMinimumMessage = `Minimum order for delivery is ₱${minOrderAmount}. Add ₱${Math.ceil(minOrderAmount - subtotal)} more to proceed.`;

  const validatePhone = (val: string) => {
    if (!val.trim()) return "Phone number is required";
    if (!PH_REGEX.test(val.trim())) return "Enter a valid PH mobile number (e.g. 09123456789)";
    return "";
  };

  const applyGeocodeCandidate = (
    candidate: GeocodeCandidate,
    query: string,
    notice = "Address found on the map. Check the pin and adjust it if needed.",
  ) => {
    setPosition({ lat: candidate.lat, lng: candidate.lng });
    setPinSource("address");
    setResolvedAddress(query);
    setPinAddress(candidate.displayName);
    setShowMapPicker(true);
    setGeocodeCandidates([]);
    setGeocodeQuery("");
    setGeocodeError("");
    setGeocodeNoticeTone("success");
    setGeocodeNotice(notice);
    setAddressNeedsResolution(false);
  };

  // Resolve the typed address with Nominatim (the same provider used for the
  // reverse-geocoded pin label). This is separate from browser GPS.
  const findAddressOnMap = async (queryOverride?: string) => {
    const query = normalizeAddressQuery(queryOverride ?? address);
    if (!query) {
      setGeocodeError("Enter a delivery address first.");
      setGeocodeNotice("");
      setGeocodeCandidates([]);
      return;
    }

    const queries = buildAddressSearchQueries(query);
    if (queries.length === 0) {
      setGeocodeError("Enter a delivery address first.");
      return;
    }

    geocodeAbort.current?.abort();
    const controller = new AbortController();
    geocodeAbort.current = controller;
    const seq = ++geocodeSeq.current;

    setGeocoding(true);
    setGeocodeError("");
    setGeocodeNotice("");
    setGeocodeNoticeTone("info");
    setGeocodeCandidates([]);

    try {
      let matchedQuery = query;
      let candidates: GeocodeCandidate[] = [];

      for (let index = 0; index < queries.length; index++) {
        if (index > 0) {
          // Nominatim's usage policy allows at most one request per second.
          setGeocodeNoticeTone("info");
          setGeocodeNotice("Trying a broader version of the address…");
          await new Promise((resolve) => setTimeout(resolve, 1100));
          if (seq !== geocodeSeq.current) return;
        }

        const url = buildNominatimSearchUrl(queries[index]);
        if (!url) continue;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`Address search failed (${res.status}).`);
        const raw = await res.json();
        if (seq !== geocodeSeq.current) return;

        const found = parseNominatimSearchResults(raw);
        if (found.length > 0) {
          candidates = found;
          matchedQuery = queries[index];
          break;
        }
      }

      if (candidates.length === 0) {
        setGeocodeNotice("");
        setGeocodeError(
          "No matching location found. Add a barangay or municipality, or set the pin manually on the map.",
        );
        return;
      }

      const usedBroaderQuery = matchedQuery !== query;
      if (candidates.length === 1) {
        applyGeocodeCandidate(
          candidates[0],
          query,
          usedBroaderQuery
            ? "Address found using a broader search. Verify the pin and adjust it if needed."
            : "Address found on the map. Check the pin and adjust it if needed.",
        );
        return;
      }

      setGeocodeCandidates(candidates);
      setGeocodeQuery(query);
      setGeocodeNoticeTone("info");
      setGeocodeNotice(
        usedBroaderQuery
          ? "Multiple locations match the broader search. Choose the correct destination below."
          : "Multiple locations match. Choose the correct destination below.",
      );
    } catch {
      if (controller.signal.aborted || seq !== geocodeSeq.current) return;
      setGeocodeNotice("");
      setGeocodeError(
        "Address lookup failed. Check your connection and try again, or set the pin manually on the map.",
      );
    } finally {
      if (seq === geocodeSeq.current) setGeocoding(false);
    }
  };

  const handleAddressChange = (value: string) => {
    if (value === address) return;
    const normalizedChanged = normalizeAddressQuery(value) !== normalizeAddressQuery(address);
    setAddress(value);
    if (!normalizedChanged) return;

    const hadAddressPin = pinSource === "address";
    const keepAddressWarning = hadAddressPin || addressNeedsResolution;

    // The in-flight lookup, if any, no longer describes the edited field.
    geocodeSeq.current += 1;
    geocodeAbort.current?.abort();
    setGeocoding(false);
    setGeocodeError("");
    setGeocodeNotice("");
    setGeocodeNoticeTone("info");
    setGeocodeCandidates([]);
    setGeocodeQuery("");

    const invalidatesPin = addressChangeInvalidatesPin({ pinSource, resolvedAddress, nextAddress: value });

    if (invalidatesPin) {
      // An address-derived pin must never stay attached to different text.
      setPosition(null);
      setPinSource(null);
      setResolvedAddress(null);
      setPinAddress("");
      setAddressNeedsResolution(true);
      setGeocodeNoticeTone("warning");
      setGeocodeNotice("Address changed — find the new address on the map or set the pin manually.");
    } else if (keepAddressWarning && !position) {
      setAddressNeedsResolution(true);
      setGeocodeNoticeTone("warning");
      setGeocodeNotice("Address changed — find the new address on the map or set the pin manually.");
    } else if (position) {
      setGeocodeNoticeTone("warning");
      setGeocodeNotice(
        "Address changed — your existing pin is unchanged. Use Find Address on Map to match it, or move the pin.",
      );
    }
  };

  const handlePinSourceChange = (source: "gps" | "map" | null) => {
    // A GPS/manual/clear choice always wins over a slower address lookup.
    geocodeSeq.current += 1;
    geocodeAbort.current?.abort();
    setGeocoding(false);
    setAddressNeedsResolution(false);
    if (!source) {
      setPinSource(null);
      setResolvedAddress(null);
      setGeocodeCandidates([]);
      setGeocodeQuery("");
      setGeocodeError("");
      setGeocodeNotice("");
      setGeocodeNoticeTone("info");
      return;
    }
    // A manual refinement of an address-resolved pin stays associated with
    // that address, so later address edits still invalidate it.
    setPinSource((prev) => (prev === "address" && source === "map" ? "address" : source));
    setGeocodeCandidates([]);
    setGeocodeQuery("");
    setGeocodeError("");
    setGeocodeNotice("");
    setGeocodeNoticeTone("info");
  };

  const handleUseSavedAddress = () => {
    if (!profile) return;
    const savedAddress = ((profile as any).address || (profile as any).street_address || "").trim();
    if (!savedAddress) {
      setGeocodeError("No saved profile address found. Enter your address and use Find Address on Map.");
      return;
    }

    // Drop the previous pin/resolution before resolving the saved address.
    setPosition(null);
    setPinSource(null);
    setResolvedAddress(null);
    setPinAddress("");
    setShowMapPicker(false);
    setGeocodeCandidates([]);
    setGeocodeQuery("");
    setGeocodeError("");
    setGeocodeNotice("");
    setGeocodeNoticeTone("info");
    setAddressNeedsResolution(false);
    setAddress(savedAddress);
    if (profile.phone) setPhone(profile.phone);

    void findAddressOnMap(savedAddress);
  };

  const handleUsePinAddress = () => {
    if (!pinAddress) return;
    setAddress(pinAddress);
    if (pinSource === "address") setResolvedAddress(pinAddress);
    setGeocodeError("");
    setGeocodeNotice("");
    setGeocodeNoticeTone("info");
    setAddressNeedsResolution(false);
  };

  const handleNextStep1 = () => {
    setError("");
    if (isBelowMinimum) {
      setError(belowMinimumMessage);
      return;
    }
    if (pinIsInvalid) {
      setError("The selected pin location is invalid. Please choose it again on the map.");
      return;
    }
    if (estimateLoading) {
      setError("Calculating your delivery fee — please wait a moment.");
      return;
    }
    if (estimateError) {
      setError(estimateError);
      return;
    }
    if (!estimateForCurrent || total == null) {
      setError("We couldn't determine the delivery fee for this destination. Please retry.");
      return;
    }
    if (feeOutOfRange) {
      setError(
        `Delivery is too far — about ${estimateForCurrent.distance_km} km away (we deliver up to ${estimateForCurrent.max_km} km). Please move your pin closer or update your address.`,
      );
      return;
    }
    if (!address.trim()) {
      setError("Delivery address is required");
      return;
    }
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      setError(phoneErr);
      return;
    }
    setPhoneError("");
    setStep(2);
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (screenshot of your GCash payment).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image is too large — please upload a screenshot under 5MB.");
      return;
    }
    setUploadingProof(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload-proof", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setProofUrl(data.data.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload payment proof.");
    } finally {
      setUploadingProof(false);
      if (proofInputRef.current) proofInputRef.current.value = "";
    }
  };

  const handleNextStep2 = () => {
    setError("");
    if (paymentMethod !== "cod") {
      if (!REF_REGEX.test(refNumber.trim())) {
        setError("Enter a valid GCash reference number (5-20 alphanumeric characters)");
        return;
      }
      if (!proofUrl) {
        setError("Please upload a screenshot of your GCash payment as proof.");
        return;
      }
    }
    setStep(3);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    if (cart.length === 0) {
      setError("Your basket is empty");
      return;
    }

    if (isBelowMinimum) {
      setError(belowMinimumMessage);
      return;
    }

    // Never submit with a stale or missing fee. The server recomputes the
    // authoritative fee from the same pin, but the customer must see a
    // confirmed amount before placing the order.
    if (pinIsInvalid || !estimateForCurrent || total == null || estimateLoading || estimateError) {
      setError("Delivery fee is not ready. Please go back and confirm your delivery location.");
      return;
    }

    if (feeOutOfRange) {
      setError("Your delivery address is beyond our maximum delivery distance. Please adjust your pin or address.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart,
          delivery_address: address.trim(),
          delivery_lat: pin?.lat ?? null,
          delivery_lng: pin?.lng ?? null,
          delivery_contact: phone.trim(),
          payment_method: paymentMethod,
          gcash_reference: paymentMethod === "gcash" ? refNumber.trim() : null,
          payment_proof_url: paymentMethod === "gcash" ? proofUrl : null,
          // Totals are computed server-side from DB prices + business config.
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errBody = data.data || data;
        if (errBody.details && Array.isArray(errBody.details)) {
          throw new Error(errBody.details.join(". "));
        }
        throw new Error(errBody.error || "Failed to place order");
      }

      localStorage.removeItem("sfh_cart");
      try {
        await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: [] }),
        });
      } catch {
        /* ignore */
      }

      const result = data.data || data;
      setPlacedOrderId(result.orderId);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (!cartLoaded) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--color-cream)", fontFamily: "var(--plus-jakarta-sans)" }}>
        <AuthNavbar />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "120px 24px 60px" }}>
          <div style={{ background: "#fff", borderRadius: 28, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}>
            <div style={{ width: "40%", height: 24, background: "#f1f5f9", borderRadius: 8, marginBottom: 16 }} />
            <div style={{ width: "80%", height: 14, background: "#f1f5f9", borderRadius: 6, marginBottom: 8 }} />
            <div style={{ width: "60%", height: 14, background: "#f1f5f9", borderRadius: 6 }} />
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0 && !success) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--color-cream)", fontFamily: "var(--plus-jakarta-sans)" }}>
        <AuthNavbar />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "120px 24px 60px", textAlign: "center" }}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "rgba(177,69,74,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <ShoppingBag size={48} color="var(--primary-color)" style={{ opacity: 0.4 }} />
          </div>
          <h2
            style={{ fontFamily: "var(--playfair-display)", fontSize: 32, color: "var(--secondary-color)", margin: 0 }}
          >
            Your basket is empty
          </h2>
          <p style={{ color: "#94a3b8", marginTop: 12, fontSize: 16 }}>
            Add some items from our menu before checking out.
          </p>
          <button
            onClick={() => router.push("/menu")}
            style={{
              marginTop: 24,
              padding: "16px 36px",
              borderRadius: 30,
              border: "none",
              background: "var(--primary-color)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(177,69,74,0.25)",
            }}
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "var(--color-cream)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--plus-jakarta-sans)",
        }}
      >
        <AuthNavbar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <CheckCircle size={80} color="var(--primary-color)" style={{ margin: "0 auto 24px", display: "block" }} />
            <h2
              style={{
                fontFamily: "var(--playfair-display)",
                fontSize: 36,
                color: "var(--secondary-color)",
                margin: 0,
              }}
            >
              Order Placed!
            </h2>
            <p style={{ color: "#64748b", marginTop: 12, fontSize: 16 }}>
              Your order <strong style={{ fontFamily: "monospace" }}>#{placedOrderId.slice(0, 8).toUpperCase()}</strong>{" "}
              has been received.
            </p>
            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <button
                onClick={() => router.push("/orders")}
                style={{
                  padding: "16px 36px",
                  borderRadius: 30,
                  border: "none",
                  background: "var(--primary-color)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                  width: "100%",
                  maxWidth: 280,
                  boxShadow: "0 8px 24px rgba(177,69,74,0.25)",
                }}
              >
                View Order Status
              </button>
              <button
                onClick={() => router.push("/menu")}
                style={{
                  padding: "14px 32px",
                  borderRadius: 30,
                  border: "2px solid var(--primary-color)",
                  background: "transparent",
                  color: "var(--primary-color)",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  width: "100%",
                  maxWidth: 280,
                }}
              >
                Order Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--color-cream)", fontFamily: "var(--plus-jakarta-sans)" }}>
      <AuthNavbar />

      <style>{`
        @media (max-width: 1024px) {
          .bento-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .bento-grid { padding: 100px 16px 40px !important; }
          .checkout-step-indicator { width: 100% !important; max-width: 320px !important; align-self: center !important; margin-top: 12px !important; }
          .checkout-step-indicator span { font-size: 11px !important; }
          .step-circle { width: 32px !important; height: 32px !important; }
          .checkout-heading { font-size: 28px !important; }
          .delivery-address-phone-grid { grid-template-columns: 1fr !important; }
          .delivery-address-phone-grid button { width: 100% !important; }
          .payment-grid { grid-template-columns: 1fr !important; }
          .checkout-buttons { flex-direction: column !important; gap: 12px !important; }
          .checkout-buttons button { width: 100% !important; justify-content: center !important; }
          .order-summary { max-height: 250px !important; }
          .address-header { flex-direction: column !important; align-items: flex-start !important; gap: 4px !important; }
          .checkout-top-row { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
        }
      `}</style>

      <div
        className="bento-grid"
        style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: "120px 40px 60px",
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gap: 40,
          alignItems: "start",
        }}
      >
        {/* Left Column: Checkout Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            className="checkout-top-row"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={() => router.back()}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "50%",
                  width: 48,
                  height: 48,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                  transition: "all 0.2s",
                }}
              >
                <ArrowLeft size={20} />
              </button>
              <h1
                style={{
                  fontFamily: "var(--playfair-display)",
                  fontSize: 40,
                  color: "var(--secondary-color)",
                  margin: 0,
                }}
                className="checkout-heading"
              >
                Checkout
              </h1>
            </div>

            {/* Step Indicator */}
            <div
              className="checkout-step-indicator"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "relative",
                width: 320,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  right: 20,
                  top: 20,
                  height: 2,
                  background: "#e2e8f0",
                  zIndex: 0,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  width: step === 1 ? "0%" : step === 2 ? "calc(50% - 20px)" : "calc(100% - 40px)",
                  top: 20,
                  height: 2,
                  background: "var(--primary-color)",
                  zIndex: 1,
                  transition: "width 0.3s ease",
                }}
              />

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 2 }}>
                <div
                  className="step-circle"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: step >= 1 ? "var(--primary-color)" : "#fff",
                    border: step >= 1 ? "none" : "2px solid #e2e8f0",
                    color: step >= 1 ? "#fff" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    transition: "all 0.3s ease",
                    boxShadow: step >= 1 ? "0 4px 12px rgba(177,69,74,0.2)" : "none",
                  }}
                >
                  1
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: step >= 1 ? 700 : 500,
                    color: step >= 1 ? "var(--secondary-color)" : "#94a3b8",
                  }}
                >
                  Delivery
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 2 }}>
                <div
                  className="step-circle"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: step >= 2 ? "var(--primary-color)" : "#fff",
                    border: step >= 2 ? "none" : "2px solid #e2e8f0",
                    color: step >= 2 ? "#fff" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    transition: "all 0.3s ease",
                    boxShadow: step >= 2 ? "0 4px 12px rgba(177,69,74,0.2)" : "none",
                  }}
                >
                  2
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: step >= 2 ? 700 : 500,
                    color: step >= 2 ? "var(--secondary-color)" : "#94a3b8",
                  }}
                >
                  Payment
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 2 }}>
                <div
                  className="step-circle"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: step >= 3 ? "var(--primary-color)" : "#fff",
                    border: step >= 3 ? "none" : "2px solid #e2e8f0",
                    color: step >= 3 ? "#fff" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    transition: "all 0.3s ease",
                    boxShadow: step >= 3 ? "0 4px 12px rgba(177,69,74,0.2)" : "none",
                  }}
                >
                  3
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: step >= 3 ? 700 : 500,
                    color: step >= 3 ? "var(--secondary-color)" : "#94a3b8",
                  }}
                >
                  Confirm
                </span>
              </div>
            </div>
          </div>{" "}
          {isAreaRestricted && (
            <div
              style={{
                padding: "16px 20px",
                borderRadius: 16,
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#c2410c",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <strong>Delivery not available</strong> — We currently only deliver within Iloilo Province and selected
              towns in Iloilo. Please update your profile address to a covered area.
            </div>
          )}
          {error && (
            <div
              style={{
                padding: "16px 20px",
                borderRadius: 16,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}
          {/* Address not set up yet — block ordering and offer setup options */}
          {step === 1 && needsAddressSetup && (
            <div
              className="animate-in fade-in slide-in-from-right-8 duration-300"
              style={{ background: "#fff", borderRadius: 28, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}
            >
              <h3
                style={{
                  margin: "0 0 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "var(--secondary-color)",
                  fontSize: 24,
                  fontFamily: "var(--playfair-display)",
                }}
              >
                <MapPin size={24} color="var(--primary-color)" /> Set Up Your Delivery Address
              </h3>
              <p style={{ margin: "0 0 20px", fontSize: 15, color: "#64748b", lineHeight: 1.6 }}>
                You need to add your delivery address before you can place an order. We currently deliver within{" "}
                <strong>Iloilo Province</strong> and selected towns in Iloilo.
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                <button
                  onClick={() => router.push("/profile")}
                  style={{
                    padding: "14px 28px",
                    borderRadius: 14,
                    border: "none",
                    background: "var(--primary-color)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: "pointer",
                    boxShadow: "0 8px 24px rgba(177,69,74,0.25)",
                  }}
                >
                  Go to My Profile
                </button>
                <button
                  onClick={() => setShowAddressForm((v) => !v)}
                  style={{
                    padding: "14px 28px",
                    borderRadius: 14,
                    border: "2px solid var(--primary-color)",
                    background: "#fff",
                    color: "var(--primary-color)",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  {showAddressForm ? "Hide Form" : "Enter Address Here"}
                </button>
              </div>

              {showAddressForm && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
                  <AddressSetupForm
                    onSaved={async (fullAddress: string) => {
                      setAddress(fullAddress);
                      setShowAddressForm(false);
                      await refreshProfile();
                    }}
                  />
                </div>
              )}
            </div>
          )}
          {/* Step 1: Delivery */}
          {step === 1 && !needsAddressSetup && (
            <div
              className="animate-in fade-in slide-in-from-right-8 duration-300"
              style={{ background: "#fff", borderRadius: 28, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}
            >
              <h3
                style={{
                  margin: "0 0 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "var(--secondary-color)",
                  fontSize: 24,
                  fontFamily: "var(--playfair-display)",
                }}
              >
                <MapPin size={24} color="var(--primary-color)" /> Delivery Details
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Bottom: Address & Phone Row */}
                <div
                  className="delivery-address-phone-grid"
                  style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr auto", gap: 20, alignItems: "end" }}
                >
                  <div>
                    <div
                      className="address-header"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: 8,
                      }}
                    >
                      <label
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--secondary-color)",
                          display: "block",
                        }}
                      >
                        Delivery Address
                      </label>
                      <button
                        type="button"
                        onClick={handleUseSavedAddress}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--primary-color)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          padding: 0,
                        }}
                        className="hover:underline"
                      >
                        Use Saved Profile Address
                      </button>
                    </div>
                    <textarea
                      ref={addressRef}
                      value={address}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      required
                      rows={3}
                      placeholder="House #, Street, Barangay, City"
                      style={{
                        width: "100%",
                        padding: "16px 20px",
                        borderRadius: 16,
                        border: "1px solid #e2e8f0",
                        fontFamily: "var(--plus-jakarta-sans)",
                        fontSize: 15,
                        resize: "vertical",
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                        overflow: "auto",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--primary-color)")}
                      onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                    />

                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => void findAddressOnMap()}
                        disabled={geocoding || !address.trim()}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "9px 14px",
                          borderRadius: 10,
                          border: "2px solid var(--primary-color)",
                          background: "#fff",
                          color: "var(--primary-color)",
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: geocoding || !address.trim() ? "not-allowed" : "pointer",
                          opacity: geocoding || !address.trim() ? 0.6 : 1,
                        }}
                      >
                        {geocoding ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        {geocoding ? "Finding address…" : "Find Address on Map"}
                      </button>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        Uses the typed address. GPS is available on the map as a separate option.
                      </span>
                    </div>

                    {geocodeNotice && (
                      <p
                        style={{
                          margin: "8px 0 0",
                          fontSize: 12,
                          lineHeight: 1.5,
                          color:
                            geocodeNoticeTone === "success"
                              ? "#15803d"
                              : geocodeNoticeTone === "warning"
                                ? "#b45309"
                                : "#475569",
                        }}
                      >
                        {geocodeNotice}
                      </p>
                    )}
                    {geocodeError && (
                      <p style={{ margin: "8px 0 0", fontSize: 12, color: "#dc2626", lineHeight: 1.5 }}>
                        {geocodeError}
                      </p>
                    )}
                    {geocodeCandidates.length > 1 && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid #e2e8f0",
                          background: "#f8fafc",
                        }}
                      >
                        <p
                          style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "var(--secondary-color)" }}
                        >
                          Multiple matches — choose the correct destination:
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {geocodeCandidates.map((candidate) => (
                            <button
                              key={`${candidate.lat},${candidate.lng}`}
                              type="button"
                              onClick={() => applyGeocodeCandidate(candidate, geocodeQuery)}
                              style={{
                                textAlign: "left",
                                padding: "8px 10px",
                                borderRadius: 8,
                                border: "1px solid #e2e8f0",
                                background: "#fff",
                                color: "#334155",
                                fontSize: 12,
                                lineHeight: 1.45,
                                cursor: "pointer",
                              }}
                            >
                              {candidate.displayName}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setPhoneError("");
                      }}
                      required
                      placeholder="09XX XXX XXXX"
                      style={{
                        width: "100%",
                        padding: "16px 20px",
                        borderRadius: 16,
                        border: `1px solid ${phoneError ? "#ef4444" : "#e2e8f0"}`,
                        fontFamily: "var(--plus-jakarta-sans)",
                        fontSize: 15,
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => {
                        if (!phoneError) e.target.style.borderColor = "var(--primary-color)";
                      }}
                      onBlur={(e) => {
                        if (!phoneError) e.target.style.borderColor = "#e2e8f0";
                      }}
                    />
                    {phoneError && (
                      <p style={{ color: "#ef4444", fontSize: 13, marginTop: 6, position: "absolute" }}>{phoneError}</p>
                    )}
                  </div>

                  {isBelowMinimum && (
                    <div
                      style={{
                        padding: "16px 20px",
                        borderRadius: 16,
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        color: "#b45309",
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      {belowMinimumMessage}
                    </div>
                  )}

                  <div>
                    <button
                      onClick={handleNextStep1}
                      disabled={continueDisabled}
                      title={
                        estimateError
                          ? estimateError
                          : estimateLoading
                            ? "Calculating your delivery fee…"
                            : "Confirm your delivery location first"
                      }
                      style={{
                        padding: "16px 32px",
                        borderRadius: 16,
                        border: "none",
                        background: "var(--primary-color)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 16,
                        cursor: continueDisabled ? "not-allowed" : "pointer",
                        boxShadow: "0 8px 24px rgba(177,69,74,0.25)",
                        transition: "opacity 0.2s",
                        height: 56,
                        whiteSpace: "nowrap",
                        opacity: continueDisabled ? 0.6 : 1,
                      }}
                      onMouseOver={(e) => {
                        if (!continueDisabled) e.currentTarget.style.opacity = "0.9";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.opacity = continueDisabled ? "0.6" : "1";
                      }}
                    >
                      {estimateLoading ? "Calculating fee…" : "Continue to Payment"}
                    </button>
                    {estimateError && (
                      <p style={{ color: "#dc2626", fontSize: 12, marginTop: 6, maxWidth: 240 }}>
                        {estimateError}{" "}
                        <button
                          type="button"
                          onClick={() => setEstimateRetry((n) => n + 1)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--primary-color)",
                            fontWeight: 700,
                            cursor: "pointer",
                            padding: 0,
                            textDecoration: "underline",
                          }}
                        >
                          Retry
                        </button>
                      </p>
                    )}
                  </div>
                </div>

                {/* Optional: exact delivery pin for an accurate distance-based fee */}
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--secondary-color)" }}>
                        Exact location (optional)
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>
                        {position
                          ? "Pin set — the fee below is calculated from this exact location."
                          : estimateForCurrent?.source === "town_centroid"
                            ? "No pin set — the fee uses your saved town's distance estimate."
                            : "No pin set — a flat fee applies until you place a pin for distance pricing."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMapPicker((v) => !v)}
                      style={{
                        padding: "10px 18px",
                        borderRadius: 12,
                        border: "2px solid var(--primary-color)",
                        background: showMapPicker ? "var(--primary-color)" : "#fff",
                        color: showMapPicker ? "#fff" : "var(--primary-color)",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {showMapPicker ? "Hide Map" : position ? "Edit Pin" : "Set on Map"}
                    </button>
                  </div>
                  {showMapPicker && (
                    <LocationPicker
                      position={position}
                      setPosition={setPosition}
                      defaultCenter={storePosition}
                      storePosition={storePosition}
                      onAddressDetect={setPinAddress}
                      onPositionSourceChange={handlePinSourceChange}
                    />
                  )}

                  {position && pinAddress && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "10px 14px",
                        borderRadius: 12,
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                        <strong>Matched location:</strong> {pinAddress}
                      </p>
                      <button
                        type="button"
                        onClick={handleUsePinAddress}
                        style={{
                          background: "none",
                          border: "1px solid var(--primary-color)",
                          borderRadius: 8,
                          color: "var(--primary-color)",
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "5px 10px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Use this address
                      </button>
                    </div>
                  )}

                  {pinIsInvalid && (
                    <p style={{ color: "#dc2626", fontSize: 13, fontWeight: 600, marginTop: 10 }}>
                      The selected pin is invalid. Please remove it and set it again on the map.
                    </p>
                  )}
                  {feeOutOfRange && estimateForCurrent && (
                    <p style={{ color: "#dc2626", fontSize: 13, fontWeight: 600, marginTop: 10 }}>
                      ✕ This location is about {estimateForCurrent.distance_km} km away — we deliver up to{" "}
                      {estimateForCurrent.max_km} km. Please move your pin closer.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Step 2: Payment */}
          {step === 2 && (
            <div
              className="animate-in fade-in slide-in-from-right-8 duration-300"
              style={{ background: "#fff", borderRadius: 28, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}
            >
              <h3
                style={{
                  margin: "0 0 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "var(--secondary-color)",
                  fontSize: 24,
                  fontFamily: "var(--playfair-display)",
                }}
              >
                <CreditCard size={24} color="var(--primary-color)" /> Payment Method
              </h3>

              <div className="payment-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                {/* Left: Options */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <PaymentOption
                    selected={paymentMethod === "cod"}
                    onClick={() => setPaymentMethod("cod")}
                    icon={<Banknote size={24} color="var(--primary-color)" />}
                    title="Cash on Delivery"
                    subtitle="Pay when you receive your order"
                  />
                  <PaymentOption
                    selected={paymentMethod === "gcash"}
                    onClick={() => setPaymentMethod("gcash")}
                    icon={
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: "#0057e0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        G
                      </div>
                    }
                    title="GCash"
                    subtitle="Pay via GCash"
                  />
                </div>

                {/* Right: Details */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {paymentMethod !== "cod" ? (
                    <div
                      className="animate-in fade-in duration-300"
                      style={{
                        flex: 1,
                        padding: 24,
                        background: "#f8fafc",
                        borderRadius: 20,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      {paymentMethod === "gcash" && business?.gcash_qr_url ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 24 }}>
                          <div
                            onClick={() => setQrModalUrl(business.gcash_qr_url)}
                            style={{
                              width: 100,
                              height: 100,
                              position: "relative",
                              cursor: "pointer",
                              borderRadius: 16,
                              overflow: "hidden",
                              background: "#fff",
                              border: "1px solid #e2e8f0",
                              flexShrink: 0,
                            }}
                          >
                            <img
                              src={business.gcash_qr_url!}
                              alt="QR Code"
                              style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <div
                                style={{
                                  background: "rgba(0,0,0,0.6)",
                                  borderRadius: "50%",
                                  width: 44,
                                  height: 44,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backdropFilter: "blur(2px)",
                                  transition: "transform 0.2s",
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                                onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                              >
                                <ZoomIn size={22} color="#fff" />
                              </div>
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <p
                              style={{
                                margin: "0 0 6px",
                                fontSize: 16,
                                fontWeight: 800,
                                color: "var(--secondary-color)",
                              }}
                            >
                              Scan to pay via GCash
                            </p>
                            <p style={{ margin: 0, fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>
                              Transfer the exact Total Amount, then enter the reference number below.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize: 14, color: "#ef4444", margin: "0 0 20px" }}>
                          QR code not yet uploaded by admin. Please use Cash on Delivery.
                        </p>
                      )}
                      <label
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--secondary-color)",
                          marginBottom: 8,
                          display: "block",
                        }}
                      >
                        Reference Number
                      </label>
                      <input
                        type="text"
                        value={refNumber}
                        onChange={(e) => setRefNumber(e.target.value)}
                        placeholder="GCash Reference Number"
                        style={{
                          width: "100%",
                          padding: "16px 20px",
                          borderRadius: 16,
                          border: "1px solid #e2e8f0",
                          fontFamily: "var(--plus-jakarta-sans)",
                          fontSize: 15,
                          outline: "none",
                          boxSizing: "border-box",
                          background: "#fff",
                          transition: "border-color 0.2s",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--primary-color)")}
                        onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                      />

                      {/* Payment Proof Upload */}
                      <label
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--secondary-color)",
                          marginBottom: 8,
                          marginTop: 20,
                          display: "block",
                        }}
                      >
                        Payment Proof (Screenshot)
                      </label>
                      <input
                        ref={proofInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleProofUpload}
                        disabled={uploadingProof}
                        style={{
                          width: "100%",
                          padding: "14px 18px",
                          borderRadius: 16,
                          border: "1px dashed #e2e8f0",
                          background: "#fff",
                          fontSize: 14,
                          cursor: uploadingProof ? "wait" : "pointer",
                          boxSizing: "border-box",
                        }}
                      />
                      <p style={{ margin: "8px 0 0", fontSize: 12, color: "#94a3b8" }}>
                        Upload a screenshot of your GCash payment so staff can verify your order.
                      </p>
                      {uploadingProof && (
                        <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--primary-color)", fontWeight: 600 }}>
                          Uploading…
                        </p>
                      )}
                      {proofUrl && !uploadingProof && (
                        <div
                          style={{
                            marginTop: 12,
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "10px 14px",
                            borderRadius: 12,
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                          }}
                        >
                          <CheckCircle size={18} color="#16a34a" />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>
                            Proof uploaded — staff will verify it.
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="animate-in fade-in duration-300"
                      style={{
                        flex: 1,
                        padding: 24,
                        background: "#f8fafc",
                        borderRadius: 20,
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                      }}
                    >
                      <div>
                        <Banknote
                          size={48}
                          color="var(--primary-color)"
                          style={{ margin: "0 auto 16px", opacity: 0.2 }}
                        />
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--secondary-color)" }}>
                          No advance payment needed.
                        </p>
                        <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
                          Please prepare the exact amount upon delivery.
                        </p>
                      </div>
                    </div>
                  )}

                  <div
                    className="checkout-buttons"
                    style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", paddingTop: 24 }}
                  >
                    <button
                      onClick={() => setStep(1)}
                      style={{
                        padding: "16px 24px",
                        borderRadius: 16,
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                        color: "#64748b",
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
                    >
                      <ArrowLeft size={18} /> Back
                    </button>
                    <button
                      onClick={handleNextStep2}
                      style={{
                        padding: "16px 40px",
                        borderRadius: 16,
                        border: "none",
                        background: "var(--primary-color)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 16,
                        cursor: "pointer",
                        boxShadow: "0 8px 24px rgba(177,69,74,0.25)",
                        transition: "opacity 0.2s",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
                      onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
                    >
                      Confirm Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Step 3: Confirm Details */}
          {step === 3 && (
            <div
              className="animate-in fade-in slide-in-from-right-8 duration-300"
              style={{ background: "#fff", borderRadius: 28, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}
            >
              <h3
                style={{
                  margin: "0 0 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "var(--secondary-color)",
                  fontSize: 24,
                  fontFamily: "var(--playfair-display)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", transform: "translateY(-1px)" }}>
                  <CheckCircle size={26} color="var(--primary-color)" />
                </div>{" "}
                Final Review
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ padding: 24, borderRadius: 20, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: 14, color: "#64748b", fontWeight: 600 }}>
                        Delivery Address
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 16,
                          color: "var(--secondary-color)",
                          fontWeight: 700,
                          lineHeight: 1.5,
                        }}
                      >
                        {address}
                      </p>
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      style={{
                        color: "var(--primary-color)",
                        background: "none",
                        border: "none",
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Edit
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      paddingTop: 16,
                      borderTop: "1px solid #e2e8f0",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: 14, color: "#64748b", fontWeight: 600 }}>Phone Number</p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 16,
                          color: "var(--secondary-color)",
                          fontWeight: 700,
                          lineHeight: 1.5,
                        }}
                      >
                        {phone}
                      </p>
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      style={{
                        color: "var(--primary-color)",
                        background: "none",
                        border: "none",
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Edit
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      paddingTop: 16,
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: 14, color: "#64748b", fontWeight: 600 }}>
                        Payment Method
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 16,
                          color: "var(--secondary-color)",
                          fontWeight: 700,
                          textTransform: "capitalize",
                        }}
                      >
                        {paymentMethod === "cod" ? "Cash on Delivery" : paymentMethod}
                      </p>
                    </div>
                    <button
                      onClick={() => setStep(2)}
                      style={{
                        color: "var(--primary-color)",
                        background: "none",
                        border: "none",
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>

                <div
                  className="checkout-buttons"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 8,
                    paddingTop: 24,
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <button
                    onClick={() => setStep(2)}
                    disabled={submitting}
                    style={{
                      padding: "16px 24px",
                      borderRadius: 16,
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      color: "#64748b",
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: submitting ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      opacity: submitting ? 0.6 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    <ArrowLeft size={18} /> Back
                  </button>
                  <button
                    onClick={() => handleSubmit()}
                    disabled={submitting || cart.length === 0}
                    style={{
                      padding: "16px 48px",
                      borderRadius: 16,
                      border: "none",
                      background: "var(--primary-color)",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 16,
                      cursor: submitting || cart.length === 0 ? "not-allowed" : "pointer",
                      opacity: submitting || cart.length === 0 ? 0.6 : 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      boxShadow: "0 8px 24px rgba(177,69,74,0.25)",
                      transition: "opacity 0.2s",
                    }}
                  >
                    {submitting && <Loader2 size={20} className="animate-spin" />}
                    Place Order
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Order Summary (Sticky Bento Box) */}
        <div style={{ position: "sticky", top: 120 }}>
          <div style={{ background: "#fff", borderRadius: 28, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}>
            <h3
              style={{
                margin: "0 0 24px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "var(--secondary-color)",
                fontSize: 20,
                fontFamily: "var(--playfair-display)",
              }}
            >
              <ShoppingCart size={20} color="var(--primary-color)" /> Order Summary
            </h3>

            <div
              className="order-summary"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                maxHeight: 400,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {cart.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "#f1f5f9",
                    }}
                  >
                    <img
                      src={item.image || "/assets/food-hub.jpg"}
                      alt={item.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/assets/food-hub.jpg";
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--secondary-color)" }}>
                      {item.name}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>
                      Qty: {item.quantity} {item.variant && `• ${item.variant}`}
                    </p>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 16, color: "var(--primary-color)" }}>
                    ₱{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "1px dashed #e2e8f0", marginTop: 24, paddingTop: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 15,
                  color: "#64748b",
                  marginBottom: 12,
                }}
              >
                <span>Subtotal</span>
                <span style={{ fontWeight: 600, color: "var(--secondary-color)" }}>₱{subtotal}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 15,
                  color: "#64748b",
                  marginBottom: 12,
                }}
              >
                <span>
                  Delivery fee
                  {estimateForCurrent?.distance_km != null && !estimateLoading && (
                    <span style={{ fontSize: 12, color: "#94a3b8" }}> ({estimateForCurrent.distance_km} km)</span>
                  )}
                </span>
                <span style={{ fontWeight: 600, color: "var(--secondary-color)" }}>
                  {estimateLoading ? "…" : estimateForCurrent ? `₱${estimateForCurrent.fee}` : "—"}
                </span>
              </div>
              {estimateLoading && (
                <p style={{ margin: "0 0 12px", fontSize: 11, color: "#94a3b8" }}>Updating delivery fee…</p>
              )}
              {!estimateLoading && estimateForCurrent && (
                <p style={{ margin: "0 0 12px", fontSize: 11, color: "#94a3b8" }}>
                  {estimateForCurrent.source === "pin"
                    ? `Straight-line distance from Suarez Food Hub${
                        estimateForCurrent.distance_km != null ? ` (${estimateForCurrent.distance_km} km)` : ""
                      }.`
                    : estimateForCurrent.source === "town_centroid"
                      ? "Estimated from your saved town — set a pin for an exact fee."
                      : "Flat fee — set a pin or a saved address for distance pricing."}
                </p>
              )}
              {!estimateLoading && estimateError && (
                <p style={{ margin: "0 0 12px", fontSize: 11, color: "#dc2626" }}>
                  Delivery fee unavailable. Please retry the location estimate.
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 24,
                  fontWeight: 900,
                  color: "var(--secondary-color)",
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: 24,
                  marginTop: 4,
                }}
              >
                <span>Total</span>
                <span style={{ color: "var(--primary-color)" }}>
                  {estimateLoading || total == null ? "…" : `₱${total}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {qrModalUrl && (
        <div
          onClick={() => setQrModalUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              padding: 40,
              borderRadius: 32,
              maxWidth: 500,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
            }}
          >
            <button
              onClick={() => setQrModalUrl(null)}
              style={{
                position: "absolute",
                top: 24,
                right: 24,
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#64748b",
              }}
            >
              <X size={20} />
            </button>
            <h3
              style={{
                margin: "0 0 24px",
                fontFamily: "var(--playfair-display)",
                fontSize: 28,
                color: "var(--secondary-color)",
              }}
            >
              Scan to Pay
            </h3>
            <img
              src={qrModalUrl}
              alt="QR Code"
              style={{ width: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: 16 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentOption({
  selected,
  onClick,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "20px",
        borderRadius: 20,
        border: selected ? "2px solid var(--primary-color)" : "1px solid #e2e8f0",
        background: selected ? "rgba(177,69,74,0.02)" : "#fff",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onClick={onClick}
    >
      <input
        type="radio"
        checked={selected}
        onChange={onClick}
        style={{ accentColor: "var(--primary-color)", width: 18, height: 18 }}
      />
      {icon}
      <div>
        <p style={{ margin: 0, fontWeight: 800, color: "var(--secondary-color)", fontSize: 16 }}>{title}</p>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>{subtitle}</p>
      </div>
    </label>
  );
}
