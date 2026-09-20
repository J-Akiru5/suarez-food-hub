"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getProfileRole } from "@repo/data-access/data/profiles";
import { Eye, EyeOff, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createBrowserTypedClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const loginEmail = email.trim();

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (authError) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    if (data.user) {
      const profile = await getProfileRole(supabase, data.user.id);

      if (profile?.role !== "rider") {
        setError("Access denied. Rider account required.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      if (profile.rider_status === "rejected") {
        setError("Your rider application was rejected. Please contact support.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      if (profile.is_active === false && profile.rider_status === "pending_approval") {
        setError("Application received — you can sign in once an admin approves it.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      if (profile.is_active === false) {
        setError("Your account is pending admin approval. Please wait for confirmation.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      // offline status is allowed — rider won't appear in assignment dropdown but can still log in
    }

    // Login succeeded — redirect to dashboard
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-500 to-brand-700 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <Truck className="w-10 h-10 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-white">SFH Rider</h1>
          <p className="text-brand-100 mt-1">Suarez Food Hub Delivery</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 text-center">Sign In</h2>

          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

          <div>
            <label suppressHydrationWarning className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label suppressHydrationWarning className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition pr-12"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="text-center mt-6 space-y-2">
          <p className="text-brand-100 text-sm">Delivery Rider Portal</p>
          <p className="text-brand-100 text-xs">
            New rider?{" "}
            <Link
              href={
                process.env.NEXT_PUBLIC_WEB_URL
                  ? `${process.env.NEXT_PUBLIC_WEB_URL}/register?role=rider`
                  : process.env.NODE_ENV !== "production"
                    ? "http://localhost:3000/register?role=rider"
                    : "#"
              }
              className={`underline transition-colors ${
                process.env.NEXT_PUBLIC_WEB_URL || process.env.NODE_ENV !== "production"
                  ? "text-brand-200 hover:text-white"
                  : "text-brand-300 cursor-default"
              }`}
            >
              Create an account
            </Link>
          </p>
          {process.env.NEXT_PUBLIC_WEB_URL || process.env.NODE_ENV !== "production" ? (
            <a
              href={process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"}
              className="inline-block text-brand-200 text-xs underline hover:text-white transition-colors"
            >
              &larr; Back to website
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
