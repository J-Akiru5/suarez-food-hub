"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createBrowserTypedClient } from "@repo/data-access/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserTypedClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
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

      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: "16px 24px",
            borderRadius: "30px",
            border: "1px solid rgba(0,0,0,0.1)",
            fontFamily: "var(--plus-jakarta-sans)",
            fontSize: "16px",
            outline: "none",
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            padding: "16px 24px",
            borderRadius: "30px",
            border: "1px solid rgba(0,0,0,0.1)",
            fontFamily: "var(--plus-jakarta-sans)",
            fontSize: "16px",
            outline: "none",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "20px",
            borderRadius: "36px",
            backgroundColor: "var(--primary-color)",
            color: "#fff",
            border: "none",
            fontFamily: "var(--plus-jakarta-sans)",
            fontSize: "18px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            marginTop: "10px",
            opacity: loading ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {loading && <Loader2 size={20} className="animate-spin" />}
          Login
        </button>
      </form>

      <p
        style={{
          marginTop: "32px",
          fontFamily: "var(--plus-jakarta-sans)",
          color: "var(--secondary-color)",
          opacity: 0.8,
        }}
      >
        Don&apos;t have an account?{" "}
        <Link href="/register" style={{ color: "var(--primary-color)", fontWeight: 600, textDecoration: "none" }}>
          Register here
        </Link>
      </p>

      <Link
        href="/"
        style={{
          display: "block",
          marginTop: "16px",
          fontFamily: "var(--plus-jakarta-sans)",
          color: "var(--secondary-color)",
          opacity: 0.6,
          textDecoration: "underline",
        }}
      >
        Back to Home
      </Link>
    </>
  );
}

export default function Login() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-creamson)",
        padding: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: "64px",
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
            fontSize: "48px",
            color: "var(--secondary-color)",
            marginBottom: "16px",
          }}
        >
          Welcome Back
        </h2>

        <p
          style={{
            fontFamily: "var(--plus-jakarta-sans)",
            color: "var(--secondary-color)",
            opacity: 0.8,
            marginBottom: "32px",
          }}
        >
          Login to Suarez Food Hub
        </p>

        <Suspense
          fallback={
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
              <Loader2 size={32} className="animate-spin" style={{ color: "var(--primary-color)" }} />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
