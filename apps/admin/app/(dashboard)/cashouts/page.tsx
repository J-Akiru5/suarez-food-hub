"use client";

import { Badge, Button, Card, CardContent, Input } from "@repo/ui";
import { formatCurrency } from "@repo/utils";
import { Banknote, CheckCircle, DollarSign, Loader2, Search, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createBrowserTypedClient } from "@repo/data-access/client";
import { getCashouts, updateCashout } from "@repo/data-access/data/earnings";

type CashoutStatus = "requested" | "approved" | "paid" | "rejected";

interface Cashout {
  id: string;
  rider_id: string;
  amount: number;
  status: CashoutStatus;
  gcash_reference_no?: string | null;
  notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  requested_at: string;
  rider?: { first_name: string; last_name: string; phone: string } | null;
}

export default function CashoutsPage() {
  const supabase = createBrowserTypedClient();
  const [cashouts, setCashouts] = useState<Cashout[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<CashoutStatus | "all">("requested");
  const [gcashRefInput, setGcashRefInput] = useState<Record<string, string>>({});
  const [notesInput, setNotesInput] = useState<Record<string, string>>({});

  const fetchCashouts = useCallback(async () => {
    const data = await getCashouts(supabase);
    const filtered = filter !== "all" ? (data as Cashout[]).filter((c) => c.status === filter) : (data as Cashout[]);
    setCashouts(filtered || []);
    setLoading(false);
  }, [filter, supabase]);

  useEffect(() => {
    fetchCashouts();
  }, [fetchCashouts]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-cashouts")
      .on("postgres_changes", { event: "*", schema: "public", table: "rider_cashouts" }, () => fetchCashouts())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCashouts, supabase]);

  async function processCashout(id: string, status: CashoutStatus) {
    setProcessingId(id);
    const update: Record<string, unknown> = {
      status,
      processed_by: (await supabase.auth.getUser()).data.user?.id,
      processed_at: new Date().toISOString(),
    };
    if (status === "paid" && gcashRefInput[id]) {
      update.gcash_reference_no = gcashRefInput[id];
    }
    if (notesInput[id]) {
      update.notes = notesInput[id];
    }
    await updateCashout(supabase, id, update);
    setProcessingId(null);
    fetchCashouts();
  }

  const tabs: { value: CashoutStatus | "all"; label: string }[] = [
    { value: "requested", label: "Requested" },
    { value: "approved", label: "Approved" },
    { value: "paid", label: "Paid" },
    { value: "rejected", label: "Rejected" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-display">Cashouts</h1>
        <p className="text-sm text-muted-foreground">Manage rider cashout requests</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              filter === t.value
                ? "border-crimson-700 text-crimson-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : cashouts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Banknote className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No cashout requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cashouts.map((c) => {
            const rider = c.rider;
            const riderName = rider ? `${rider.first_name || ""} ${rider.last_name || ""}`.trim() || "Rider" : "Rider";
            return (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{riderName}</span>
                        {rider?.phone && <span className="text-xs text-gray-500">· {rider.phone}</span>}
                      </div>
                      <p className="text-2xl font-bold text-crimson-700">{formatCurrency(c.amount)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Requested {new Date(c.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        className={
                          c.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : c.status === "approved"
                              ? "bg-blue-100 text-blue-800"
                              : c.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {c.status}
                      </Badge>
                    </div>
                  </div>

                  {c.status === "requested" && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      <Input
                        placeholder="GCash ref no (required for paid)"
                        value={gcashRefInput[c.id] || ""}
                        onChange={(e) => setGcashRefInput((p) => ({ ...p, [c.id]: e.target.value }))}
                      />
                      <Input
                        placeholder="Notes / remarks (optional)"
                        value={notesInput[c.id] || ""}
                        onChange={(e) => setNotesInput((p) => ({ ...p, [c.id]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => processCashout(c.id, "paid")}
                          disabled={processingId === c.id}
                        >
                          {processingId === c.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          )}
                          Mark Paid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => processCashout(c.id, "rejected")}
                          disabled={processingId === c.id}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  {c.status === "paid" && c.gcash_reference_no && (
                    <div className="mt-2 text-xs text-gray-500">Ref: {c.gcash_reference_no}</div>
                  )}
                  {c.notes && <div className="mt-1 text-xs text-gray-400 italic">Note: {c.notes}</div>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
