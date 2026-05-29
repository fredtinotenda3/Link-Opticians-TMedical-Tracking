// FILE: app/activity/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Activity, Clock, CheckCircle2, XCircle, AlertTriangle, DollarSign, RotateCcw, Loader2, Zap, FileText, User } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

interface ActivityEvent {
  _id: string;
  action: string;
  entityType: string;
  entityLabel?: string;
  entityId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  newValues?: Record<string, any>;
  previousValues?: Record<string, any>;
  success: boolean;
  createdAt: string;
}

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  CREATE:         { label: "Created",         icon: CheckCircle2,   color: "text-green-600",  bgColor: "bg-green-100" },
  UPDATE:         { label: "Updated",         icon: FileText,       color: "text-blue-600",   bgColor: "bg-blue-100" },
  DELETE:         { label: "Deleted",         icon: XCircle,        color: "text-red-600",    bgColor: "bg-red-100" },
  STATUS_CHANGE:  { label: "Status changed",  icon: Zap,            color: "text-indigo-600", bgColor: "bg-indigo-100" },
  REJECTION:      { label: "Rejected",        icon: XCircle,        color: "text-red-600",    bgColor: "bg-red-100" },
  PAYMENT:        { label: "Payment received",icon: DollarSign,     color: "text-green-600",  bgColor: "bg-green-100" },
  PARTIAL_PAYMENT:{ label: "Partial payment", icon: DollarSign,     color: "text-orange-600", bgColor: "bg-orange-100" },
  RESUBMISSION:   { label: "Resubmitted",     icon: RotateCcw,      color: "text-cyan-600",   bgColor: "bg-cyan-100" },
  ESCALATION:     { label: "Escalated",       icon: AlertTriangle,  color: "text-red-700",    bgColor: "bg-red-100" },
  FOLLOW_UP_SET:  { label: "Follow-up set",   icon: Clock,          color: "text-yellow-600", bgColor: "bg-yellow-100" },
  LOGIN:          { label: "Logged in",       icon: User,           color: "text-gray-500",   bgColor: "bg-gray-100" },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function groupByDate(events: ActivityEvent[]) {
  const groups: Record<string, ActivityEvent[]> = {};
  events.forEach((e) => {
    const d = new Date(e.createdAt);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86400000);
    let label: string;
    if (d.toDateString() === today.toDateString()) {
      label = "Today";
    } else if (d.toDateString() === yesterday.toDateString()) {
      label = "Yesterday";
    } else {
      label = d.toLocaleDateString("en-ZW", { weekday: "long", month: "short", day: "numeric" });
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(e);
  });
  return groups;
}

function getActivityDescription(event: ActivityEvent): string {
  const vals = event.newValues || {};
  if (event.action === "STATUS_CHANGE") {
    const from = event.previousValues?.status;
    const to = vals.status;
    return from && to ? `${from} → ${to}` : to || "";
  }
  if (event.action === "PARTIAL_PAYMENT") {
    const amt = vals.amountPaid;
    const cur = vals.currency || "USD";
    return amt ? `${formatCurrency(parseFloat(String(amt)), cur as "USD" | "ZWG")} recorded` : "";
  }
  if (event.action === "FOLLOW_UP_SET") {
    const d = vals.followUpDate;
    return d ? `Due: ${new Date(d).toLocaleDateString()}` : "";
  }
  if (event.action === "REJECTION") {
    const reason = vals.rejectionReason || vals.reason;
    return reason ? `"${reason}"` : "";
  }
  if (event.action === "RESUBMISSION") {
    const meta = event.newValues as any;
    return meta?.originalClaimNumber ? `from ${meta.originalClaimNumber}` : "";
  }
  return "";
}

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  async function fetchActivity(p = 1, append = false) {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(p),
      limit: "40",
      action: "all",
    });
    try {
      const res = await fetch(`/api/v1/audit-logs?${params}`, { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        if (append) {
          setEvents((prev) => [...prev, ...(json.data || [])]);
        } else {
          setEvents(json.data || []);
        }
        setTotal(json.pagination?.total || 0);
        setHasMore(json.pagination?.hasNext || false);
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchActivity(1); }, []);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchActivity(next, true);
  }

  const grouped = groupByDate(events);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Feed
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Real-time system activity · {total.toLocaleString()} events total
            </p>
          </div>
          <Link href="/audit-logs">
            <button className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              Full Audit Log →
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {loading && events.length === 0 ? (
          <div className="py-20 text-center">
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin mx-auto" />
          </div>
        ) : events.length === 0 ? (
          <div className="py-20 text-center">
            <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([dateLabel, dayEvents]) => (
              <div key={dateLabel}>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                  {dateLabel}
                </p>
                <div className="relative pl-8">
                  {/* Timeline line */}
                  <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100" />

                  <div className="space-y-1">
                    {dayEvents.map((event, i) => {
                      const meta = ACTION_META[event.action] || { label: event.action, icon: Activity, color: "text-gray-500", bgColor: "bg-gray-100" };
                      const Icon = meta.icon;
                      const desc = getActivityDescription(event);
                      const isClaimEvent = event.entityType === "Claim" && event.entityId;

                      return (
                        <div key={event._id} className="relative flex gap-3 group">
                          {/* Timeline dot */}
                          <div className={cn(
                            "absolute -left-8 mt-2.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10",
                            event.success ? meta.bgColor : "bg-red-50"
                          )}>
                            <Icon className={cn("w-3.5 h-3.5", event.success ? meta.color : "text-red-500")} />
                          </div>

                          {/* Content */}
                          <div className={cn(
                            "flex-1 bg-white rounded-xl border border-gray-100 px-4 py-3 transition-all",
                            isClaimEvent && "hover:border-gray-200 hover:shadow-sm cursor-pointer"
                          )}
                            onClick={() => {
                              if (isClaimEvent) window.location.href = `/claims/${event.entityId}`;
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-gray-800">
                                    {meta.label}
                                  </span>
                                  <span className="text-xs text-gray-400">{event.entityType}</span>
                                  {event.entityLabel && (
                                    <span className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                      {event.entityLabel}
                                    </span>
                                  )}
                                </div>
                                {desc && (
                                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                                  {event.userName && <span>{event.userName}</span>}
                                  {!event.userName && event.userEmail && <span>{event.userEmail}</span>}
                                  {event.userRole && (
                                    <span className="capitalize">{event.userRole.replace("_", " ")}</span>
                                  )}
                                  {!event.success && (
                                    <span className="text-red-500 font-semibold">● Failed</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[10px] text-gray-300 shrink-0 mt-1">
                                {timeAgo(event.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="flex items-center gap-2 mx-auto px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Load more activity
                </button>
              </div>
            )}

            {!hasMore && events.length > 0 && (
              <p className="text-center text-xs text-gray-300 pt-2">
                All {total.toLocaleString()} events loaded
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}