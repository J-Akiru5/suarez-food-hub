"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getCashouts, getRiderEarnings } from "@repo/data-access/data/earnings";
import { eachDayOfInterval, endOfWeek, format, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { Banknote, BarChart3, Calendar, DollarSign, Download, Loader2, Plus, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

interface EarningsData {
  today: number;
  week: number;
  month: number;
  total: number;
  available: number;
  pending_amount: number;
  paid_amount: number;
  dailyEarnings: { date: string; amount: number }[];
  recentDeliveries: { id: string; date: string; amount: number; address: string }[];
  cashouts: { id: string; amount: number; status: string; date: string; notes?: string }[];
}

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "quarter", label: "3 Months" },
  { key: "all", label: "All Time" },
] as const;

export default function EarningsPage() {
  const supabase = createBrowserTypedClient();
  const [earnings, setEarnings] = useState<EarningsData>({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    available: 0,
    pending_amount: 0,
    paid_amount: 0,
    dailyEarnings: [],
    recentDeliveries: [],
    cashouts: [],
  });
  const [loading, setLoading] = useState(true);
  const [cashouting, setCashouting] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<string>("today");
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const fetchEarnings = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const quarterStart = subMonths(now, 3);

      const [allRiderEarnings, cashoutData] = await Promise.all([
        getRiderEarnings(supabase, user.id),
        getCashouts(supabase),
      ]);

      const riderCashouts = ((cashoutData as any[]) || []).filter((c: any) => c.rider_id === user.id);
      const allEarnings = allRiderEarnings;

      const recentOrders = allRiderEarnings
        .filter((e: any) => e.order)
        .slice(0, 10)
        .map((e: any) => ({
          id: e.order_id,
          delivery_address: e.order?.delivery_address || "",
          delivered_at: e.order?.delivered_at,
          delivery_fee: e.amount,
        }));

      const totalAmt = allEarnings.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const paidAmt = allEarnings
        .filter((e: any) => e.status === "paid")
        .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const pendingAmt = allEarnings
        .filter((e: any) => e.status === "pending")
        .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

      // Calculate available (pending earnings that haven't been cashouted)
      const cashoutedAmt = riderCashouts
        .filter((c: any) => c.status === "approved" || c.status === "paid")
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
      const available = Math.max(0, pendingAmt - cashoutedAmt);

      // Filter earnings by different periods
      const todayEarningsFiltered = allEarnings.filter((e: any) => new Date(e.earned_at || e.created_at) >= todayStart);
      const weekEarningsFiltered = allEarnings.filter((e: any) => new Date(e.earned_at || e.created_at) >= weekStart);
      const monthEarningsFiltered = allEarnings.filter((e: any) => new Date(e.earned_at || e.created_at) >= monthStart);

      const todayAmt = todayEarningsFiltered.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const weekAmt = weekEarningsFiltered.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const monthAmt = monthEarningsFiltered.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

      const weekDays = eachDayOfInterval({
        start: weekStart,
        end: endOfWeek(now, { weekStartsOn: 1 }),
      });

      const dailyEarnings = weekDays.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayAmt = allEarnings
          .filter((e: any) => format(new Date(e.earned_at || e.created_at), "yyyy-MM-dd") === dayStr)
          .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
        return { date: format(day, "EEE"), amount: dayAmt };
      });

      const recentDeliveries = (recentOrders || []).map((o: any) => ({
        id: o.id,
        date: o.delivered_at ? format(new Date(o.delivered_at), "MMM d") : "—",
        amount: o.delivery_fee || 0,
        address: o.delivery_address,
      }));

      const cashouts = (riderCashouts || []).map((c: any) => ({
        id: c.id,
        amount: c.amount || 0,
        status: c.status || "requested",
        date: c.requested_at ? format(new Date(c.requested_at), "MMM d, yyyy") : "—",
        notes: c.notes || null,
      }));

      setEarnings({
        today: todayAmt,
        week: weekAmt,
        month: monthAmt,
        total: totalAmt,
        available,
        pending_amount: pendingAmt,
        paid_amount: paidAmt,
        dailyEarnings,
        recentDeliveries,
        cashouts,
      });
      setLoading(false);
    };

    fetchEarnings();
  }, [supabase]);

  async function handleCashout() {
    const { value: amount } = await Swal.fire({
      title: "Request Cashout",
      html: `
        <p style="color: #64748b; font-size: 14px; margin-bottom: 12px;">
          Available balance: <strong>₱${earnings.available.toFixed(1)}</strong>
        </p>
        <input
          id="cashout-amount"
          type="number"
          step="0.01"
          min="50"
          max="${earnings.available}"
          placeholder="Amount (min ₱50)"
          style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 16px; outline: none;"
        />
        <p style="color: #94a3b8; font-size: 11px; margin-top: 8px; text-align: left;">
          Funds will be transferred to your registered GCash account.
        </p>
      `,
      showCancelButton: true,
      confirmButtonText: "Request Cashout",
      confirmButtonColor: "#F08013",
      cancelButtonText: "Cancel",
      cancelButtonColor: "#6b7280",
      preConfirm: () => {
        const input = document.getElementById("cashout-amount") as HTMLInputElement;
        const val = parseFloat(input?.value || "0");
        if (!val || val < 50) {
          Swal.showValidationMessage("Minimum cashout is ₱50");
          return false;
        }
        if (val > earnings.available) {
          Swal.showValidationMessage("Amount exceeds available balance");
          return false;
        }
        return val;
      },
    });

    if (!amount) return;

    setCashouting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("rider_cashouts").insert({
      rider_id: user.id,
      amount,
      status: "requested",
    });

    if (error) {
      Swal.fire({ icon: "error", title: "Failed", text: error.message || "Could not request cashout." });
    } else {
      Swal.fire({
        icon: "success",
        title: "Cashout Requested!",
        text: `₱${Number(amount).toFixed(2)} cashout is pending approval.`,
        timer: 3000,
        showConfirmButton: false,
      });
      // Refresh data
      window.location.reload();
    }
    setCashouting(false);
  }

  const maxDaily = Math.max(...earnings.dailyEarnings.map((d) => d.amount), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }

  const statusBadge: Record<string, string> = {
    requested: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  // Get period-filtered total
  const getPeriodTotal = () => {
    switch (periodFilter) {
      case "today":
        return earnings.today;
      case "week":
        return earnings.week;
      case "month":
        return earnings.month;
      case "quarter":
        return earnings.month * 3;
      case "all":
        return earnings.total;
      default:
        return earnings.today;
    }
  };

  const handleDownloadSummary = async () => {
    const lines = [
      "SUAREZ FOOD HUB - Earnings Summary",
      "----------------------------------------",
      `Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}`,
      "",
      `Total: ₱${earnings.total.toFixed(2)}`,
      `Pending: ₱${earnings.pending_amount.toFixed(2)}`,
      `Paid Out: ₱${earnings.paid_amount.toFixed(2)}`,
      `Available: ₱${earnings.available.toFixed(2)}`,
      "",
      `Today: ₱${earnings.today.toFixed(2)}`,
      `This Week (${earnings.dailyEarnings.length} days): ₱${earnings.week.toFixed(2)}`,
      `This Month: ₱${earnings.month.toFixed(2)}`,
      "",
      "RECENT DELIVERIES:",
      ...earnings.recentDeliveries.map((d, i) => `${i + 1}. ${d.address} - ₱${d.amount.toFixed(2)} (${d.date})`),
      "",
      "CASHOUT HISTORY:",
      ...earnings.cashouts.map((c) => `₱${c.amount.toFixed(2)} - ${c.status} (${c.date})`),
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `earnings-summary-${format(new Date(), "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    Swal.fire({
      icon: "success",
      title: "Downloaded!",
      text: "Earnings summary saved.",
      timer: 2000,
      showConfirmButton: false,
      toast: true,
      position: "top-end",
    });
  };

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Period filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {PERIODS.map((period) => (
          <button
            key={period.key}
            onClick={() => setPeriodFilter(period.key)}
            className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              periodFilter === period.key ? "bg-white text-brand-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Hero stat */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl p-5 text-white shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-brand-100">
            {PERIODS.find((p) => p.key === periodFilter)?.label || "Period"} Earnings
          </span>
          <button
            onClick={handleDownloadSummary}
            className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition"
            title="Download summary"
          >
            <Download size={16} />
          </button>
        </div>
        <p className="text-3xl font-bold mt-1">₱{getPeriodTotal().toFixed(2)}</p>
        <p className="text-xs text-brand-200 mt-1">
          {earnings.recentDeliveries.length} delivery{earnings.recentDeliveries.length !== 1 ? "ies" : "y"} completed
        </p>
      </div>

      {/* Available balance + Cashout button */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl p-5 text-white shadow-md">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-brand-100">Available for Cashout</span>
          <Banknote size={20} className="text-brand-200" />
        </div>
        <p className="text-3xl font-bold mb-3">₱{earnings.available.toFixed(2)}</p>
        <button
          onClick={handleCashout}
          disabled={cashouting || earnings.available < 50}
          className="w-full flex items-center justify-center gap-2 bg-white text-brand-700 py-3 rounded-xl font-bold text-sm transition hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cashouting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          {cashouting ? "Processing..." : earnings.available < 50 ? "Min ₱50 to Cashout" : "Request Cashout"}
        </button>
      </div>

      {/* Earnings Breakdown */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
          <p className="text-xs text-amber-600 font-medium">Pending</p>
          <p className="text-lg font-bold text-amber-700">₱{earnings.pending_amount.toFixed(1)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
          <p className="text-xs text-green-600 font-medium">Paid Out</p>
          <p className="text-lg font-bold text-green-700">₱{earnings.paid_amount.toFixed(1)}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
          <p className="text-xs text-blue-600 font-medium">Total</p>
          <p className="text-lg font-bold text-blue-700">₱{earnings.total.toFixed(1)}</p>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">This Week</h3>
        <div className="flex items-end justify-between gap-2 h-48 pt-4">
          {earnings.dailyEarnings.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 h-full">
              <span className="text-xs text-gray-500">{day.amount > 0 ? `₱${day.amount}` : ""}</span>
              <div
                className="w-full max-w-[40px] bg-brand-600 rounded-t-md transition-all"
                style={{
                  height: `${day.amount > 0 ? Math.max((day.amount / maxDaily) * 100, 8) : 4}%`,
                  opacity: day.amount > 0 ? 1 : 0.3,
                }}
              />
              <span className="text-xs text-gray-500 font-medium">{day.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cashout History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
          <Banknote size={16} className="text-brand-500" />
          Cashout History
        </h3>
        {earnings.cashouts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No cashout requests yet</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {earnings.cashouts.map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800">₱{c.amount.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">{c.date}</p>
                  {c.notes && <p className="text-xs text-gray-400 mt-0.5">{c.notes}</p>}
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${
                    statusBadge[c.status] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Deliveries */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Recent Deliveries</h3>
        {earnings.recentDeliveries.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No earnings yet</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {earnings.recentDeliveries.map((d) => (
              <div key={d.id} className="py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 truncate">{d.address}</p>
                  <p className="text-xs text-gray-400">{d.date}</p>
                </div>
                <span className="text-sm font-semibold text-brand-600 ml-3">₱{d.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
