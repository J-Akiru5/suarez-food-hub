"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { Button, Card, CardContent, Input } from "@repo/ui";
import { CheckCircle, Edit, Loader2, Pencil, Shield, Trash2, UserPlus, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "@/lib/use-toast";

interface StaffProfile {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  username?: string;
  is_active: boolean;
  created_at: string;
}

export default function StaffAccountsPage() {
  const _supabase = createBrowserTypedClient();
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Create form
  const [formEmail, setFormEmail] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Edit modal
  const [editStaff, setEditStaff] = useState<StaffProfile | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editSaving, setEditSaving] = useState(false);

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

    if (!formEmail || !formPassword || !formFirstName || !formLastName || !formUsername) {
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
          username: formUsername,
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
        const result = data.data || data;
        setFormSuccess(`Staff account created for ${result.name}`);
        setFormEmail("");
        setFormUsername("");
        setFormPassword("");
        setFormFirstName("");
        setFormLastName("");
        setFormPhone("");
        fetchStaff();
        toast({ title: "Staff created", description: result.name });
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

  function openEdit(staff: StaffProfile) {
    setEditStaff(staff);
    setEditFirstName(staff.first_name || "");
    setEditLastName(staff.last_name || "");
    setEditEmail(staff.email || "");
    setEditPhone(staff.phone || "");
    setEditUsername(staff.username || "");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editStaff) return;
    setEditSaving(true);

    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editStaff.id,
          first_name: editFirstName,
          last_name: editLastName,
          email: editEmail,
          phone: editPhone,
          username: editUsername,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        Swal.fire({ icon: "error", title: "Error", text: data.error || "Failed to update" });
      } else {
        Swal.fire({ icon: "success", title: "Updated", timer: 1500, showConfirmButton: false });
        setEditStaff(null);
        fetchStaff();
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message || "Network error" });
    }

    setEditSaving(false);
  }

  function confirmDelete(staff: StaffProfile) {
    Swal.fire({
      title: `Delete ${staff.first_name} ${staff.last_name}?`,
      text: "This will permanently delete the staff account and all associated data. This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        const res = await fetch(`/api/staff?id=${staff.id}`, { method: "DELETE" });
        const data = await res.json();

        if (!data.success) {
          Swal.fire({ icon: "error", title: "Error", text: data.error || "Failed to delete" });
        } else {
          Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
          fetchStaff();
        }
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Error", text: err.message || "Network error" });
      }
    });
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
                <Input
                  label="Username"
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  required
                />
              </div>
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
                <p className="text-sm text-muted-foreground">Edit, deactivate, or delete staff accounts</p>
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
                  <div key={s.id} className="flex items-center justify-between py-3 gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {s.first_name} {s.last_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{s.phone || "No phone"}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit staff"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(s.id, s.is_active)}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors ${
                          s.is_active
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                        }`}
                      >
                        {s.is_active ? "Active" : "Inactive"}
                      </button>
                      <button
                        onClick={() => confirmDelete(s)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete staff"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      {editStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setEditStaff(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Edit className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Edit Staff</h3>
                  <p className="text-xs text-muted-foreground">
                    {editStaff.first_name} {editStaff.last_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditStaff(null)}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  required
                />
                <Input
                  label="Last Name"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  required
                />
              </div>
              <Input label="Email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              <Input
                label="Username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
              />
              <Input label="Phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setEditStaff(null)}
                  className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white"
                >
                  {editSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
