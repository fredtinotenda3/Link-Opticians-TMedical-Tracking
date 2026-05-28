"use client";
// FILE: app/patients/[id]/page.tsx

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Phone, Mail, Building2, CreditCard, Calendar, User,
  FileText, ArrowLeft, Edit2, Save, X, Loader2, AlertCircle,
  ChevronRight, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BRANCHES, MEDICAL_AIDS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils/currency";
import { getDaysOutstanding, getAgingBucket } from "@/lib/utils/claims";
import { useAuth } from "@/context/AuthContext";

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  nationalId?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: string;
  medicalAid?: string;
  memberNumber?: string;
  branch: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  claims?: any[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-800",
  partial: "bg-orange-100 text-orange-800",
  superseded: "bg-gray-100 text-gray-400",
  escalated: "bg-red-200 text-red-800",
};

const AGING_COLORS: Record<string, string> = {
  current: "text-green-600",
  warning: "text-yellow-600 font-semibold",
  critical: "text-red-600 font-bold",
};

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<any>(null);

  async function fetchPatient() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/patients/${id}`, { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setPatient(json.data);
        setForm({ ...json.data });
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchPatient(); }, [id]);

  function setField(field: string, value: string) {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          nationalId: form.nationalId,
          phone: form.phone,
          email: form.email,
          address: form.address,
          medicalAid: form.medicalAid,
          memberNumber: form.memberNumber,
          branch: form.branch,
          status: form.status,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditing(false);
        fetchPatient();
      } else {
        setError(json.error || "Failed to save");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Patient not found</p>
          <Link href="/patients"><Button variant="outline" className="mt-3">← Back to Patients</Button></Link>
        </div>
      </div>
    );
  }

  const claims = patient.claims || [];
  const outstandingClaims = claims.filter((c: any) =>
    ["pending", "approved", "partial"].includes(c.status)
  );
  const totalOutstanding = outstandingClaims.reduce((s: number, c: any) =>
    s + (c.amount || 0), 0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <Link href="/patients" className="hover:text-gray-600 flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Patients
            </Link>
            <span>›</span>
            <span className="text-gray-700 font-medium">{patient.firstName} {patient.lastName}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                {patient.firstName[0]}{patient.lastName[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{patient.firstName} {patient.lastName}</h1>
                <div className="flex items-center gap-3 mt-0.5">
                  {patient.nationalId && (
                    <span className="text-xs text-gray-400 font-mono">{patient.nationalId}</span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    patient.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {patient.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {hasPermission("edit") && !editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
              )}
              {editing && (
                <>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm({ ...patient }); setError(""); }}>
                    <X className="w-3.5 h-3.5 mr-1.5" /> Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Total Claims</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{claims.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Outstanding</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{outstandingClaims.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Outstanding Value</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(totalOutstanding, "USD")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Patient Info */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Patient Details {editing && <span className="text-blue-400 normal-case ml-1">— editing</span>}
              </p>
              {editing ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>First Name</Label>
                    <Input value={form.firstName || ""} onChange={(e) => setField("firstName", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Last Name</Label>
                    <Input value={form.lastName || ""} onChange={(e) => setField("lastName", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>National ID</Label>
                    <Input value={form.nationalId || ""} onChange={(e) => setField("nationalId", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={form.phone || ""} onChange={(e) => setField("phone", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input value={form.email || ""} onChange={(e) => setField("email", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Address</Label>
                    <Input value={form.address || ""} onChange={(e) => setField("address", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Medical Aid</Label>
                    <Select onValueChange={(v) => setField("medicalAid", v)} defaultValue={form.medicalAid || ""}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {MEDICAL_AIDS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Member Number</Label>
                    <Input value={form.memberNumber || ""} onChange={(e) => setField("memberNumber", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Branch</Label>
                    <Select onValueChange={(v) => setField("branch", v)} defaultValue={form.branch || ""}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select onValueChange={(v) => setField("status", v)} defaultValue={form.status || "active"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-0">
                  <InfoRow label="Full Name" value={`${patient.firstName} ${patient.lastName}`} />
                  <InfoRow label="National ID" value={patient.nationalId} />
                  <InfoRow label="Phone" value={patient.phone} />
                  <InfoRow label="Email" value={patient.email} />
                  <InfoRow label="Address" value={patient.address} />
                  <InfoRow label="Medical Aid" value={patient.medicalAid} />
                  <InfoRow label="Member #" value={patient.memberNumber} />
                  <InfoRow label="Branch" value={patient.branch} />
                  <InfoRow label="Status" value={patient.status} />
                  <InfoRow label="Registered" value={new Date(patient.createdAt).toLocaleDateString()} />
                </div>
              )}
            </div>
          </div>

          {/* Claims History */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">
                  Claim History ({claims.length})
                </p>
                {hasPermission("create") && (
                  <Link href={`/claims/new`}>
                    <Button size="sm" variant="outline">
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      New Claim
                    </Button>
                  </Link>
                )}
              </div>
              {claims.length === 0 ? (
                <div className="py-16 text-center">
                  <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No claims yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Claim #</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Medical Aid</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Submitted</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Days</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {claims.map((claim: any) => {
                        const days = getDaysOutstanding(claim.submissionDate, claim.paidDate);
                        const bucket = getAgingBucket(days);
                        const currency = claim.currency || "USD";
                        const amount = currency === "ZWG"
                          ? (claim.amountZWG || claim.amount || 0)
                          : (claim.amount || 0);
                        return (
                          <tr
                            key={claim._id}
                            onClick={() => router.push(`/claims/${claim._id}`)}
                            className="border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3 font-mono text-xs text-gray-700">{claim.claimNumber}</td>
                            <td className="px-4 py-3 text-gray-600">{claim.medicalAid}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-800">
                              {formatCurrency(amount, currency)}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {new Date(claim.submissionDate).toLocaleDateString()}
                            </td>
                            <td className={`px-4 py-3 text-sm font-semibold ${AGING_COLORS[bucket]}`}>{days}d</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[claim.status] || "bg-gray-100 text-gray-500"}`}>
                                {claim.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <ChevronRight className="w-4 h-4 text-gray-300" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="flex gap-3">
          <button onClick={() => router.back()} className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            ← Back
          </button>
          <Link href="/patients">
            <button className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              All Patients
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}