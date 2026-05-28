"use client";
// FILE: app/medical-aids/page.tsx

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Search, Edit2, Trash2, CheckCircle, XCircle,
  Loader2, AlertCircle, X, ChevronRight, Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils/currency";

interface MedicalAid {
  _id: string;
  name: string;
  code: string;
  contactEmail?: string;
  contactPhone?: string;
  requiresAuthorization: boolean;
  paymentTerms: number;
  active: boolean;
  frameLimit?: number;
  lensLimit?: number;
  consultationLimit?: number;
  annualBenefitLimit?: number;
  currency: "USD" | "ZWG";
  averagePaymentDays?: number;
  rejectionRate?: number;
  notes?: string;
  createdAt: string;
}

const EMPTY_FORM = {
  name: "",
  code: "",
  contactEmail: "",
  contactPhone: "",
  requiresAuthorization: false,
  paymentTerms: 30,
  active: true,
  currency: "USD" as "USD" | "ZWG",
  frameLimit: "",
  lensLimit: "",
  consultationLimit: "",
  annualBenefitLimit: "",
  notes: "",
};

export default function MedicalAidsPage() {
  const { hasPermission, isRole } = useAuth();
  const router = useRouter();
  const canManage = hasPermission("finance") || isRole("super_admin");

  const [aids, setAids] = useState<MedicalAid[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAid, setEditingAid] = useState<MedicalAid | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAids = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (activeFilter !== "all") params.set("active", activeFilter);

    try {
      const res = await fetch(`/api/v1/medical-aids?${params}`, { credentials: "include" });
      const json = await res.json();
      if (json.success) setAids(json.data || []);
    } catch {}
    setLoading(false);
  }, [search, activeFilter]);

  useEffect(() => {
    const t = setTimeout(fetchAids, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchAids]);

  function openCreate() {
    setEditingAid(null);
    setForm(EMPTY_FORM);
    setSaveError("");
    setDialogOpen(true);
  }

  function openEdit(aid: MedicalAid) {
    setEditingAid(aid);
    setForm({
      name: aid.name,
      code: aid.code,
      contactEmail: aid.contactEmail || "",
      contactPhone: aid.contactPhone || "",
      requiresAuthorization: aid.requiresAuthorization,
      paymentTerms: aid.paymentTerms,
      active: aid.active,
      currency: aid.currency,
      frameLimit: aid.frameLimit?.toString() || "",
      lensLimit: aid.lensLimit?.toString() || "",
      consultationLimit: aid.consultationLimit?.toString() || "",
      annualBenefitLimit: aid.annualBenefitLimit?.toString() || "",
      notes: aid.notes || "",
    });
    setSaveError("");
    setDialogOpen(true);
  }

  function setField(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaveError("");
    if (!form.name.trim() || !form.code.trim()) {
      setSaveError("Name and code are required.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        paymentTerms: Number(form.paymentTerms),
        frameLimit: form.frameLimit ? Number(form.frameLimit) : undefined,
        lensLimit: form.lensLimit ? Number(form.lensLimit) : undefined,
        consultationLimit: form.consultationLimit ? Number(form.consultationLimit) : undefined,
        annualBenefitLimit: form.annualBenefitLimit ? Number(form.annualBenefitLimit) : undefined,
      };
      const url = editingAid ? `/api/v1/medical-aids/${editingAid._id}` : "/api/v1/medical-aids";
      const method = editingAid ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setDialogOpen(false);
        fetchAids();
      } else {
        setSaveError(json.error || "Failed to save");
      }
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await fetch(`/api/v1/medical-aids/${id}`, { method: "DELETE", credentials: "include" });
      setDeleteId(null);
      fetchAids();
    } catch {}
    setDeleting(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Medical Aids</h1>
            <p className="text-xs text-gray-400 mt-0.5">{aids.length} registered medical aid providers</p>
          </div>
          {canManage && (
            <Button onClick={openCreate} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Medical Aid
            </Button>
          )}
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAid ? `Edit ${editingAid.name}` : "Add Medical Aid"}</DialogTitle>
          </DialogHeader>
          {saveError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {saveError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="PSMAS" />
            </div>
            <div className="space-y-1">
              <Label>Code *</Label>
              <Input value={form.code} onChange={(e) => setField("code", e.target.value.toUpperCase())} placeholder="PSMAS" />
            </div>
            <div className="space-y-1">
              <Label>Contact Email</Label>
              <Input value={form.contactEmail} onChange={(e) => setField("contactEmail", e.target.value)} placeholder="claims@psmas.co.zw" />
            </div>
            <div className="space-y-1">
              <Label>Contact Phone</Label>
              <Input value={form.contactPhone} onChange={(e) => setField("contactPhone", e.target.value)} placeholder="+263 4 123 456" />
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setField("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="ZWG">ZWG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Payment Terms (days)</Label>
              <Input type="number" value={form.paymentTerms} onChange={(e) => setField("paymentTerms", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Frame Limit ({form.currency})</Label>
              <Input type="number" value={form.frameLimit} onChange={(e) => setField("frameLimit", e.target.value)} placeholder="e.g. 150" />
            </div>
            <div className="space-y-1">
              <Label>Lens Limit ({form.currency})</Label>
              <Input type="number" value={form.lensLimit} onChange={(e) => setField("lensLimit", e.target.value)} placeholder="e.g. 200" />
            </div>
            <div className="space-y-1">
              <Label>Consultation Limit ({form.currency})</Label>
              <Input type="number" value={form.consultationLimit} onChange={(e) => setField("consultationLimit", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Annual Benefit Limit ({form.currency})</Label>
              <Input type="number" value={form.annualBenefitLimit} onChange={(e) => setField("annualBenefitLimit", e.target.value)} />
            </div>
            <div className="col-span-2 flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requiresAuthorization}
                  onChange={(e) => setField("requiresAuthorization", e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Requires Pre-Authorization</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setField("active", e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Any additional notes…" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingAid ? "Save Changes" : "Add Medical Aid"}
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Medical Aid?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">This will soft-delete the medical aid. Existing claims will not be affected.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search by name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Select onValueChange={setActiveFilter} defaultValue="all">
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : aids.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Stethoscope className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No medical aids found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aids.map((aid) => (
              <div
                key={aid._id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{aid.name}</p>
                        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{aid.code}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {aid.active ? (
                          <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full font-semibold">
                            <CheckCircle className="w-2.5 h-2.5" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full font-semibold">
                            <XCircle className="w-2.5 h-2.5" /> Inactive
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">{aid.currency} · {aid.paymentTerms}d terms</span>
                        {aid.requiresAuthorization && (
                          <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full font-semibold">Pre-auth required</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(aid)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(aid._id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Benefit limits */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {aid.frameLimit && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Frame Limit</p>
                      <p className="text-sm font-semibold text-gray-800">{formatCurrency(aid.frameLimit, aid.currency)}</p>
                    </div>
                  )}
                  {aid.lensLimit && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Lens Limit</p>
                      <p className="text-sm font-semibold text-gray-800">{formatCurrency(aid.lensLimit, aid.currency)}</p>
                    </div>
                  )}
                  {aid.consultationLimit && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Consultation</p>
                      <p className="text-sm font-semibold text-gray-800">{formatCurrency(aid.consultationLimit, aid.currency)}</p>
                    </div>
                  )}
                  {aid.annualBenefitLimit && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Annual Limit</p>
                      <p className="text-sm font-semibold text-gray-800">{formatCurrency(aid.annualBenefitLimit, aid.currency)}</p>
                    </div>
                  )}
                </div>

                {/* Contact */}
                {(aid.contactEmail || aid.contactPhone) && (
                  <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
                    {aid.contactEmail && (
                      <p className="text-xs text-gray-400">✉ {aid.contactEmail}</p>
                    )}
                    {aid.contactPhone && (
                      <p className="text-xs text-gray-400">☎ {aid.contactPhone}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}