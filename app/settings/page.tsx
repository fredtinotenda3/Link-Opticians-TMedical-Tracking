// FILE: app/settings/page.tsx
"use client";

import { useState } from "react";
import {
  Settings, User, Key, Bell, Shield, Database, Zap,
  CheckCircle2, AlertCircle, Loader2, ChevronRight, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "security" | "notifications" | "automation" | "system";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType; roles?: string[] }[] = [
  { id: "profile",       label: "Profile",      icon: User },
  { id: "security",      label: "Security",     icon: Key },
  { id: "notifications", label: "Notifications",icon: Bell },
  { id: "automation",    label: "Automation",   icon: Zap, roles: ["super_admin", "finance"] },
  { id: "system",        label: "System",       icon: Database, roles: ["super_admin"] },
];

function SaveBanner({ success, error }: { success: boolean; error: string }) {
  if (success) return (
    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
      <CheckCircle2 className="w-4 h-4 shrink-0" />
      Saved successfully
    </div>
  );
  if (error) return (
    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {error}
    </div>
  );
  return null;
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName:  user?.lastName  || "",
    email:     user?.email     || "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true); setSuccess(false); setError("");
    try {
      const res = await fetch(`/api/v1/users/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName }),
      });
      const json = await res.json();
      if (json.success) setSuccess(true);
      else setError(json.error || "Failed to save");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>
        <p className="text-xs text-gray-400 mt-0.5">Update your name and contact details</p>
      </div>
      <SaveBanner success={success} error={error} />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-gray-50">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
            {form.firstName[0]}{form.lastName[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{form.firstName} {form.lastName}</p>
            <p className="text-xs text-gray-400">{form.email}</p>
            <p className="text-xs text-gray-400 capitalize mt-0.5">{user?.role?.replace("_", " ")} {user?.branch ? `· ${user.branch}` : ""}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>First Name</Label>
            <Input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Last Name</Label>
            <Input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Email Address</Label>
            <Input value={form.email} disabled className="opacity-50 cursor-not-allowed" />
            <p className="text-xs text-gray-400">Email can only be changed by a Super Admin</p>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────
function SecurityTab() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPws, setShowPws] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handlePasswordChange() {
    setError(""); setSuccess(false);
    if (!form.currentPassword || !form.newPassword) {
      setError("All password fields are required"); return;
    }
    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters"); return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match"); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/users/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword: form.newPassword }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setError(json.error || "Failed to change password");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Security Settings</h2>
        <p className="text-xs text-gray-400 mt-0.5">Manage your password and account security</p>
      </div>
      <SaveBanner success={success} error={error} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Change Password</h3>
        {[
          { id: "currentPassword", label: "Current Password", key: "current" as const },
          { id: "newPassword", label: "New Password", key: "new" as const },
          { id: "confirmPassword", label: "Confirm New Password", key: "confirm" as const },
        ].map(({ id, label, key }) => (
          <div key={id} className="space-y-1">
            <Label>{label}</Label>
            <div className="relative">
              <Input
                type={showPws[key] ? "text" : "password"}
                value={(form as any)[id]}
                onChange={(e) => setForm((p) => ({ ...p, [id]: e.target.value }))}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPws((p) => ({ ...p, [key]: !p[key] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPws[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
        <Button onClick={handlePasswordChange} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Update Password
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Session Info</h3>
        <div className="text-xs text-gray-500 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Account</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Role</span>
            <span className="capitalize">{user?.role?.replace("_", " ")}</span>
          </div>
          {user?.branch && (
            <div className="flex justify-between">
              <span className="text-gray-400">Branch</span>
              <span>{user.branch}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Session expires</span>
            <span>8 hours from login</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────
function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    overdueAlerts: true,
    followUpDue: true,
    rejectionAlerts: true,
    escalationAlerts: true,
    paymentReceived: true,
    weeklyDigest: false,
  });

  const toggle = (k: keyof typeof prefs) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const items = [
    { key: "overdueAlerts" as const, label: "Overdue Claim Alerts", sub: "Notify when claims exceed 60 days outstanding" },
    { key: "followUpDue" as const, label: "Follow-up Reminders", sub: "Remind when follow-up date is reached" },
    { key: "rejectionAlerts" as const, label: "Rejection Alerts", sub: "Notify on claim rejections requiring action" },
    { key: "escalationAlerts" as const, label: "Escalation Notifications", sub: "Alerts when claims are auto-escalated" },
    { key: "paymentReceived" as const, label: "Payment Received", sub: "Confirm when claims are marked as paid" },
    { key: "weeklyDigest" as const, label: "Weekly Summary Digest", sub: "Receive a weekly summary every Monday" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Notification Preferences</h2>
        <p className="text-xs text-gray-400 mt-0.5">Control which in-app notifications you receive</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {items.map(({ key, label, sub }) => (
          <div key={key} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium text-gray-800">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
            <button
              onClick={() => toggle(key)}
              className={cn(
                "relative w-9 h-5 rounded-full transition-colors",
                prefs[key] ? "bg-blue-600" : "bg-gray-200"
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                prefs[key] ? "translate-x-4" : "translate-x-0.5"
              )} />
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        Note: These preferences are saved locally. Server-side notification configuration is managed by your Super Admin.
      </p>
    </div>
  );
}

// ─── Automation Tab ───────────────────────────────────────────────────────────
function AutomationTab() {
  const [running, setRunning] = useState<"followup" | "escalation" | "all" | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function runEngine(engine: "followup" | "escalation" | "all") {
    setRunning(engine); setResult(null); setError("");
    try {
      const res = await fetch("/api/v1/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ engine }),
      });
      const json = await res.json();
      if (json.success) setResult(json);
      else setError(json.error || "Engine failed");
    } catch {
      setError("Network error");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Automation Engines</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Follow-up and escalation engines run automatically on schedule. Trigger manually for testing.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-green-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {result.message}
          </p>
          <p className="text-xs text-green-600 mt-1">Triggered by: {result.triggeredBy}</p>
          {result.data && (
            <pre className="text-xs text-green-700 mt-2 overflow-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            engine: "followup" as const,
            icon: "🔔",
            label: "Follow-up Engine",
            description: "Scans overdue claims, creates follow-up tasks, and sends notifications",
            schedule: "Daily at 07:00 CAT",
          },
          {
            engine: "escalation" as const,
            icon: "🚨",
            label: "Escalation Engine",
            description: "Escalates approved claims unpaid >30 days and pending claims >60 days",
            schedule: "Daily at 08:00 CAT",
          },
          {
            engine: "all" as const,
            icon: "⚡",
            label: "Run All Engines",
            description: "Trigger both follow-up and escalation engines simultaneously",
            schedule: "Manual only",
          },
        ].map(({ engine, icon, label, description, schedule }) => (
          <div key={engine} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <span className="text-2xl">{icon}</span>
            <h3 className="font-semibold text-gray-900 mt-2">{label}</h3>
            <p className="text-xs text-gray-400 mt-1">{description}</p>
            <p className="text-[10px] text-gray-300 mt-2 flex items-center gap-1">
              <span>Schedule:</span> {schedule}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full"
              onClick={() => runEngine(engine)}
              disabled={running !== null}
            >
              {running === engine ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {running === engine ? "Running…" : "Run Now"}
            </Button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Business Rules</h3>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-start gap-2">
            <span className="text-gray-300">•</span>
            <span>Follow-up tasks are created when no open follow-up task exists for the claim</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-300">•</span>
            <span>Claims pending or approved for 60+ days are auto-escalated to critical priority</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-300">•</span>
            <span>Finance and Super Admin users receive notifications for all escalations</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-300">•</span>
            <span>Default follow-up date is 30 days after submission date</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-300">•</span>
            <span>Partial balance claims are included in follow-up and escalation scans</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── System Tab ───────────────────────────────────────────────────────────────
function SystemTab() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function checkStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/automation/run", { credentials: "include" });
      const json = await res.json();
      if (json.success) setStatus(json.data);
    } catch {}
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">System Information</h2>
        <p className="text-xs text-gray-400 mt-0.5">Platform configuration and health status</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Platform", value: "Link Optical Claims ERP v2.0" },
          { label: "Stack", value: "Next.js 16 · MongoDB · Node.js" },
          { label: "Database", value: "MongoDB Atlas" },
          { label: "Auth", value: "JWT · HttpOnly cookies · 8h sessions" },
          { label: "Scheduler", value: "node-cron · CAT timezone" },
          { label: "Currencies", value: "USD · ZWG (dual-currency)" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
            <p className="text-sm font-medium text-gray-800 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Automation Engine Status</h3>
          <Button variant="outline" size="sm" onClick={checkStatus} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Check Status"}
          </Button>
        </div>
        {status ? (
          <div className="space-y-3 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>Status: <span className="font-semibold text-green-600">{status.status}</span></span>
            </div>
            <div className="space-y-1">
              {Object.entries(status.schedule || {}).map(([k, v]) => (
                <div key={k} className="flex gap-4">
                  <span className="text-gray-400 capitalize w-24">{k}:</span>
                  <span>{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">Click "Check Status" to query the automation engine</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Data Model Overview</h3>
        <div className="grid grid-cols-3 gap-3 text-xs">
          {[
            { model: "Claims", desc: "Core entity with full audit trail and dual-currency support" },
            { model: "Patients", desc: "Patient registry linked to claims" },
            { model: "Medical Aids", desc: "Provider directory with benefit limits" },
            { model: "Branches", desc: "5 branches: Robinson House, Kensington, Honey Dew, Chipinge, Chiredzi" },
            { model: "Users", desc: "RBAC: Super Admin, Finance, Receptionist, Branch Manager, Auditor" },
            { model: "Audit Logs", desc: "Immutable activity trail for all system actions" },
            { model: "Tasks", desc: "Auto-generated and manual tasks linked to claims" },
            { model: "Notifications", desc: "In-app alerts with priority levels and expiry" },
          ].map(({ model, desc }) => (
            <div key={model} className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-800 text-xs">{model}</p>
              <p className="text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const visibleTabs = TABS.filter(
    (t) => !t.roles || (user && t.roles.includes(user.role))
  );

  const TabContent = {
    profile:       ProfileTab,
    security:      SecurityTab,
    notifications: NotificationsTab,
    automation:    AutomationTab,
    system:        SystemTab,
  }[activeTab];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage your account, preferences, and system configuration
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar nav */}
          <div className="w-48 shrink-0">
            <nav className="space-y-1">
              {visibleTabs.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                      activeTab === t.id
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <TabContent />
          </div>
        </div>
      </div>
    </div>
  );
}