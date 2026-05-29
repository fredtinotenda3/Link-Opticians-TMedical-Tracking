// FILE: app/claims/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEDICAL_AIDS, BRANCHES, CURRENCIES } from "@/lib/constants";
import { AlertCircle, CheckCircle2, Loader2, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";

interface RiskFlag {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  flags: string[];
  recommendations: string[];
}

export default function NewClaimPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currency: ctxCurrency } = useCurrency();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [risk, setRisk] = useState<RiskFlag | null>(null);

  const [form, setForm] = useState({
    claimNumber:    "",
    patientName:    "",
    patientId:      "",
    medicalAid:     "",
    memberNumber:   "",
    branch:         user?.branch || "",
    serviceDate:    "",
    submissionDate: new Date().toISOString().split("T")[0],
    amount:         "",
    currency:       ctxCurrency,
    notes:          "",
    serviceType:    "",
    invoiceNumber:  "",
    authorizationNumber: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (fieldErrors[field]) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  }

  // Auto-suggest claim number when branch + currency change
  useEffect(() => {
    if (form.branch && form.currency && !form.claimNumber) {
      const year = new Date().getFullYear();
      const BRANCH_CODES: Record<string, string> = {
        "Robinson House": "RBH", "Kensington": "KEN",
        "Honey Dew": "HDW", "Chipinge": "CHI", "Chiredzi": "CZI",
      };
      const code = BRANCH_CODES[form.branch] || form.branch.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase();
      const rand = Math.floor(Math.random() * 9000) + 1000;
      const prefix = form.currency === "ZWG" ? "Z" : "";
      set("claimNumber", `${prefix}CLM-${year}-${code}-${rand}`);
    }
  }, [form.branch, form.currency]);

  async function handleSubmit() {
    setError("");
    setFieldErrors({});
    setLoading(true);

    const payload: any = {
      claimNumber:    form.claimNumber.trim(),
      patientName:    form.patientName.trim(),
      patientId:      form.patientId.trim(),
      medicalAid:     form.medicalAid,
      memberNumber:   form.memberNumber.trim(),
      branch:         form.branch,
      serviceDate:    form.serviceDate,
      submissionDate: form.submissionDate,
      amount:         parseFloat(form.amount) || 0,
      currency:       form.currency,
      notes:          form.notes,
      serviceType:    form.serviceType,
      invoiceNumber:  form.invoiceNumber,
      authorizationNumber: form.authorizationNumber,
    };

    try {
      const res = await fetch("/api/v1/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        router.push(`/claims/${json.data._id}`);
      } else {
        if (json.fields) setFieldErrors(json.fields);
        else setError(json.error || "Failed to create claim");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const riskColor = {
    low:      "bg-green-50 border-green-200 text-green-700",
    medium:   "bg-yellow-50 border-yellow-200 text-yellow-700",
    high:     "bg-orange-50 border-orange-200 text-orange-700",
    critical: "bg-red-50 border-red-200 text-red-700",
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Claim</h1>
        <p className="text-xs text-gray-400 mt-0.5">Log a new medical aid claim</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Claim Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">

            {/* Currency first */}
            <div className="space-y-1">
              <Label>Currency *</Label>
              <Select onValueChange={(v) => set("currency", v)} value={form.currency}>
                <SelectTrigger className={fieldErrors.currency ? "border-red-400" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Branch *</Label>
              <Select onValueChange={(v) => set("branch", v)} value={form.branch}>
                <SelectTrigger className={fieldErrors.branch ? "border-red-400" : ""}>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              {fieldErrors.branch && <p className="text-xs text-red-500">{fieldErrors.branch}</p>}
            </div>

            <div className="space-y-1">
              <Label>Claim Number (from 263) *</Label>
              <Input
                value={form.claimNumber}
                onChange={(e) => set("claimNumber", e.target.value)}
                className={fieldErrors.claimNumber ? "border-red-400" : ""}
                placeholder="CLM-2026-RBH-00001"
              />
              {fieldErrors.claimNumber && <p className="text-xs text-red-500">{fieldErrors.claimNumber}</p>}
            </div>

            <div className="space-y-1">
              <Label>Amount ({form.currency}) *</Label>
              <Input
                type="number"
                placeholder={`Amount in ${form.currency}`}
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                className={fieldErrors.amount ? "border-red-400" : ""}
              />
              {fieldErrors.amount && <p className="text-xs text-red-500">{fieldErrors.amount}</p>}
            </div>

            <div className="space-y-1">
              <Label>Patient Name *</Label>
              <Input
                value={form.patientName}
                onChange={(e) => set("patientName", e.target.value)}
                className={fieldErrors.patientName ? "border-red-400" : ""}
                placeholder="Full name"
              />
              {fieldErrors.patientName && <p className="text-xs text-red-500">{fieldErrors.patientName}</p>}
            </div>

            <div className="space-y-1">
              <Label>Patient ID (VP Number) *</Label>
              <Input
                value={form.patientId}
                onChange={(e) => set("patientId", e.target.value)}
                className={fieldErrors.patientId ? "border-red-400" : ""}
                placeholder="VP-0001"
              />
              {fieldErrors.patientId && <p className="text-xs text-red-500">{fieldErrors.patientId}</p>}
            </div>

            <div className="space-y-1">
              <Label>Medical Aid *</Label>
              <Select onValueChange={(v) => set("medicalAid", v)} value={form.medicalAid}>
                <SelectTrigger className={fieldErrors.medicalAid ? "border-red-400" : ""}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {MEDICAL_AIDS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              {fieldErrors.medicalAid && <p className="text-xs text-red-500">{fieldErrors.medicalAid}</p>}
            </div>

            <div className="space-y-1">
              <Label>Member Number *</Label>
              <Input
                value={form.memberNumber}
                onChange={(e) => set("memberNumber", e.target.value)}
                className={fieldErrors.memberNumber ? "border-red-400" : ""}
                placeholder="MEM-0001"
              />
              {fieldErrors.memberNumber && <p className="text-xs text-red-500">{fieldErrors.memberNumber}</p>}
            </div>

            <div className="space-y-1">
              <Label>Service Date *</Label>
              <Input
                type="date"
                value={form.serviceDate}
                onChange={(e) => set("serviceDate", e.target.value)}
                className={fieldErrors.serviceDate ? "border-red-400" : ""}
              />
              {fieldErrors.serviceDate && <p className="text-xs text-red-500">{fieldErrors.serviceDate}</p>}
            </div>

            <div className="space-y-1">
              <Label>Submission Date *</Label>
              <Input
                type="date"
                value={form.submissionDate}
                onChange={(e) => set("submissionDate", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Invoice Number</Label>
              <Input
                value={form.invoiceNumber}
                onChange={(e) => set("invoiceNumber", e.target.value)}
                placeholder="INV-0001"
              />
            </div>

            <div className="space-y-1">
              <Label>Authorization Number</Label>
              <Input
                value={form.authorizationNumber}
                onChange={(e) => set("authorizationNumber", e.target.value)}
                placeholder="AUTH-0001"
              />
            </div>

            <div className="space-y-1">
              <Label>Service Type</Label>
              <Select onValueChange={(v) => set("serviceType", v)} value={form.serviceType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="frames">Frames</SelectItem>
                  <SelectItem value="lenses">Lenses</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="contact_lenses">Contact Lenses</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Additional notes about this claim..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : "Save Claim"}
            </Button>
            <Button variant="outline" onClick={() => router.push("/claims")}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}