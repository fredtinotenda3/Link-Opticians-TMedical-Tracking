"use client";
// FILE: app/patients/page.tsx

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, UserCircle, Phone, Mail, Building2, CreditCard, ChevronRight, Loader2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { BRANCHES, MEDICAL_AIDS } from "@/lib/constants";
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
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  nationalId: "",
  phone: "",
  email: "",
  address: "",
  medicalAid: "",
  memberNumber: "",
  branch: "",
  status: "active" as const,
};

export default function PatientsPage() {
  const { hasPermission } = useAuth();
  const router = useRouter();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [medicalAidFilter, setMedicalAidFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (branchFilter !== "all") params.set("branch", branchFilter);
    if (medicalAidFilter !== "all") params.set("medicalAid", medicalAidFilter);
    params.set("page", String(page));
    params.set("limit", "20");

    try {
      const res = await fetch(`/api/v1/patients?${params}`, { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setPatients(json.data || []);
        setPagination(json.pagination || null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search, branchFilter, medicalAidFilter, page]);

  useEffect(() => {
    const timer = setTimeout(fetchPatients, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate() {
    setCreateError("");
    if (!form.firstName.trim() || !form.lastName.trim() || !form.branch) {
      setCreateError("First name, last name, and branch are required.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/v1/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        fetchPatients();
      } else {
        setCreateError(json.error || "Failed to create patient");
      }
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Patients</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {pagination ? `${pagination.total} total patients` : "Patient registry"}
            </p>
          </div>
          {hasPermission("create") && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  New Patient
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Register New Patient</DialogTitle>
                </DialogHeader>
                {createError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {createError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>First Name *</Label>
                    <Input value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} placeholder="John" />
                  </div>
                  <div className="space-y-1">
                    <Label>Last Name *</Label>
                    <Input value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} placeholder="Doe" />
                  </div>
                  <div className="space-y-1">
                    <Label>National ID</Label>
                    <Input value={form.nationalId} onChange={(e) => setField("nationalId", e.target.value)} placeholder="63-123456A78" />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+263 77 123 4567" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="patient@email.com" />
                  </div>
                  <div className="space-y-1">
                    <Label>Medical Aid</Label>
                    <Select onValueChange={(v) => setField("medicalAid", v)} defaultValue="">
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {MEDICAL_AIDS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Member Number</Label>
                    <Input value={form.memberNumber} onChange={(e) => setField("memberNumber", e.target.value)} placeholder="MEM-0001" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Branch *</Label>
                    <Select onValueChange={(v) => setField("branch", v)}>
                      <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>
                        {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Address</Label>
                    <Input value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="123 Samora Machel Ave, Harare" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : "Register Patient"}
                  </Button>
                  <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); setCreateError(""); }}>
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search name, ID, member number…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Select onValueChange={(v) => { setBranchFilter(v); setPage(1); }} defaultValue="all">
            <SelectTrigger className="w-44"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => { setMedicalAidFilter(v); setPage(1); }} defaultValue="all">
            <SelectTrigger className="w-44"><SelectValue placeholder="Medical Aid" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Medical Aids</SelectItem>
              {MEDICAL_AIDS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <UserCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No patients found</p>
            {search && <p className="text-gray-300 text-xs mt-1">Try a different search term</p>}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Patient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Medical Aid</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Branch</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr
                    key={p._id}
                    onClick={() => router.push(`/patients/${p._id}`)}
                    className="border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{p.firstName} {p.lastName}</p>
                          {p.nationalId && <p className="text-xs text-gray-400">{p.nationalId}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        {p.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone className="w-3 h-3" />
                            {p.phone}
                          </div>
                        )}
                        {p.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />
                            {p.email}
                          </div>
                        )}
                        {!p.phone && !p.email && <span className="text-xs text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {p.medicalAid ? (
                        <div>
                          <p className="text-sm text-gray-700">{p.medicalAid}</p>
                          {p.memberNumber && (
                            <p className="text-xs text-gray-400 font-mono">{p.memberNumber}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        {p.branch}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        p.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Page {pagination.page} of {pagination.totalPages} · {pagination.total} patients
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrev}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNext}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}