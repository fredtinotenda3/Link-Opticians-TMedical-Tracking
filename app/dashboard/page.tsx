// PATH: app/dashboard/page.tsx

"use client";

import { useEffect, useState } from "react";
import { getDaysOutstanding, formatUSD } from "@/lib/utils/claims";
import Link from "next/link";
import { isFollowUpDue } from "@/lib/utils/claims";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Claim {
  _id: string;
  claimNumber: string;
  patientName: string;
  medicalAid: string;
  branch: string;
  amount: number;
  partialAmountPaid?: number;
  status: "pending" | "approved" | "paid" | "rejected" | "superseded" | "partial";
  submissionDate: string;
  paidDate?: string;
  rejectionReason?: string;
  followUpDate?: string;
}

// ─── Clickable Stat Card ──────────────────────────────────────────────────────
function StatCard({
  label, sublabel, amount, count, countLabel,
  accent, icon, hint, href,
}: {
  label: string; sublabel: string; amount: number; count: number;
  countLabel: string; accent: string; icon: string; hint: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />
        <div className="px-5 pt-5 pb-4 pl-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{sublabel}</p>
            </div>
            <span className="text-xl">{icon}</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 tabular-nums">{formatUSD(amount)}</p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">{count} {countLabel}</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">{hint}</span>
            </div>
            <span className="text-xs text-gray-300 group-hover:text-gray-500 transition-colors">View →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Clickable Resolved Card ──────────────────────────────────────────────────
function ResolvedCard({
  label, sublabel, amount, count, countLabel,
  icon, accent, hint, href,
}: {
  label: string; sublabel: string; amount: number; count: number;
  countLabel: string; icon: string; accent: string; hint: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />
        <div className="px-5 pt-5 pb-4 pl-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{sublabel}</p>
            </div>
            <span className="text-xl">{icon}</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 tabular-nums">{formatUSD(amount)}</p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">{count} {countLabel}</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">{hint}</span>
            </div>
            <span className="text-xs text-gray-300 group-hover:text-gray-500 transition-colors">View →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Clickable Aging Bar ──────────────────────────────────────────────────────
function AgingBar({
  bucket0, bucket31, bucket60,
}: {
  bucket0: number; bucket31: number; bucket60: number;
}) {
  const total = bucket0 + bucket31 + bucket60 || 1;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
        Aging Breakdown
      </p>
      <div className="flex rounded-full overflow-hidden h-3 gap-0.5">
        <div className="bg-emerald-400 transition-all" style={{ width: `${(bucket0 / total) * 100}%` }} />
        <div className="bg-amber-400 transition-all"  style={{ width: `${(bucket31 / total) * 100}%` }} />
        <div className="bg-red-500 transition-all"    style={{ width: `${(bucket60 / total) * 100}%` }} />
      </div>
      <div className="flex gap-3 mt-3 flex-wrap">
        {[
          { label: "0–30 days",  color: "bg-emerald-400", amount: bucket0,  href: "/claims/category/current"  },
          { label: "31–60 days", color: "bg-amber-400",   amount: bucket31, href: "/claims/category/warning"  },
          { label: "60+ days",   color: "bg-red-500",     amount: bucket60, href: "/claims/category/overdue"  },
        ].map((b) => (
          <Link key={b.label} href={b.href}>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
              <span className={`w-2 h-2 rounded-full ${b.color}`} />
              <span className="text-xs text-gray-500">{b.label}</span>
              <span className="text-xs font-semibold text-gray-800">{formatUSD(b.amount)}</span>
              <span className="text-[10px] text-gray-300 group-hover:text-gray-400">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Clickable Medical Aid Table ──────────────────────────────────────────────
function MedicalAidTable({
  data,
}: {
  data: Record<string, { pending: number; approved: number; partial: number; total: number }>;
}) {
  const sorted = Object.entries(data).sort((a, b) => b[1].total - a[1].total);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
        Outstanding by Medical Aid
      </p>
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400">No outstanding claims</p>
      ) : (
        <div className="space-y-3">
          {sorted.map(([aid, vals]) => {
            const pct = (vals.total / sorted[0][1].total) * 100;
            return (
              <Link key={aid} href={`/claims/category/outstanding?aid=${encodeURIComponent(aid)}`}>
                <div className="group cursor-pointer hover:bg-gray-50 rounded-lg p-1 -mx-1 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{aid}</span>
                    <div className="flex items-center gap-3">
                      {vals.pending  > 0 && <span className="text-xs text-amber-600">{formatUSD(vals.pending)} pending</span>}
                      {vals.approved > 0 && <span className="text-xs text-blue-600">{formatUSD(vals.approved)} approved</span>}
                      {vals.partial  > 0 && <span className="text-xs text-orange-500">{formatUSD(vals.partial)} partial bal.</span>}
                      <span className="text-sm font-bold text-gray-900">{formatUSD(vals.total)}</span>
                      <span className="text-xs text-gray-300 group-hover:text-gray-500">→</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Rejected List ────────────────────────────────────────────────────────────
function RejectedTable({ claims }: { claims: Claim[] }) {
  if (claims.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
          ⚠️ Rejected — Action Required
        </p>
        <Link href="/claims/category/rejected">
          <span className="text-xs text-blue-500 hover:underline cursor-pointer">View all →</span>
        </Link>
      </div>
      <div className="space-y-2">
        {claims.slice(0, 5).map((c) => (
          <Link key={c._id} href={`/claims/${c._id}`}>
            <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-1 -mx-1 transition-colors cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-800">{c.patientName}</p>
                <p className="text-xs text-gray-400">{c.medicalAid} · {c.claimNumber}</p>
                {c.rejectionReason && (
                  <p className="text-xs text-red-500 mt-0.5">&quot;{c.rejectionReason}&quot;</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{formatUSD(c.amount)}</p>
                <p className="text-xs text-blue-500">View →</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [claims, setClaims]   = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/claims")
      .then((r) => r.json())
      .then((j) => { setClaims(j.data || []); setLoading(false); });
  }, []);

  const pending  = claims.filter((c) => c.status === "pending");
  const approved = claims.filter((c) => c.status === "approved");
  const rejected = claims.filter((c) => c.status === "rejected");
  const partial  = claims.filter((c) => c.status === "partial");

  const now = new Date();
  const paidMonth = claims.filter((c) => {
    if (c.status !== "paid" || !c.paidDate) return false;
    const d = new Date(c.paidDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const outstanding = [...pending, ...approved, ...partial];

  const sum = (arr: Claim[]) =>
    arr.reduce((s, c) => {
      if (c.status === "partial" && c.partialAmountPaid) return s + (c.amount - c.partialAmountPaid);
      return s + c.amount;
    }, 0);

  const totalOutstanding = sum(outstanding);

  const bucket0  = outstanding.filter((c) => getDaysOutstanding(c.submissionDate) <= 30);
  const bucket31 = outstanding.filter((c) => { const d = getDaysOutstanding(c.submissionDate); return d > 30 && d <= 60; });
  const bucket60 = outstanding.filter((c) => getDaysOutstanding(c.submissionDate) > 60);

  const byAid: Record<string, { pending: number; approved: number; partial: number; total: number }> = {};
  outstanding.forEach((c) => {
    if (!byAid[c.medicalAid]) byAid[c.medicalAid] = { pending: 0, approved: 0, partial: 0, total: 0 };
    const eff = c.status === "partial" && c.partialAmountPaid ? c.amount - c.partialAmountPaid : c.amount;
    if (c.status === "pending")  byAid[c.medicalAid].pending  += eff;
    if (c.status === "approved") byAid[c.medicalAid].approved += eff;
    if (c.status === "partial")  byAid[c.medicalAid].partial  += eff;
    byAid[c.medicalAid].total += eff;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Claims Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Link Optical · {new Date().toLocaleDateString("en-ZW", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <Link href="/claims/new">
            <button className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
              + New Claim
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Total Outstanding Banner — clickable */}
        <Link href="/claims/category/outstanding">
          <div className="bg-gray-900 text-white rounded-2xl px-7 py-6 flex items-center justify-between hover:bg-gray-800 transition-colors cursor-pointer group">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Total Outstanding</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Pending + Approved + Partial balances — click to drill down</p>
              <p className="text-5xl font-bold mt-3 tabular-nums">{formatUSD(totalOutstanding)}</p>
              <p className="text-sm text-gray-400 mt-2">
                {outstanding.length} active claims across {Object.keys(byAid).length} medical aid{Object.keys(byAid).length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs text-gray-400">{pending.length} pending · {formatUSD(sum(pending))}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-xs text-gray-400">{approved.length} approved · {formatUSD(sum(approved))}</span>
              </div>
              {partial.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-xs text-gray-400">{partial.length} partial bal. · {formatUSD(sum(partial))}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs text-gray-400">{bucket60.length} overdue 60+ days</span>
              </div>
              <span className="text-xs text-gray-500 group-hover:text-gray-300 mt-2">View all outstanding →</span>
            </div>
          </div>
        </Link>

        {/* Row 1: Active Status Cards */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Active Claims — Click any card to drill down
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              label="Pending" sublabel="Submitted to 263, awaiting response"
              amount={sum(pending)} count={pending.length} countLabel="claims"
              accent="bg-amber-400" icon="🕐" hint="263 has not yet responded"
              href="/claims/category/pending"
            />
            <StatCard
              label="Approved" sublabel="263 approved — waiting for payment"
              amount={sum(approved)} count={approved.length} countLabel="claims"
              accent="bg-blue-400" icon="✅" hint="Medical aid owes this money"
              href="/claims/category/approved"
            />
            <StatCard
              label="Partial Balance" sublabel="Partially paid — balance still owed"
              amount={sum(partial)} count={partial.length} countLabel="claims"
              accent="bg-orange-400" icon="⚡" hint="Balance after partial payment"
              href="/claims/category/partial"
            />
            <StatCard
              label="Overdue 60+ Days" sublabel="Outstanding over 60 days"
              amount={sum(bucket60)} count={bucket60.length} countLabel="claims"
              accent="bg-red-500" icon="⚠️" hint="Chase today"
              href="/claims/category/overdue"
            />
          </div>
        </div>

        {/* Row 2: Aging + Medical Aid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AgingBar bucket0={sum(bucket0)} bucket31={sum(bucket31)} bucket60={sum(bucket60)} />
          <MedicalAidTable data={byAid} />
        </div>

        {/* Row 3: Resolved */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Resolved This Month
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResolvedCard
              label="Paid This Month"
              sublabel={`${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()} — confirmed received`}
              amount={paidMonth.reduce((s, c) => s + c.amount, 0)}
              count={paidMonth.length} countLabel="claims paid"
              icon="💰" accent="bg-emerald-500" hint="Revenue collected and confirmed"
              href="/claims/category/paid"
            />
            <ResolvedCard
              label="Rejected" sublabel="Declined by 263 — needs resubmission"
              amount={rejected.reduce((s, c) => s + c.amount, 0)}
              count={rejected.length} countLabel="claims rejected"
              icon="❌" accent="bg-red-400"
              hint={rejected.length > 0 ? "Action needed — resubmit" : "All clear"}
              href="/claims/category/rejected"
            />
          </div>
        </div>

        {/* Follow-up Due Banner */}
        {(() => {
          const dueNow = outstanding.filter((c) => isFollowUpDue(c.submissionDate, c.followUpDate));
          if (dueNow.length === 0) return null;
          return (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-orange-800">
                    ⏰ {dueNow.length} claim{dueNow.length !== 1 ? "s" : ""} need follow-up today
                  </p>
                  <p className="text-xs text-orange-500 mt-0.5">
                    These claims passed their 30-day follow-up date — chase the medical aid
                  </p>
                </div>
                <Link href="/claims/category/followup">
                  <button className="text-xs text-orange-700 border border-orange-300 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors">
                    View all →
                  </button>
                </Link>
              </div>
              <div className="space-y-2">
                {dueNow.slice(0, 3).map((c) => (
                  <Link key={c._id} href={`/claims/${c._id}`}>
                    <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-100 hover:border-orange-200 transition-colors cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{c.patientName}</p>
                        <p className="text-xs text-gray-400">{c.medicalAid} · {c.claimNumber} · {c.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {c.status === "partial" && c.partialAmountPaid
                            ? formatUSD(c.amount - c.partialAmountPaid)
                            : formatUSD(c.amount)}
                        </p>
                        {c.status === "partial" && (
                          <p className="text-[10px] text-orange-500">balance remaining</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
                {dueNow.length > 3 && (
                  <p className="text-xs text-orange-500 text-center pt-1">+{dueNow.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Rejected Action List */}
        {rejected.length > 0 && <RejectedTable claims={rejected} />}

        {/* Footer Nav */}
        <div className="flex gap-3 pt-2">
          <Link href="/claims">
            <button className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              View All Claims →
            </button>
          </Link>
          <Link href="/claims/category/rejected">
            <button className="text-sm text-red-600 border border-red-100 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
              View Rejected →
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}
