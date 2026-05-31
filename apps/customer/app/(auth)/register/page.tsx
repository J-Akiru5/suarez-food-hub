"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@repo/ui";
import { Input } from "@repo/ui";
import { Store, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const nameParts = formData.fullName.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      await supabase.from("profiles").insert({
        user_id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        phone: formData.phone || null,
        address: formData.address || null,
        role: "customer",
      });
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-gradient-to-b from-brand-50 to-white">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-brand-500 flex items-center justify-center">
            <Store className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-600">
              Suarez Food Hub
            </h1>
            <p className="text-xs text-muted-foreground">
              Fresh food, fast delivery
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-brand-100">
          <h2 className="text-xl font-bold mb-1">Create account</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Join us and start ordering
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Juan Dela Cruz"
              value={formData.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min. 6 characters"
              value={formData.password}
              onChange={(e) => updateField("password", e.target.value)}
              minLength={6}
              required
            />
            <Input
              label="Phone Number"
              type="tel"
              placeholder="09XX XXX XXXX"
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
            <Input
              label="Delivery Address"
              placeholder="Your default delivery address"
              value={formData.address}
              onChange={(e) => updateField("address", e.target.value)}
            />

            <Button
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-600 text-white"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-600 hover:text-brand-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
