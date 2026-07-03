"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { lookupUsername } from "../actions/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserTypedClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    let loginEmail = username.trim();

    if (!loginEmail.includes("@")) {
      const email = await lookupUsername(loginEmail);
      if (!email) {
        setError("Invalid username or password");
        setLoading(false);
        return;
      }
      loginEmail = email;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  return (
    <>
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium mb-5 text-left">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-xs font-bold text-gray-700 ml-1">Username or Email</label>
          <input
            type="text"
            placeholder="Enter username or email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors bg-white"
          />
        </div>

        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-xs font-bold text-gray-700 ml-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors bg-white pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3.5 rounded-xl bg-[#F08013] text-white font-bold text-sm hover:bg-[#d6700c] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-orange-500/20"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Login
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link href="#" className="text-xs text-gray-500 hover:text-gray-800 transition-colors">
          Forgot password?
        </Link>
      </div>

      <div className="flex items-center gap-3 my-6">
        <div className="h-px bg-gray-200 flex-1"></div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OR</span>
        <div className="h-px bg-gray-200 flex-1"></div>
      </div>

      <Link
        href="/menu"
        className="w-full flex items-center justify-center py-3.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-800 font-bold text-sm hover:bg-gray-100 transition-colors no-underline"
      >
        Continue as Guest
      </Link>

      <p className="mt-6 text-xs text-gray-500 text-center">
        Don't have an account?{" "}
        <Link href="/register" className="text-[#F08013] font-bold no-underline hover:underline">
          Create account
        </Link>
      </p>
    </>
  );
}

export default function Login() {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Blurred Background */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/store1.jpg')" }}
      >
        {/* Dark overlay and blur */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[400px] bg-[#fdfdfd] rounded-[24px] shadow-2xl p-8 text-center">
        <h1 className="text-3xl font-extrabold text-[#F08013] mb-4" style={{ fontFamily: "var(--plus-jakarta-sans)" }}>
          Welcome
        </h1>

        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-[72px] h-[72px] rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center p-2 mb-3">
            <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">ONLINE STORE</span>
        </div>

        <Suspense
          fallback={
            <div className="flex justify-center py-10">
              <Loader2 size={32} className="animate-spin text-brand-500" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
