"use client";
// FILE: app/users/page.tsx

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Search, Edit2, Trash2, Users, Shield,
  CheckCircle, XCircle, Loader2, AlertCircle, X, Key, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { BRANCHES } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";

interface UserRecord {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  branch?: string;
  active: boolean;
  lastLoginAt?: string;
  mustChangePassword: boolean;
  createdAt: string;
}

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "finance", label: "Finance" },
  { value: "receptionist", label: "Receptionist" },
  { value: "branch_manager", label: "Branch Manager" },
  { value: "auditor", label: "Auditor" },
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  finance: "bg-green-100 text-green-700 border-green-200",
  receptionist: "bg-blue-100 text-blue-700 border-blue-200",
  branch_manager: "bg-orange-100 text-orange-700 border-orange-200",
  auditor: "bg-gray-100 text-gray-600 border-gray-200",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  finance: "Finance",
  receptionist: "Receptionist",
  branch_manager: "Branch Manager",
  auditor: "Auditor",
};

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "",
  branch: "",
  active: true,
  mustChangePassword: true,
};

const EMPTY_EDIT = {
  firstName: "",
  lastName: "",
  email: "",
  role: "",
  branch: "",
  active: true,
  mustChangePassword: false,
  newPassword: "",
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (branchFilter !== "all") params.set("branch", branchFilter);
    try {
      const res = await fetch(`/api/v1/users?${params}`, { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        let data = json.data || [];
        if (search.trim()) {
          const s = search.toLowerCase();
          data = data.filter((u: UserRecord) =>
            u.firstName.toLowerCase().includes(s) ||
            u.lastName.toLowerCase().includes(s) ||
            u.email.toLowerCase().includes(s)
          );
        }
        setUsers(data);
      }
    } catch {}
    setLoading(false);
  }, [search, roleFilter, branchFilter]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 0);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  function setFormField(field: string, value: any) {
    setForm((p) => ({ ...p, [field]: value }));
  }
  function setEditField(field: string, value: any) {
    setEditForm((p) => ({ ...p, [field]: value }));
  }

  async function handleCreate() {
    setCreateError("");
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.role) {
      setCreateError("All required fields must be filled.");
      return;
    }
    if (form.password.length < 8) {
      setCreateError("Password must be at least 8 characters.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        fetchUsers();
      } else {
        setCreateError(json.error || "Failed to create user");
      }
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(u: UserRecord) {
    setEditingUser(u);
    setEditForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      branch: u.branch || "",
      active: u.active,
      mustChangePassword: u.mustChangePassword,
      newPassword: "",
    });
    setEditError("");
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    setEditError("");
    if (!editingUser) return;
    if (editForm.newPassword && editForm.newPassword.length < 8) {
      setEditError("New password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...editForm };
      if (!payload.newPassword) delete payload.newPassword;
      // Convert "none" branch value back to empty string for the API
      if (payload.branch === "none") payload.branch = "";
      const res = await fetch(`/api/v1/users/${editingUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setEditOpen(false);
        fetchUsers();
      } else {
        setEditError(json.error || "Failed to save");
      }
    } catch {
      setEditError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await fetch(`/api/v1/users/${id}`, { method: "DELETE", credentials: "include" });
      setDeleteId(null);
      fetchUsers();
    } catch {}
    setDeleting(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Users</h1>
            <p className="text-xs text-gray-400 mt-0.5">{users.length} system users</p>
          </div>
          <Button onClick={() => { setCreateError(""); setForm(EMPTY_FORM); setCreateOpen(true); }} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
          {createError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{createError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={(e) => setFormField("firstName", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={(e) => setFormField("lastName", e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setFormField("email", e.target.value)} placeholder="user@linkoptical.co.zw" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Password * (min 8 characters)</Label>
              <Input type="password" value={form.password} onChange={(e) => setFormField("password", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Role *</Label>
              <Select onValueChange={(v) => setFormField("role", v)}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Branch</Label>
              <Select onValueChange={(v) => setFormField("branch", v)}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.mustChangePassword} onChange={(e) => setFormField("mustChangePassword", e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-gray-700">Require password change on first login</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create User
            </Button>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit User — {editingUser?.email}</DialogTitle></DialogHeader>
          {editError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{editError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First Name</Label>
              <Input value={editForm.firstName} onChange={(e) => setEditField("firstName", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Last Name</Label>
              <Input value={editForm.lastName} onChange={(e) => setEditField("lastName", e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditField("email", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditField("role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Branch</Label>
              <Select value={editForm.branch || "none"} onValueChange={(v) => setEditField("branch", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>New Password (leave blank to keep current)</Label>
              <Input type="password" value={editForm.newPassword} onChange={(e) => setEditField("newPassword", e.target.value)} placeholder="••••••••" />
            </div>
            <div className="col-span-2 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.active} onChange={(e) => setEditField("active", e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-gray-700">Account active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.mustChangePassword} onChange={(e) => setEditField("mustChangePassword", e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-gray-700">Force password change</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete User?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">This will deactivate and soft-delete the user. They will no longer be able to log in.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete User
            </Button>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input className="pl-9" placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>
          <Select onValueChange={setRoleFilter} defaultValue="all">
            <SelectTrigger className="w-44"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select onValueChange={setBranchFilter} defaultValue="all">
            <SelectTrigger className="w-44"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No users found</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">User</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Branch</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Last Login</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {u.firstName} {u.lastName}
                            {u._id === currentUser?.id && <span className="ml-2 text-[10px] text-blue-500 font-semibold">(you)</span>}
                          </p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                          {u.mustChangePassword && (
                            <span className="text-[10px] text-orange-500 flex items-center gap-0.5 mt-0.5">
                              <Key className="w-2.5 h-2.5" /> Password reset required
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{u.branch || "—"}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-5 py-3.5">
                      {u.active ? (
                        <span className="flex items-center gap-1 text-[10px] text-green-600 font-semibold">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(u)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u._id !== currentUser?.id && (
                          <button
                            onClick={() => setDeleteId(u._id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}