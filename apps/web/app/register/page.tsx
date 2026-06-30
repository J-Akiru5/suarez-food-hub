"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { upsertProfile } from "@repo/data-access/data/profiles";
import { ArrowLeft, ArrowRight, Bike, Loader2, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PH_REGEX = /^(?:\+63|0)9\d{9}$/;

type Role = "customer" | "rider";

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState<"role" | "form">("role");
  const [role, setRole] = useState<Role>("customer");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Rider-specific
  const [vehicleType, setVehicleType] = useState("motorcycle");
  const [plateNumber, setPlateNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserTypedClient();

  const handleRegister = async (e: React.FormEvent) => {
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
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (phone && !PH_REGEX.test(phone.trim())) {
      setError("Enter a valid PH mobile number (e.g. 09123456789)");
      return;
    }
    if (role === "rider") {
      if (!plateNumber.trim()) {
        setError("Plate number is required for riders");
        return;
      }
      if (!licenseNumber.trim()) {
        setError("License number is required for riders");
        return;
      }
    }

    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, role },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const profileData: any = {
        id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        phone: phone || "N/A",
        role,
        is_active: role === "customer",
      };

      if (role === "rider") {
        profileData.rider_status = "pending_approval";
        profileData.vehicle_type = vehicleType;
        profileData.plate_number = plateNumber;
        profileData.license_number = licenseNumber;
        profileData.is_active = false;
      }

      const { error: profileError } = await upsertProfile(supabase, profileData);

      if (profileError) {
        setError("Account created but profile setup failed. Please contact support.");
        setLoading(false);
        return;
      }

      if (role === "rider") {
        // Notify all admins about the new rider application
        try {
          await fetch("/api/riders/notify-new", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rider_id: data.user.id,
              rider_name: `${firstName} ${lastName}`,
            }),
          });
        } catch {}
      }
    }

    if (role === "rider") {
      alert("Your rider application has been submitted! Please wait for admin approval before logging in.");
    }

    router.push(role === "rider" ? "/login" : "/");
    router.refresh();
  };

  if (step === "role") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--color-cream)",
          padding: "20px",
        }}
      >
        <div
          style={{
            backgroundColor: "#fff",
            padding: "48px",
            borderRadius: "36px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
            width: "100%",
            maxWidth: "500px",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--playfair-display)",
              fontSize: "40px",
              color: "var(--secondary-color)",
              marginBottom: "8px",
            }}
          >
            Create Account
          </h2>

          <p
            style={{
              fontFamily: "var(--plus-jakarta-sans)",
              color: "var(--secondary-color)",
              opacity: 0.7,
              marginBottom: "32px",
            }}
          >
            How will you use Suarez Food Hub?
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={() => {
                setRole("customer");
                setStep("form");
              }}
              style={{
                padding: "20px",
                borderRadius: "24px",
                border: "2px solid #e2e8f0",
                background: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 16,
                textAlign: "left",
                fontFamily: "var(--plus-jakarta-sans)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--primary-color)";
                e.currentTarget.style.background = "#fff8f0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.background = "#fff";
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: "rgba(177, 69, 74, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <User size={24} color="var(--primary-color)" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "var(--secondary-color)", fontSize: 16 }}>
                  I'm a Customer
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>I want to order food</p>
              </div>
              <ArrowRight size={20} color="#94a3b8" />
            </button>

            <button
              onClick={() => {
                setRole("rider");
                setStep("form");
              }}
              style={{
                padding: "20px",
                borderRadius: "24px",
                border: "2px solid #e2e8f0",
                background: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 16,
                textAlign: "left",
                fontFamily: "var(--plus-jakarta-sans)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--primary-color)";
                e.currentTarget.style.background = "#fff8f0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.background = "#fff";
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: "rgba(59, 130, 246, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bike size={24} color="#3b82f6" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "var(--secondary-color)", fontSize: 16 }}>I'm a Rider</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>I want to deliver orders</p>
              </div>
              <ArrowRight size={20} color="#94a3b8" />
            </button>
          </div>

          <p
            style={{
              marginTop: "32px",
              fontFamily: "var(--plus-jakarta-sans)",
              color: "var(--secondary-color)",
              opacity: 0.7,
              fontSize: 14,
            }}
          >
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--primary-color)", fontWeight: 600, textDecoration: "none" }}>
              Login here
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-cream)",
        padding: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: "48px",
          borderRadius: "36px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
          width: "100%",
          maxWidth: "500px",
          textAlign: "center",
        }}
      >
        <button
          onClick={() => setStep("role")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#64748b",
            fontSize: 13,
            marginBottom: 16,
            padding: 0,
          }}
        >
          <ArrowLeft size={16} /> Back to role selection
        </button>

        <h2
          style={{
            fontFamily: "var(--playfair-display)",
            fontSize: "36px",
            color: "var(--secondary-color)",
            marginBottom: "8px",
          }}
        >
          {role === "rider" ? "Rider Sign Up" : "Create Account"}
        </h2>

        <p
          style={{
            fontFamily: "var(--plus-jakarta-sans)",
            color: "var(--secondary-color)",
            opacity: 0.7,
            marginBottom: "32px",
            fontSize: 14,
          }}
        >
          {role === "rider" ? "Your application will be reviewed by our team" : "Join Suarez Food Hub today!"}
        </p>

        {error && (
          <div
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              fontSize: 14,
              fontFamily: "var(--plus-jakarta-sans)",
              marginBottom: 20,
              textAlign: "left",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={inputStyle}
          />

          <input
            type="tel"
            placeholder="Phone Number (e.g. 09123456789)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
          />

          {role === "rider" && (
            <>
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16, marginTop: 8 }}>
                <p
                  style={{
                    margin: "0 0 12px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--secondary-color)",
                    textAlign: "left",
                  }}
                >
                  Vehicle Information
                </p>
                <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} style={inputStyle}>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="car">Car</option>
                </select>
                <input
                  type="text"
                  placeholder="Plate Number"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  required
                  style={{ ...inputStyle, marginTop: 12 }}
                />
                <input
                  type="text"
                  placeholder="Driver's License Number"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  required
                  style={{ ...inputStyle, marginTop: 12 }}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "18px",
              borderRadius: "30px",
              backgroundColor: "var(--primary-color)",
              color: "#fff",
              border: "none",
              fontFamily: "var(--plus-jakarta-sans)",
              fontSize: "16px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 8,
              opacity: loading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading && <Loader2 size={20} className="animate-spin" />}
            {role === "rider" ? "Submit Application" : "Create Account"}
          </button>
        </form>

        <p
          style={{
            marginTop: "24px",
            fontFamily: "var(--plus-jakarta-sans)",
            color: "var(--secondary-color)",
            opacity: 0.7,
            fontSize: 14,
          }}
        >
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--primary-color)", fontWeight: 600, textDecoration: "none" }}>
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "14px 20px",
  borderRadius: "30px",
  border: "1px solid rgba(0,0,0,0.1)",
  fontFamily: "var(--plus-jakarta-sans)",
  fontSize: "15px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
