// PATH: app/claims/[id]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getDaysOutstanding } from "@/lib/utils/claims";
import { formatCurrency } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RejectDialog } from "@/components/claims/RejectDialog";
import { ResubmitDialog } from "@/components/claims/ResubmitDialog";
import { PartialPaymentDialog } from "@/components/claims/PartialPaymentDialog";
import { FollowUpDialog } from "@/components/claims/FollowUpDialog";
import { DeleteDialog } from "@/components/claims/DeleteDialog";
import { MEDICAL_AIDS, BRANCHES, CURRENCIES } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────
interface Claim {
  _id: string;
  claimNumber: string;
  patientName: string;
  patientId: string;
  medicalAid: string;
  memberNumber: string;
  branch: string;
  amount: number;
  currency: "USD" | "ZWG";
  partialAmountPaid?: number;
  status: string;
  submissionDate: string;
  serviceDate: string;
  paidDate?: string;
  rejectionReason?: string;
  followUpDate?: string;
  notes?: string;
  resubmittedFrom?: string;
  resubmissionCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Status Colors ──────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved:   "bg-blue-100 text-blue-800 border-blue-200",
  rejected:   "bg-red-100 text-red-800 border-red-200",
  paid:       "bg-green-100 text-green-800 border-green-200",
  partial:    "bg-orange-100 text-orange-800 border-orange-200",
  superseded: "bg-gray-100 text-gray-500 border-gray-200",
};

// ─── Timeline Step ──────────────────────────────────────────────────────
function TimelineStep({
  label, date, done, active, color,
}: {
  label: string; date?: string; done: boolean; active: boolean; color: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full border-2 mt-0.5 ${done || active ? color : "border-gray-200 bg-white"}`} />
        <div className="w-0.5 h-8 bg-gray-100 mt-1" />
      </div>
      <div>
        <p className={`text-sm font-medium ${done || active ? "text-gray-800" : "text-gray-300"}`}>{label}</p>
        {date && <p className="text-xs text-gray-400">{new Date(date).toLocaleDateString()}</p>}
        {active && !date && <p className="text-xs text-orange-400">Current state</p>}
      </div>
    </div>
  );
}

// ─── Info Row ───────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

// ─── Main Claim Detail Page ─────────────────────────────────────────────
export default function ClaimDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const [claim, setClaim]     = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState<any>(null);

  async function fetchClaim() {
    const res  = await fetch(`/api/claims/${id}`);
    const json = await res.json();
    const c    = json.data;
    setClaim(c);
    setForm({
      ...c,
      serviceDate:    c.serviceDate?.split("T")[0] || "",
      submissionDate: c.submissionDate?.split("T")[0] || "",
      currency:       c.currency || "USD",
    });
    setLoading(false);
  }

  useEffect(() => { fetchClaim(); }, [id]);

  function setField(field: string, value: string) {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const payload: any = { ...form };
    if (form.currency === "USD") {
      payload.amount = parseFloat(form.amount);
      payload.amountZWG = undefined;
    } else {
      payload.amountZWG = parseFloat(form.amount);
      payload.amount = 0;
    }
    await fetch(`/api/claims/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setEditing(false);
    fetchClaim();
  }

  async function updateStatus(status: string) {
    const body: any = { status };
    if (status === "paid") body.paidDate = new Date().toISOString();
    await fetch(`/api/claims/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    fetchClaim();
  }

  if (loading || !claim) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Loading claim...</p>
      </div>
    );
  }

  const days            = getDaysOutstanding(claim.submissionDate, claim.paidDate);
  const effectiveAmount = claim.status === "partial" && claim.partialAmountPaid
    ? claim.amount - claim.partialAmountPaid
    : claim.amount;
  const balanceWrittenOff = claim.partialAmountPaid
    ? claim.amount - claim.partialAmountPaid
    : 0;

  // Timeline steps
  const timeline = [
    { label: "Service Provided",   date: claim.serviceDate,    done: true,                             active: false, color: "border-gray-500 bg-gray-500" },
    { label: "Claim Submitted",    date: claim.submissionDate, done: true,                             active: false, color: "border-blue-500 bg-blue-500" },
    { label: "Approved by 263",    date: claim.status === "approved" || claim.status === "paid" || claim.status === "partial" ? claim.submissionDate : undefined,
      done: ["approved", "paid", "partial"].includes(claim.status), active: claim.status === "approved", color: "border-blue-500 bg-blue-500" },
    { label: "Payment Received",   date: claim.paidDate,
      done: claim.status === "paid" || claim.status === "partial", active: false,                      color: "border-green-500 bg-green-500" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <Link href="/dashboard" className="hover:text-gray-600">Dashboard</Link>
            <span>›</span>
            <Link href="/claims" className="hover:text-gray-600">Claims</Link>
            <span>›</span>
            <span className="text-gray-700 font-mono font-medium">{claim.claimNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">{claim.patientName}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[claim.status] || ""}`}>
                  {claim.status}
                </span>
                {claim.resubmissionCount && claim.resubmissionCount > 0 && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    Resubmission #{claim.resubmissionCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{claim.claimNumber} · {claim.medicalAid} · {claim.branch}</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Edit Claim
                </Button>
              )}
              {editing && (
                <>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm({ ...claim, serviceDate: claim.serviceDate?.split("T")[0] || "", submissionDate: claim.submissionDate?.split("T")[0] || "" }); }}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ── Level 3 Analytics ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Claim Analysis
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Claim Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(claim.amount, claim.currency)}</p>
              {claim.partialAmountPaid && (
                <>
                  <p className="text-xs text-green-600 mt-0.5">Paid: {formatCurrency(claim.partialAmountPaid, claim.currency)}</p>
                  <p className="text-xs text-orange-500">Balance: {formatCurrency(effectiveAmount, claim.currency)}</p>
                </>
              )}
            </div>
            <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 border-l-4 ${days > 60 ? "border-l-red-500" : days > 30 ? "border-l-amber-400" : "border-l-emerald-400"}`}>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Days Outstanding</p>
              <p className={`text-2xl font-bold mt-1 ${days > 60 ? "text-red-600" : days > 30 ? "text-amber-600" : "text-emerald-600"}`}>{days}d</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {days > 60 ? "⚠️ Overdue — chase today" : days > 30 ? "Approaching overdue" : "Within normal window"}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Service Date</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{new Date(claim.serviceDate).toLocaleDateString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">Submission: {new Date(claim.submissionDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Member</p>
              <p className="text-lg font-bold text-gray-900 mt-1 font-mono">{claim.memberNumber}</p>
              <p className="text-xs text-gray-400 mt-0.5">VP ID: {claim.patientId}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* ── Left: Timeline + Payment Breakdown ── */}
          <div className="space-y-4">

            {/* Claim Lifecycle Timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                Claim Lifecycle
              </p>
              <div>
                {timeline.map((step, i) => (
                  <TimelineStep key={i} {...step} />
                ))}
                {/* Rejected state */}
                {claim.status === "rejected" && (
                  <div className="flex items-start gap-3 -mt-2">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full border-2 border-red-500 bg-red-500 mt-0.5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-600">Rejected</p>
                      {claim.rejectionReason && (
                        <p className="text-xs text-red-400 mt-0.5">{claim.rejectionReason}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Payment Breakdown ({claim.currency})
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Original claim</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(claim.amount, claim.currency)}</span>
                </div>
                {claim.partialAmountPaid ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Amount paid</span>
                      <span className="text-sm font-semibold text-green-600">{formatCurrency(claim.partialAmountPaid, claim.currency)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm text-gray-500">Balance written off</span>
                      <span className="text-sm font-semibold text-red-500">{formatCurrency(balanceWrittenOff, claim.currency)}</span>
                    </div>
                  </>
                ) : claim.status === "paid" ? (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Paid in full</span>
                    <span className="text-sm font-semibold text-green-600">{formatCurrency(claim.amount, claim.currency)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm text-gray-500">Outstanding</span>
                    <span className="text-sm font-semibold text-orange-600">{formatCurrency(claim.amount, claim.currency)}</span>
                  </div>
                )}
                {claim.paidDate && (
                  <p className="text-xs text-gray-400 mt-1">
                    Paid on {new Date(claim.paidDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* ── Center + Right: Details + Actions ── */}
          <div className="md:col-span-2 space-y-4">

            {/* Claim Details — view or edit */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                Claim Details {editing && <span className="text-blue-400 normal-case ml-1">— editing</span>}
              </p>

              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Claim Number</Label>
                    <Input value={form.claimNumber} onChange={(e) => setField("claimNumber", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Currency</Label>
                    <Select onValueChange={(v) => setField("currency", v)} defaultValue={form.currency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Amount ({form.currency})</Label>
                    <Input type="number" value={form.amount} onChange={(e) => setField("amount", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Patient Name</Label>
                    <Input value={form.patientName} onChange={(e) => setField("patientName", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Patient ID (VP)</Label>
                    <Input value={form.patientId} onChange={(e) => setField("patientId", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Medical Aid</Label>
                    <Select onValueChange={(v) => setField("medicalAid", v)} defaultValue={form.medicalAid}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MEDICAL_AIDS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Member Number</Label>
                    <Input value={form.memberNumber} onChange={(e) => setField("memberNumber", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Branch</Label>
                    <Select onValueChange={(v) => setField("branch", v)} defaultValue={form.branch}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Service Date</Label>
                    <Input type="date" value={form.serviceDate} onChange={(e) => setField("serviceDate", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Submission Date</Label>
                    <Input type="date" value={form.submissionDate} onChange={(e) => setField("submissionDate", e.target.value)} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Notes</Label>
                    <Textarea value={form.notes || ""} onChange={(e) => setField("notes", e.target.value)} rows={3} />
                  </div>
                </div>
              ) : (
                <div className="space-y-0">
                  <InfoRow label="Claim #"        value={claim.claimNumber} />
                  <InfoRow label="Patient"        value={claim.patientName} />
                  <InfoRow label="Patient ID"     value={claim.patientId} />
                  <InfoRow label="Medical Aid"    value={claim.medicalAid} />
                  <InfoRow label="Member #"       value={claim.memberNumber} />
                  <InfoRow label="Branch"         value={claim.branch} />
                  <InfoRow label="Service Date"   value={new Date(claim.serviceDate).toLocaleDateString()} />
                  <InfoRow label="Submitted"      value={new Date(claim.submissionDate).toLocaleDateString()} />
                  <InfoRow label="Currency"       value={claim.currency} />
                  <InfoRow label="Amount"         value={formatCurrency(claim.amount, claim.currency)} />
                  <InfoRow label="Last Updated"   value={new Date(claim.updatedAt).toLocaleDateString()} />
                  {claim.followUpDate && (
                    <InfoRow label="Follow-up Date" value={new Date(claim.followUpDate).toLocaleDateString()} />
                  )}
                  {claim.rejectionReason && (
                    <InfoRow label="Rejection Reason" value={claim.rejectionReason} />
                  )}
                  {claim.notes && (
                    <InfoRow label="Notes" value={claim.notes} />
                  )}
                </div>
              )}
            </div>

            {/* Status Actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                Status & Actions
              </p>
              <div className="flex flex-wrap gap-2">

                {/* Pending or Approved — full workflow */}
                {(claim.status === "pending" || claim.status === "approved") && (
                  <>
                    <Select onValueChange={(val) => updateStatus(val)}>
                      <SelectTrigger className="w-36 h-8 text-sm">
                        <SelectValue placeholder="Update status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">pending</SelectItem>
                        <SelectItem value="approved">approved</SelectItem>
                        <SelectItem value="paid">paid</SelectItem>
                      </SelectContent>
                    </Select>
                    <PartialPaymentDialog 
                      claimId={claim._id} 
                      totalAmount={claim.amount} 
                      currency={claim.currency}
                      onDone={fetchClaim} 
                    />
                    <RejectDialog claimId={claim._id} onDone={fetchClaim} />
                    <FollowUpDialog
                      claimId={claim._id}
                      submissionDate={claim.submissionDate}
                      currentFollowUpDate={claim.followUpDate}
                      onDone={fetchClaim}
                    />
                  </>
                )}

                {/* Rejected — resubmit */}
                {claim.status === "rejected" && (
                  <ResubmitDialog
                    claimId={claim._id}
                    originalClaimNumber={claim.claimNumber}
                    onDone={() => router.push("/claims")}
                  />
                )}

                {/* Paid — correction only */}
                {claim.status === "paid" && (
                  <Select onValueChange={(val) => updateStatus(val)}>
                    <SelectTrigger className="w-36 h-8 text-sm border-dashed text-gray-400">
                      <SelectValue placeholder="Correct ↺" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">↺ approved</SelectItem>
                      <SelectItem value="pending">↺ pending</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Partial — promote or revert */}
                {claim.status === "partial" && (
                  <Select onValueChange={(val) => updateStatus(val)}>
                    <SelectTrigger className="w-36 h-8 text-sm border-dashed text-gray-400">
                      <SelectValue placeholder="Correct ↺" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">→ paid (full)</SelectItem>
                      <SelectItem value="approved">↺ approved</SelectItem>
                      <SelectItem value="pending">↺ pending</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Superseded — reactivate */}
                {claim.status === "superseded" && (
                  <Select onValueChange={(val) => updateStatus(val)}>
                    <SelectTrigger className="w-36 h-8 text-sm border-dashed text-gray-400">
                      <SelectValue placeholder="Correct ↺" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">↺ reactivate</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Always: Delete */}
                <DeleteDialog
                  claimId={claim._id}
                  claimNumber={claim.claimNumber}
                  onDone={() => router.push("/claims")}
                />

              </div>
            </div>

          </div>
        </div>

        {/* Back nav */}
        <div className="flex gap-3">
          <button onClick={() => router.back()} className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            ← Back
          </button>
          <Link href="/claims">
            <button className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              All Claims
            </button>
          </Link>
          <Link href="/dashboard">
            <button className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Dashboard
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}