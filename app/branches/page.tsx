"use client";
// FILE: app/branches/page.tsx

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Search, Edit2, Trash2, Building2, MapPin,
  Phone, Mail, User, CheckCircle, XCircle, Loader2, AlertCircle, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";

interface Branch {
  _id: string;
  branchName: string;
  code: string;
  city: string;
  address?: string;
  phone?: string;
  email?: string;
  managerName?: string;
  active: boolean;
  createdAt: string;
}

const EMPTY_FORM = {
  branchName: "",
  code: "",
  city: "",
  address: "",
  phone: "",
  email: "",
  managerName: "",
  active: true,
};

export default function BranchesPage() {
  const { isRole } = useAuth();
  const isSuperAdmin = isRole("super_admin");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    try {
      const res = await fetch(`/api/v1/branches?${params}`, { credentials: "include" });
      const json = await res.json();
      if (json.success) setBranches(json.data || []);
    } catch {}
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchBranches, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchBranches]);

  function openCreate() {
    setEditingBranch(null);
    setForm(EMPTY_FORM);
    setSaveError("");
    setDialogOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditingBranch(branch);
    setForm({
      branchName: branch.branchName,
      code: branch.code,
      city: branch.city,
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      managerName: branch.managerName || "",
      active: branch.active,
    });
    setSaveError("");
    setDialogOpen(true);
  }

  function setField(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaveError("");
    if (!form.branchName.trim() || !form.code.trim() || !form.city.trim()) {
      setSaveError("Branch name, code, and city are required.");
      return;
    }
    setSaving(true);
    try {
      const url = editingBranch ? `/api/v1/branches/${editingBranch._id}` : "/api/v1/branches";
      const method = editingBranch ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setDialogOpen(false);
        fetchBranches();
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
      await fetch(`/api/v1/branches/${id}`, { method: "DELETE", credentials: "include" });
      setDeleteId(null);
      fetchBranches();
    } catch {}
    setDeleting(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Branches</h1>
            <p className="text-xs text-gray-400 mt-0.5">{branches.length} branch locations</p>
          </div>
          {isSuperAdmin && (
            <Button onClick={openCreate} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Branch
            </Button>
          )}
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBranch ? `Edit ${editingBranch.branchName}` : "Add Branch"}</DialogTitle>
          </DialogHeader>
          {saveError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {saveError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Branch Name *</Label>
              <Input value={form.branchName} onChange={(e) => setField("branchName", e.target.value)} placeholder="Robinson House" />
            </div>
            <div className="space-y-1">
              <Label>Code *</Label>
              <Input value={form.code} onChange={(e) => setField("code", e.target.value.toUpperCase())} placeholder="RBH" />
            </div>
            <div className="space-y-1">
              <Label>City *</Label>
              <Input value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Harare" />
            </div>
            <div className="space-y-1">
              <Label>Manager Name</Label>
              <Input value={form.managerName} onChange={(e) => setField("managerName", e.target.value)} placeholder="Jane Smith" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="123 Samora Machel Ave, Harare" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+263 4 123 456" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="branch@linkoptical.co.zw" />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setField("active", e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Branch is active</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingBranch ? "Save Changes" : "Add Branch"}
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Branch?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">This will deactivate the branch. Existing claims and patients will not be affected.</p>
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
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search branches…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Building2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No branches found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {branches.map((branch) => (
              <div
                key={branch._id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">{branch.code}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{branch.branchName}</p>
                      {branch.active ? (
                        <span className="flex items-center gap-1 text-[10px] text-green-600 font-semibold mt-0.5">
                          <CheckCircle className="w-2.5 h-2.5" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold mt-0.5">
                          <XCircle className="w-2.5 h-2.5" /> Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(branch)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(branch._id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                    {branch.city}{branch.address ? ` · ${branch.address}` : ""}
                  </div>
                  {branch.managerName && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="w-3 h-3 text-gray-400 shrink-0" />
                      {branch.managerName}
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                      {branch.phone}
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                      {branch.email}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}