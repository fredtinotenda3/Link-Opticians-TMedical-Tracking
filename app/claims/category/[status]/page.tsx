// PATH: app/claims/category/[status]/page.tsx

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { getDaysOutstanding, getAgingBucket } from "@/lib/utils/claims";
import { formatCurrency } from "@/lib/utils/currency";
import { isFollowUpDue } from "@/lib/utils/claims";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { exportToCSV } from "@/lib/utils/export";
import { useCurrency } from "@/context/CurrencyContext";

// ─── Types ───────────────────────────────────────────────────────────────
interface Claim {
  _id: string;
  claimNumber: string;
  patientName: string;
  medicalAid: string;
  branch: string;
  amount: number;
  currency: "USD" | "ZWG";
  partialAmountPaid?: number;
  status: string;
  submissionDate: string;
  paidDate?: string;
  rejectionReason?: string;
  followUpDate?: string;
}

// ─── Category config ─────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, {
  label: string;
  description: string;
  accent: string;
  icon: string;
  filter: (c: Claim, aid?: string) => boolean;
}> = {
  pending: {
    label: "Pending Claims",
    description: "Submitted to 263 — awaiting approval or rejection",
    accent: "bg-amber-400",
    icon: "🕒",
    filter: (c) => c.status === "pending",
  },
  approved: {
    label: "Approved Claims",
    description: "263 approved — waiting for medical aid to pay",
    accent: "bg-blue-400",
    icon: "✅",
    filter: (c) => c.status === "approved",
  },
  partial: {
    label: "Partial Balance Claims",
    description: "Medical aid paid part of the claim — balance still owed",
    accent: "bg-orange-400",
    icon: "⚡",
    filter: (c) => c.status === "partial",
  },
  overdue: {
    label: "Overdue 60+ Days",
    description: "Claims pending or approved for more than 60 days — needs urgent follow-up",
    accent: "bg-red-500",
    icon: "⚠️",
    filter: (c) =>
      (c.status === "pending" || c.status === "approved" || c.status === "partial") &&
      getDaysOutstanding(c.submissionDate) > 60,
  },
  warning: {
    label: "31–60 Days Outstanding",
    description: "Claims approaching the overdue threshold",
    accent: "bg-amber-500",
    icon: "🔶",
    filter: (c) => {
      const d = getDaysOutstanding(c.submissionDate);
      return (c.status === "pending" || c.status === "approved" || c.status === "partial") && d > 30 && d <= 60;
    },
  },
  current: {
    label: "0–30 Days Outstanding",
    description: "Recently submitted claims within normal processing window",
    accent: "bg-emerald-400",
    icon: "🟢",
    filter: (c) =>
      (c.status === "pending" || c.status === "approved" || c.status === "partial") &&
      getDaysOutstanding(c.submissionDate) <= 30,
  },
  rejected: {
    label: "Rejected Claims",
    description: "Declined by 263 — requires resubmission",
    accent: "bg-red-400",
    icon: "❌",
    filter: (c) => c.status === "rejected",
  },
  paid: {
    label: "Paid Claims",
    description: "Fully paid claims — revenue confirmed",
    accent: "bg-emerald-500",
    icon: "💰",
    filter: (c) => c.status === "paid",
  },
  outstanding: {
    label: "All Outstanding",
    description: "All active claims — pending, approved, and partial balances",
    accent: "bg-gray-700",
    icon: "📊",
    filter: (c, aid) => {
      const isActive = c.status === "pending" || c.status === "approved" || c.status === "partial";
      if (aid) return isActive && c.medicalAid === aid;
      return isActive;
    },
  },
  followup: {
    label: "Follow-up Due",
    description: "Claims that have passed their 30-day follow-up date",
    accent: "bg-orange-500",
    icon: "⏰",
    filter: (c) =>
      (c.status === "pending" || c.status === "approved" || c.status === "partial") &&
      isFollowUpDue(c.submissionDate, c.followUpDate),
  },
};

const AGING_COLORS: Record<string, string> = {
  current:  "text-green-600",
  warning:  "text-yellow-600 font-semibold",
  critical: "text-red-600 font-bold",
};

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-800",
  approved:   "bg-blue-100 text-blue-800",
  rejected:   "bg-red-100 text-red-800",
  paid:       "bg-green-100 text-green-800",
  partial:    "bg-orange-100 text-orange-800",
  superseded: "bg-gray-100 text-gray-400",
};

// ─── Analytics Card ──────────────────────────────────────────────────────
function AnalyticCard({
  label, value, sub, accent,
}: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className={`bg-white rounded-xl border-l-4 ${accent} border border-gray-100 shadow-sm p-4`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main Category Page ──────────────────────────────────────────────────
export default function CategoryPage() {
  const { status } = useParams<{ status: string }>();
  const searchParams = useSearchParams();
  const aid = searchParams.get("aid") || undefined;
  const urlCurrency = searchParams.get("currency");
  const { currency: contextCurrency } = useCurrency();
  const router = useRouter();

  // Use URL currency if provided, otherwise use context currency
  const activeCurrency = (urlCurrency as "USD" | "ZWG") || contextCurrency;

  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"days" | "amount" | "date">("days");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const config = CATEGORY_CONFIG[status] || CATEGORY_CONFIG.outstanding;

  // Fetch claims filtered by currency
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("currency", activeCurrency);
    fetch(`/api/claims?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => { setAllClaims(j.data || []); setLoading(false); });
  }, [activeCurrency]);

  // Filter claims for this category AND by currency
  const claims = useMemo(
    () => allClaims.filter((c) => config.filter(c, aid) && c.currency === activeCurrency),
    [allClaims, status, aid, activeCurrency]
  );

  // Effective amount helper
  const effectiveAmount = (c: Claim) =>
    c.status === "partial" && c.partialAmountPaid ? c.amount - c.partialAmountPaid : c.amount;

  // Analytics
  const totalAmount    = claims.reduce((s, c) => s + effectiveAmount(c), 0);
  const avgDays        = claims.length
    ? Math.round(claims.reduce((s, c) => s + getDaysOutstanding(c.submissionDate), 0) / claims.length)
    : 0;
  const oldest         = claims.length
    ? Math.max(...claims.map((c) => getDaysOutstanding(c.submissionDate)))
    : 0;
  const largest        = claims.length
    ? Math.max(...claims.map((c) => effectiveAmount(c)))
    : 0;

  // By medical aid chart data
  const byAidData = useMemo(() => {
    const map: Record<string, number> = {};
    claims.forEach((c) => {
      map[c.medicalAid] = (map[c.medicalAid] || 0) + effectiveAmount(c);
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount: parseFloat(amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount);
  }, [claims]);

  // Submission trend (last 30 days)
  const trendData = useMemo(() => {
    const map: Record<string, number> = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      map[key] = 0;
    }
    claims.forEach((c) => {
      const key = new Date(c.submissionDate).toISOString().split("T")[0];
      if (key in map) map[key]++;
    });
    return Object.entries(map).map(([date, count]) => ({
      date: date.slice(5), // MM-DD
      count,
    }));
  }, [claims]);

  // Sorted claims
  const sorted = useMemo(() => {
    return [...claims].sort((a, b) => {
      let aVal = 0, bVal = 0;
      if (sortBy === "days") {
        aVal = getDaysOutstanding(a.submissionDate);
        bVal = getDaysOutstanding(b.submissionDate);
      } else if (sortBy === "amount") {
        aVal = effectiveAmount(a);
        bVal = effectiveAmount(b);
      } else {
        aVal = new Date(a.submissionDate).getTime();
        bVal = new Date(b.submissionDate).getTime();
      }
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [claims, sortBy, sortDir]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Loading {activeCurrency} claims...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <Link href="/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</Link>
            <span>›</span>
            <span className="text-gray-700 font-medium">{config.label}</span>
            {aid && (
              <>
                <span>›</span>
                <span className="text-gray-700 font-medium">{aid}</span>
              </>
            )}
            <span>›</span>
            <span className="text-gray-700 font-medium">{activeCurrency}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{config.icon}</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{config.label} ({activeCurrency})</h1>
                <p className="text-xs text-gray-400 mt-0.5">{config.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(sorted, `link-${status}-${activeCurrency}-claims-${new Date().toISOString().split("T")[0]}.csv`)}
              >
                Export CSV
              </Button>
              <Link href="/claims/new">
                <Button size="sm">+ New Claim</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── Level 2 Analytics ── */}
        {claims.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Category Analysis — {claims.length} claims in {activeCurrency}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <AnalyticCard
                label="Total Amount"
                value={formatCurrency(totalAmount, activeCurrency)}
                sub={`across ${claims.length} claims`}
                accent="border-gray-700"
              />
              <AnalyticCard
                label="Avg Days Outstanding"
                value={`${avgDays}d`}
                sub="average across all claims"
                accent={avgDays > 60 ? "border-red-500" : avgDays > 30 ? "border-amber-400" : "border-emerald-400"}
              />
              <AnalyticCard
                label="Oldest Claim"
                value={`${oldest}d`}
                sub="longest outstanding claim"
                accent={oldest > 60 ? "border-red-500" : "border-amber-400"}
              />
              <AnalyticCard
                label="Largest Claim"
                value={formatCurrency(largest, activeCurrency)}
                sub="highest single claim"
                accent="border-blue-400"
              />
            </div>
          </div>
        )}

        {/* ── Charts ── */}
        {claims.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* By Medical Aid */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                Amount by Medical Aid ({activeCurrency})
              </p>
              {byAidData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byAidData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${activeCurrency === "USD" ? "$" : "ZWG "}${v}`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v, activeCurrency)} />
                    <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Submission Trend */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                Submission Trend — Last 30 Days ({activeCurrency})
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

          </div>
        )}

        {/* ── Claims Table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">
              {sorted.length} claim{sorted.length !== 1 ? "s" : ""}
              {aid ? ` · ${aid}` : ""}
              {` · ${activeCurrency}`}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Sort by</span>
              <Select
                defaultValue="days"
                onValueChange={(v) => setSortBy(v as "days" | "amount" | "date")}
              >
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days outstanding</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="date">Date submitted</SelectItem>
                </SelectContent>
              </Select>
              <Select
                defaultValue="desc"
                onValueChange={(v) => setSortDir(v as "desc" | "asc")}
              >
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">High → Low</SelectItem>
                  <SelectItem value="asc">Low → High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-400 text-sm">No {activeCurrency} claims in this category</p>
              <Link href="/dashboard">
                <p className="text-xs text-blue-500 hover:underline mt-2 cursor-pointer">← Back to dashboard</p>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Claim #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Patient</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Medical Aid</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Branch</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount ({activeCurrency})</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Submitted</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Days Out</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((claim) => {
                    const days   = getDaysOutstanding(claim.submissionDate, claim.paidDate);
                    const bucket = getAgingBucket(days);
                    const isDue  = isFollowUpDue(claim.submissionDate, claim.followUpDate) &&
                      (claim.status === "pending" || claim.status === "approved" || claim.status === "partial");
                    return (
                      <tr
                        key={claim._id}
                        onClick={() => router.push(`/claims/${claim._id}`)}
                        className={`border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors ${isDue ? "bg-orange-50" : ""}`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{claim.claimNumber}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{claim.patientName}</p>
                          {isDue && <p className="text-[10px] text-orange-500">⏰ Follow-up due</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{claim.medicalAid}</td>
                        <td className="px-4 py-3 text-gray-600">{claim.branch}</td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(effectiveAmount(claim), activeCurrency)}</p>
                          {claim.partialAmountPaid && (
                            <p className="text-[10px] text-orange-500">bal. of {formatCurrency(claim.amount, activeCurrency)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(claim.submissionDate).toLocaleDateString()}
                        </td>
                        <td className={`px-4 py-3 font-semibold text-sm ${AGING_COLORS[bucket]}`}>{days}d</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[claim.status] || ""}`}>
                            {claim.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Back nav */}
        <div className="flex gap-3">
          <Link href="/dashboard">
            <button className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              ← Dashboard
            </button>
          </Link>
          <Link href={`/claims?currency=${activeCurrency}`}>
            <button className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              All Claims ({activeCurrency})
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}