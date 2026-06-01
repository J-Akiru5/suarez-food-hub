"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@repo/ui";
import { Input } from "@repo/ui";
import { Shield, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
        setError("You do not have admin access. Please contact the administrator.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-gradient-to-b from-brand-50 to-white">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-brand-500 flex items-center justify-center">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-600">
              SFH Admin
            </h1>
            <p className="text-xs text-muted-foreground">
              Management Dashboard
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-brand-100">
          <h2 className="text-xl font-bold mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Sign in to your admin account
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="admin@suarezfoodhub.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-600 text-white"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
