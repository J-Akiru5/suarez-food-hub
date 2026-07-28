"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { Bike, Loader2, Mail, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

const PH_REGEX = /^(?:\+63|0)9\d{9}$/;

export default function StaffRidersPage() {
  const _router = useRouter();
  const supabase = createBrowserTypedClient();
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("motorcycle");
  const [plateNumber, setPlateNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchRiders = async () => {
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, email, phone, username, rider_status, vehicle_type, plate_number, license_number, created_at",
      )
      .eq("role", "rider")
      .order("created_at", { ascending: false });
    setRiders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRiders();
  }, [fetchRiders]);

  async function handleCreateRider(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !username.trim() || !password.trim()) {
      setFormError("All fields are required");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }
    if (phone && !PH_REGEX.test(phone.trim())) {
      setFormError("Enter a valid PH mobile number (e.g. 09123456789)");
      return;
    }
    if (!plateNumber.trim()) {
      setFormError("Plate number is required");
      return;
    }
    if (!licenseNumber.trim()) {
      setFormError("License number is required");
      return;
    }

    setSubmitting(true);

    try {
      // Create auth user via API
      const res = await fetch("/api/riders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim(),
          phone: phone.trim() || "N/A",
          vehicle_type: vehicleType,
          plate_number: plateNumber.trim(),
          license_number: licenseNumber.trim(),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setFormError(data.error || "Failed to create rider");
        setSubmitting(false);
        return;
      }

      Swal.fire({
        icon: "success",
        title: "Rider Created",
        text: `Rider account for ${firstName} ${lastName} has been created. They will need admin approval to start delivering.`,
        timer: 3000,
        showConfirmButton: false,
      });

      // Reset form
      setShowForm(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setUsername("");
      setPassword("");
      setPhone("");
      setPlateNumber("");
      setLicenseNumber("");
      fetchRiders();
    } catch (err: any) {
      setFormError(err.message || "Failed to create rider");
    }
    setSubmitting(false);
  }

  const statusDot = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500";
      case "occupied":
        return "bg-orange-500";
      case "pending_approval":
        return "bg-yellow-500";
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Riders</h1>
          <p className="text-sm text-muted-foreground">Register and manage delivery riders</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-colors border-none cursor-pointer"
        >
          {showForm ? "Cancel" : "+ Register Rider"}
        </button>
      </div>

      {/* Registration Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-bold text-lg font-display mb-4">Register New Rider</h2>
          {formError && (
            <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium mb-4">
              {formError}
            </div>
          )}
          <form onSubmit={handleCreateRider} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09123456789"
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Vehicle Type</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
              >
                <option value="motorcycle">Motorcycle</option>
                <option value="bicycle">Bicycle</option>
                <option value="car">Car</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Plate Number</label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">License Number</label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end mt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-colors border-none cursor-pointer disabled:opacity-70 flex items-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Rider Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Riders List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : riders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Bike className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-muted-foreground">No riders registered yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Rider
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                    Contact
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    Vehicle
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {riders.map((rider) => (
                  <tr key={rider.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs">
                          {rider.first_name?.[0]}
                          {rider.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {rider.first_name} {rider.last_name}
                          </p>
                          <p className="text-xs text-gray-400">@{rider.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="space-y-0.5">
                        <p className="text-xs flex items-center gap-1">
                          <Mail className="h-3 w-3 text-gray-400" /> {rider.email}
                        </p>
                        <p className="text-xs flex items-center gap-1">
                          <Phone className="h-3 w-3 text-gray-400" /> {rider.phone}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs capitalize">{rider.vehicle_type || "—"}</p>
                      <p className="text-xs text-gray-400">Plate: {rider.plate_number || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${statusDot(rider.rider_status)}`} />
                        <span className="text-xs capitalize">{rider.rider_status?.replace(/_/g, " ") || "—"}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
