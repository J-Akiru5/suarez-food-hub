"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { upsertProfile } from "@repo/data-access/data/profiles";
import { ArrowLeft, Bike, Eye, EyeOff, Loader2, User } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Blurred Background */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat fixed"
        style={{ backgroundImage: "url('/assets/store1.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      </div>

      {/* Register Card */}
      <div className="relative z-10 w-full max-w-[440px] bg-[#fdfdfd] rounded-[24px] shadow-2xl p-8 text-center my-8">
        {step === "form" && (
          <button
            onClick={() => setStep("role")}
            className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 text-xs font-medium bg-transparent border-none cursor-pointer"
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}

        <div className="flex flex-col items-center justify-center mb-6 mt-2">
          <div className="w-[72px] h-[72px] rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center p-2 mb-3">
            <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">
            {step === "role" ? "Create Account" : role === "rider" ? "RIDER REGISTRATION" : "CUSTOMER REGISTRATION"}
          </span>
        </div>

        {step === "role" ? (
          <div className="animate-fadeIn">
            <h1
              className="text-2xl font-extrabold text-[#F08013] mb-2"
              style={{ fontFamily: "var(--plus-jakarta-sans)" }}
            >
              Join Suarez Food Hub
            </h1>
            <p className="text-sm text-gray-500 mb-6">How will you use our platform?</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setRole("customer");
                  setStep("form");
                }}
                className="group flex items-center p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-[#F08013] hover:bg-orange-50/30 transition-all cursor-pointer text-left w-full"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                  <User size={24} className="text-[#F08013]" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="m-0 font-bold text-gray-800 text-[15px]">I'm a Customer</p>
                  <p className="m-0 mt-0.5 text-xs text-gray-400">I want to order food</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setRole("rider");
                  setStep("form");
                }}
                className="group flex items-center p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-[#F08013] hover:bg-orange-50/30 transition-all cursor-pointer text-left w-full"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Bike size={24} className="text-blue-500" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="m-0 font-bold text-gray-800 text-[15px]">I'm a Rider</p>
                  <p className="m-0 mt-0.5 text-xs text-gray-400">I want to deliver orders</p>
                </div>
              </button>
            </div>

            <p className="mt-8 text-xs text-gray-500 text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-[#F08013] font-bold no-underline hover:underline">
                Login here
              </Link>
            </p>
          </div>
        ) : (
          <div className="animate-fadeIn">
            <h1
              className="text-2xl font-extrabold text-[#F08013] mb-6"
              style={{ fontFamily: "var(--plus-jakarta-sans)" }}
            >
              {role === "rider" ? "Rider Details" : "Your Details"}
            </h1>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium mb-5 text-left">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="flex flex-col gap-4 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 ml-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F08013] focus:ring-1 focus:ring-[#F08013] transition-colors bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 ml-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F08013] focus:ring-1 focus:ring-[#F08013] transition-colors bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 ml-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F08013] focus:ring-1 focus:ring-[#F08013] transition-colors bg-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 ml-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 09123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F08013] focus:ring-1 focus:ring-[#F08013] transition-colors bg-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 ml-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F08013] focus:ring-1 focus:ring-[#F08013] transition-colors bg-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none bg-transparent border-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 ml-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F08013] focus:ring-1 focus:ring-[#F08013] transition-colors bg-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none bg-transparent border-none"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {role === "rider" && (
                <div className="mt-2 pt-4 border-t border-gray-100 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 ml-1">Vehicle Type</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F08013] focus:ring-1 focus:ring-[#F08013] transition-colors bg-white"
                    >
                      <option value="motorcycle">Motorcycle</option>
                      <option value="bicycle">Bicycle</option>
                      <option value="car">Car</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 ml-1">Plate Number</label>
                    <input
                      type="text"
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F08013] focus:ring-1 focus:ring-[#F08013] transition-colors bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 ml-1">License Number</label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F08013] focus:ring-1 focus:ring-[#F08013] transition-colors bg-white"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3.5 rounded-xl bg-[#F08013] text-white font-bold text-sm hover:bg-[#d6700c] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-orange-500/20 border-none cursor-pointer"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {role === "rider" ? "Submit Application" : "Create Account"}
              </button>
            </form>

            <p className="mt-6 text-xs text-gray-500 text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-[#F08013] font-bold no-underline hover:underline">
                Login here
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
