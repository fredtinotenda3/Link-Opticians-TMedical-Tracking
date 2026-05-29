// FILE: app/analytics/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { BarChart3, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useCurrency } from "@/context/CurrencyContext";
import Link from "next/link";

interface DashboardMetrics {
  currency: "USD" | "ZWG";
  outstanding: { count: number; amount: number };
  pending: { count: number; amount: number };
  approved: { count: number; amount: number };
  partial: { count: number; amount: number };
  paidThisMonth: { count: number; amount: number };
  rejected: { count: number; amount: number };
  overdue60: { count: number; amount: number };
  followUpDue: { count: number };
  aging: {
    bucket0_30: { count: number; amount: number };
    bucket31_60: { count: number; amount: number };
    bucket60plus: { count: number; amount: number };
  };
  byMedicalAid: Array<{ name: string; pending: number; approved: number; partial: number; total: number; count: number }>;
  byBranch: Array<{ name: string; total: number; count: number; paidAmount: number }>;
  collectionRate: number;
  rejectionRate: number;
  avgPaymentDays: number;
  topRejectionReasons: Array<{ reason: string; count: number }>;
  monthlyTrend: Array<{ month: string; submitted: number; paid: number; rejected: number; amount: number }>;
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function MetricCard({
  label, value, sub, trend, color,
}: { label: string; value: string; sub?: string; trend?: "up" | "down" | "neutral"; color?: string }) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-gray-400";
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 border-l-4 ${color || "border-l-gray-300"}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2 tabular-nums">{value}</p>
      {sub && (
        <div className="flex items-center gap-1 mt-1">
          {trend && <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />}
          <p className="text-xs text-gray-400">{sub}</p>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const { currency } = useCurrency();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/v1/analytics/dashboard?currency=${currency}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setMetrics(j.data);
        else setError(j.error || "Failed to load analytics");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [currency]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm">{error || "No data available"}</p>
          <p className="text-gray-400 text-xs mt-1">Try refreshing or changing the currency filter</p>
        </div>
      </div>
    );
  }

  const agingData = [
    { name: "0–30 days", amount: metrics.aging.bucket0_30.amount, count: metrics.aging.bucket0_30.count, fill: "#10b981" },
    { name: "31–60 days", amount: metrics.aging.bucket31_60.amount, count: metrics.aging.bucket31_60.count, fill: "#f59e0b" },
    { name: "60+ days", amount: metrics.aging.bucket60plus.amount, count: metrics.aging.bucket60plus.count, fill: "#ef4444" },
  ];

  const statusDonut = [
    { name: "Pending", value: metrics.pending.count, color: "#f59e0b" },
    { name: "Approved", value: metrics.approved.count, color: "#6366f1" },
    { name: "Partial", value: metrics.partial.count, color: "#f97316" },
    { name: "60+ Overdue", value: metrics.overdue60.count, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Analytics
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Deep-dive metrics · {currency} · {new Date().toLocaleDateString("en-ZW", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Link href="/reports">
              <button className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                Export Reports →
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* KPI Row 1 */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Key Performance Indicators</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Collection Rate"
              value={`${metrics.collectionRate}%`}
              sub="Paid / (Paid + Rejected)"
              trend={metrics.collectionRate >= 70 ? "up" : "down"}
              color={metrics.collectionRate >= 70 ? "border-l-green-500" : "border-l-red-500"}
            />
            <MetricCard
              label="Rejection Rate"
              value={`${metrics.rejectionRate}%`}
              sub="Rejected / Total submitted"
              trend={metrics.rejectionRate <= 10 ? "up" : "down"}
              color={metrics.rejectionRate <= 10 ? "border-l-green-500" : "border-l-red-500"}
            />
            <MetricCard
              label="Avg. Payment Days"
              value={`${metrics.avgPaymentDays}d`}
              sub="From submission to payment"
              trend={metrics.avgPaymentDays <= 30 ? "up" : metrics.avgPaymentDays <= 60 ? "neutral" : "down"}
              color={metrics.avgPaymentDays <= 30 ? "border-l-green-500" : "border-l-amber-400"}
            />
            <MetricCard
              label="Follow-up Due"
              value={String(metrics.followUpDue.count)}
              sub="Claims needing action today"
              trend={metrics.followUpDue.count === 0 ? "up" : "down"}
              color={metrics.followUpDue.count === 0 ? "border-l-green-500" : "border-l-orange-500"}
            />
          </div>
        </div>

        {/* KPI Row 2 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total Outstanding"
            value={formatCurrency(metrics.outstanding.amount, currency)}
            sub={`${metrics.outstanding.count} active claims`}
            color="border-l-gray-700"
          />
          <MetricCard
            label="Paid This Month"
            value={formatCurrency(metrics.paidThisMonth.amount, currency)}
            sub={`${metrics.paidThisMonth.count} claims`}
            color="border-l-green-500"
          />
          <MetricCard
            label="Overdue 60+ Days"
            value={formatCurrency(metrics.overdue60.amount, currency)}
            sub={`${metrics.overdue60.count} claims — urgent`}
            color="border-l-red-500"
          />
          <MetricCard
            label="Rejected (total)"
            value={formatCurrency(metrics.rejected.amount, currency)}
            sub={`${metrics.rejected.count} claims need resubmission`}
            color="border-l-red-400"
          />
        </div>

        {/* Row: Monthly trend + Status donut */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Monthly Submission Trend ({currency})
            </p>
            {metrics.monthlyTrend.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={metrics.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} />
                  <Line type="monotone" dataKey="submitted" stroke="#6366f1" strokeWidth={2} dot={false} name="Submitted" />
                  <Line type="monotone" dataKey="paid" stroke="#10b981" strokeWidth={2} dot={false} name="Paid" />
                  <Line type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={2} dot={false} name="Rejected" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Outstanding Status Distribution
            </p>
            {statusDonut.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-green-600 font-semibold text-sm">✅ No outstanding claims</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusDonut} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name">
                    {statusDonut.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} claims`, n]} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Row: Aging + by Medical Aid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Outstanding by Aging Bucket ({currency})
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agingData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${currency === "USD" ? "$" : ""}${Math.round(v / 1000)}k`} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v, currency)}
                  labelFormatter={(l) => `${l}`}
                />
                <Bar dataKey="amount" name="Amount" radius={[4, 4, 0, 0]}>
                  {agingData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              {agingData.map((b) => (
                <div key={b.name} className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[10px] text-gray-400">{b.name}</p>
                  <p className="text-sm font-bold text-gray-900">{b.count}</p>
                  <p className="text-[10px] text-gray-500">{formatCurrency(b.amount, currency)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Outstanding by Medical Aid ({currency})
            </p>
            {metrics.byMedicalAid.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No outstanding claims</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={metrics.byMedicalAid.slice(0, 8)} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${currency === "USD" ? "$" : ""}${Math.round(v / 1000)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                  <Bar dataKey="total" name="Outstanding" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Row: By Branch + Top rejection reasons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Outstanding by Branch ({currency})
            </p>
            {metrics.byBranch.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No data</p>
            ) : (
              <div className="space-y-3">
                {metrics.byBranch.map((b) => {
                  const maxAmt = Math.max(...metrics.byBranch.map((x) => x.total), 1);
                  const pct = (b.total / maxAmt) * 100;
                  return (
                    <div key={b.name}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{b.name}</span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(b.total, currency)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[10px] text-gray-400">{b.count} claims</span>
                        <span className="text-[10px] text-green-600">{formatCurrency(b.paidAmount, currency)} collected</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Top Rejection Reasons
            </p>
            {metrics.topRejectionReasons.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-green-600 font-semibold text-sm">✅ No rejections on record</p>
              </div>
            ) : (
              <div className="space-y-2">
                {metrics.topRejectionReasons.slice(0, 8).map((r, i) => {
                  const maxCount = metrics.topRejectionReasons[0]?.count || 1;
                  const pct = (r.count / maxCount) * 100;
                  return (
                    <div key={i}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-700 truncate max-w-[75%]">{r.reason}</span>
                        <span className="text-xs font-bold text-gray-900 shrink-0 ml-2">{r.count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Monthly amount trend */}
        {metrics.monthlyTrend.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Monthly Claim Value ({currency})
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metrics.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${currency === "USD" ? "$" : ""}${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                <Bar dataKey="amount" name="Total Value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </div>
  );
}