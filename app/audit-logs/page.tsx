// FILE: app/audit-logs/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Shield, Search, Filter, ChevronRight, Loader2, X, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface AuditLog {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  userName?: string;
  ipAddress?: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedFields?: string[];
  description?: string;
  success: boolean;
  errorMessage?: string;
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

const ACTION_COLORS: Record<string, string> = {
  CREATE:         "bg-green-100 text-green-700",
  UPDATE:         "bg-blue-100 text-blue-700",
  DELETE:         "bg-red-100 text-red-700",
  LOGIN:          "bg-gray-100 text-gray-600",
  LOGOUT:         "bg-gray-100 text-gray-500",
  EXPORT:         "bg-purple-100 text-purple-700",
  STATUS_CHANGE:  "bg-indigo-100 text-indigo-700",
  RESUBMISSION:   "bg-cyan-100 text-cyan-700",
  PAYMENT:        "bg-emerald-100 text-emerald-700",
  PARTIAL_PAYMENT:"bg-orange-100 text-orange-700",
  REJECTION:      "bg-red-100 text-red-700",
  ESCALATION:     "bg-red-200 text-red-800",
  FOLLOW_UP_SET:  "bg-yellow-100 text-yellow-700",
};

const ENTITY_ICONS: Record<string, string> = {
  Claim: "📋",
  Patient: "👤",
  MedicalAid: "🏥",
  Branch: "🏢",
  User: "👤",
  Task: "✅",
  Report: "📊",
  System: "⚙️",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function AuditLogsPage() {
  const { user } = useAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (actionFilter !== "all") params.set("action", actionFilter);
    if (entityFilter !== "all") params.set("entityType", entityFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", String(page));
    params.set("limit", "50");

    try {
      const res = await fetch(`/api/v1/audit-logs?${params}`, { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setLogs(json.data || []);
        setPagination(json.pagination || null);
      }
    } catch {}
    setLoading(false);
  }, [actionFilter, entityFilter, dateFrom, dateTo, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (!["super_admin", "finance", "auditor"].includes(user?.role || "")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">Access Restricted</p>
          <p className="text-gray-400 text-xs mt-1">Audit logs are available to admins and auditors only</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Audit Logs
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {pagination ? `${pagination.total.toLocaleString()} events` : "Complete system activity trail"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
            onClick={() => {
              const params = new URLSearchParams();
              if (actionFilter !== "all") params.set("action", actionFilter);
              if (entityFilter !== "all") params.set("entityType", entityFilter);
              window.open(`/api/v1/audit-logs?${params}&limit=1000`, "_blank");
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Action</Label>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {["CREATE","UPDATE","DELETE","LOGIN","EXPORT","STATUS_CHANGE","RESUBMISSION","PAYMENT","REJECTION","ESCALATION"].map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Entity Type</Label>
            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {["Claim","Patient","MedicalAid","Branch","User","Task","Report","System"].map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-36"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-36"
            />
          </div>
          {(actionFilter !== "all" || entityFilter !== "all" || dateFrom || dateTo) && (
            <button
              onClick={() => { setActionFilter("all"); setEntityFilter("all"); setDateFrom(""); setDateTo(""); setPage(1); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-1.5 rounded-lg"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Log list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-6 h-6 text-gray-300 animate-spin mx-auto" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center">
              <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No audit logs found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs.map((log) => (
                <div key={log._id}>
                  <button
                    className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(expandedId === log._id ? null : log._id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-base mt-0.5 shrink-0">{ENTITY_ICONS[log.entityType] || "⚙️"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
                            ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600"
                          )}>
                            {log.action}
                          </span>
                          <span className="text-sm font-semibold text-gray-800">
                            {log.entityType}
                            {log.entityLabel && (
                              <span className="text-gray-500 font-normal ml-1">· {log.entityLabel}</span>
                            )}
                          </span>
                          {!log.success && (
                            <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full font-semibold">
                              FAILED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                          {log.userName && <span>{log.userName}</span>}
                          {log.userEmail && !log.userName && <span>{log.userEmail}</span>}
                          {log.userRole && <span className="capitalize">{log.userRole.replace("_", " ")}</span>}
                          {log.ipAddress && <span>{log.ipAddress}</span>}
                          <span className="ml-auto">{timeAgo(log.createdAt)}</span>
                        </div>
                        {log.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{log.description}</p>
                        )}
                        {log.changedFields && log.changedFields.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Changed: {log.changedFields.join(", ")}
                          </p>
                        )}
                        {log.errorMessage && (
                          <p className="text-xs text-red-500 mt-0.5">{log.errorMessage}</p>
                        )}
                      </div>
                      <ChevronRight className={cn(
                        "w-4 h-4 text-gray-300 shrink-0 mt-1 transition-transform",
                        expandedId === log._id && "rotate-90"
                      )} />
                    </div>
                  </button>

                  {expandedId === log._id && (
                    <div className="px-5 pb-4 pl-14 bg-gray-50 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-4 py-3 text-xs">
                        <div>
                          <p className="font-semibold text-gray-500 mb-1">Event Details</p>
                          <div className="space-y-1 text-gray-600">
                            <div className="flex gap-2"><span className="text-gray-400 w-24">ID:</span><span className="font-mono text-xs">{log._id}</span></div>
                            <div className="flex gap-2"><span className="text-gray-400 w-24">Time:</span><span>{new Date(log.createdAt).toLocaleString()}</span></div>
                            {log.entityId && <div className="flex gap-2"><span className="text-gray-400 w-24">Entity ID:</span><span className="font-mono text-xs">{String(log.entityId)}</span></div>}
                            {log.ipAddress && <div className="flex gap-2"><span className="text-gray-400 w-24">IP:</span><span>{log.ipAddress}</span></div>}
                          </div>
                        </div>
                        {(log.previousValues || log.newValues) && (
                          <div>
                            <p className="font-semibold text-gray-500 mb-1">Values Changed</p>
                            {log.previousValues && (
                              <div className="mb-2">
                                <p className="text-[10px] text-gray-400 uppercase mb-1">Before</p>
                                <pre className="text-xs text-gray-600 bg-white rounded p-2 overflow-auto max-h-24 border border-gray-100">
                                  {JSON.stringify(log.previousValues, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.newValues && (
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase mb-1">After</p>
                                <pre className="text-xs text-gray-600 bg-white rounded p-2 overflow-auto max-h-24 border border-gray-100">
                                  {JSON.stringify(log.newValues, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total.toLocaleString()} events
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}