"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

const PH_REGEX = /^(?:\+63|0)9\d{9}$/;

export default function Register() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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

    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName,
        phone: phone || "N/A",
        address: address || "N/A",
        role: "customer",
      });

      if (profileError) {
        setError(`Profile setup failed: ${profileError.message || JSON.stringify(profileError)}`);
        setLoading(false);
        return;
      }
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-creamson)',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '64px',
        borderRadius: '36px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        width: '100%',
        maxWidth: '500px',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontFamily: 'var(--playfair-display)',
          fontSize: '48px',
          color: 'var(--secondary-color)',
          marginBottom: '16px'
        }}>Create Account</h2>

        <p style={{
          fontFamily: 'var(--plus-jakarta-sans)',
          color: 'var(--secondary-color)',
          opacity: 0.8,
          marginBottom: '32px'
        }}>Join Suarez Food Hub today!</p>

        {error && (
          <div style={{
            padding: '12px 20px',
            borderRadius: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: 14,
            fontFamily: 'var(--plus-jakarta-sans)',
            marginBottom: 20,
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            style={{
              padding: '16px 24px',
              borderRadius: '30px',
              border: '1px solid rgba(0,0,0,0.1)',
              fontFamily: 'var(--plus-jakarta-sans)',
              fontSize: '16px',
              outline: 'none'
            }}
          />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: '16px 24px',
              borderRadius: '30px',
              border: '1px solid rgba(0,0,0,0.1)',
              fontFamily: 'var(--plus-jakarta-sans)',
              fontSize: '16px',
              outline: 'none'
            }}
          />
          <input
            type="password"
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            style={{
              padding: '16px 24px',
              borderRadius: '30px',
              border: '1px solid rgba(0,0,0,0.1)',
              fontFamily: 'var(--plus-jakarta-sans)',
              fontSize: '16px',
              outline: 'none'
            }}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{
              padding: '16px 24px',
              borderRadius: '30px',
              border: '1px solid rgba(0,0,0,0.1)',
              fontFamily: 'var(--plus-jakarta-sans)',
              fontSize: '16px',
              outline: 'none'
            }}
          />
          <input
            type="tel"
            placeholder="Phone Number (e.g. 09123456789)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              padding: '16px 24px',
              borderRadius: '30px',
              border: '1px solid rgba(0,0,0,0.1)',
              fontFamily: 'var(--plus-jakarta-sans)',
              fontSize: '16px',
              outline: 'none'
            }}
          />
          <input
            type="text"
            placeholder="Delivery Address (optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            style={{
              padding: '16px 24px',
              borderRadius: '30px',
              border: '1px solid rgba(0,0,0,0.1)',
              fontFamily: 'var(--plus-jakarta-sans)',
              fontSize: '16px',
              outline: 'none'
            }}
          />

          <button type="submit" disabled={loading} style={{
            padding: '20px',
            borderRadius: '36px',
            backgroundColor: 'var(--primary-color)',
            color: '#fff',
            border: 'none',
            fontFamily: 'var(--plus-jakarta-sans)',
            fontSize: '18px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '10px',
            opacity: loading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}>
            {loading && <Loader2 size={20} className="animate-spin" />}
            Register
          </button>
        </form>

        <p style={{
          marginTop: '32px',
          fontFamily: 'var(--plus-jakarta-sans)',
          color: 'var(--secondary-color)',
          opacity: 0.8
        }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'none' }}>Login here</Link>
        </p>
      </div>
    </div>
  );
}
