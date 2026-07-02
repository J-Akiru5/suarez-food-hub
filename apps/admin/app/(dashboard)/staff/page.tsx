"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { updateProfile } from "@repo/data-access/data/profiles";
import { Button, Card, CardContent, Input } from "@repo/ui";
import { CheckCircle, Loader2, Shield, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/use-toast";

interface StaffProfile {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

export default function StaffAccountsPage() {
  const supabase = createBrowserTypedClient();
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Create form
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff");
      if (res.ok) {
        const { data } = await res.json();
        setStaffList(data || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setCreating(true);

    if (!formEmail || !formPassword || !formFirstName || !formLastName) {
      setFormError("All fields are required");
      setCreating(false);
      return;
    }

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formEmail,
          password: formPassword,
          firstName: formFirstName,
          lastName: formLastName,
          phone: formPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to create account");
      } else {
        setFormSuccess(`Staff account created for ${data.name}`);
        setFormEmail("");
        setFormPassword("");
        setFormFirstName("");
        setFormLastName("");
        setFormPhone("");
        fetchStaff();
        toast({ title: "Staff created", description: data.name });
      }
    } catch {
      setFormError("Network error. Please try again.");
    }
    setCreating(false);
  }

  async function toggleActive(staffId: string, current: boolean) {
    try {
      await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: staffId, is_active: !current }),
      });
      fetchStaff();
    } catch (e) {
      console.error("Failed to toggle status", e);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-display">Staff Accounts</h1>
        <p className="text-sm text-muted-foreground">Create and manage staff accounts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Form */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-10 w-10 rounded-lg bg-brand-500 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg font-display">Create Staff Account</h2>
                <p className="text-sm text-muted-foreground">Staff can manage orders and update inventory</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
                <CheckCircle className="h-4 w-4 inline mr-1" />
                {formSuccess}
              </div>
            )}

            <form onSubmit={createStaff} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  required
                />
                <Input
                  label="Last Name"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                  required
                />
              </div>
              <Input
                label="Email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
              />
              <Input
                label="Password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                required
              />
              <Input label="Phone (optional)" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
              <Button type="submit" disabled={creating} className="w-full bg-brand-500 hover:bg-brand-600 text-white">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Create Staff Account
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Staff List */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg font-display">Existing Staff ({staffList.length})</h2>
                <p className="text-sm text-muted-foreground">Manage active status of staff accounts</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : staffList.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No staff accounts yet</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {staffList.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">
                        {s.first_name} {s.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{s.phone || "No phone"}</p>
                    </div>
                    <button
                      onClick={() => toggleActive(s.id, s.is_active)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                        s.is_active
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-red-100 text-red-800 hover:bg-red-200"
                      }`}
                    >
                      {s.is_active ? "Active" : "Inactive"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
