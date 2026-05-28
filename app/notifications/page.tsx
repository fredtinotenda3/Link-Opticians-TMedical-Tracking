// FILE: app/notifications/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, AlertTriangle, Clock, DollarSign, RotateCcw, ClipboardList, Zap, Info } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  claimId?: string;
  claimNumber?: string;
  isRead: boolean;
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  overdue_claim:         AlertTriangle,
  follow_up_due:         Clock,
  rejection_alert:       AlertTriangle,
  escalation:            Zap,
  payment_received:      DollarSign,
  resubmission_reminder: RotateCcw,
  task_assigned:         ClipboardList,
  system_alert:          Info,
};

const PRIORITY_COLORS: Record<string, string> = {
  low:      "border-l-gray-300",
  medium:   "border-l-blue-400",
  high:     "border-l-amber-400",
  critical: "border-l-red-500",
};

const PRIORITY_DOT: Record<string, string> = {
  low:      "bg-gray-400",
  medium:   "bg-blue-500",
  high:     "bg-amber-500",
  critical: "bg-red-500",
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  async function fetchNotifications() {
    setLoading(true);
    const res = await fetch("/api/v1/notifications?limit=100", { credentials: "include" });
    const json = await res.json();
    setNotifications(json.data || []);
    setUnreadCount(json.unreadCount || 0);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchNotifications(); }, []);

  async function markAllRead() {
    await fetch("/api/v1/notifications/read-all", { method: "POST", credentials: "include" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  const filtered = filter === "unread"
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">System alerts, follow-ups, and escalations</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize",
                filter === f
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
              )}
            >
              {f} {f === "unread" && unreadCount > 0 && `(${unreadCount})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => {
              const Icon = TYPE_ICONS[n.type] || Bell;
              return (
                <div
                  key={n._id}
                  className={cn(
                    "bg-white rounded-2xl border-l-4 border border-gray-100 px-4 py-4 transition-colors",
                    PRIORITY_COLORS[n.priority],
                    !n.isRead && "ring-1 ring-blue-100"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      n.priority === "critical" ? "bg-red-100" :
                      n.priority === "high" ? "bg-amber-100" :
                      n.priority === "medium" ? "bg-blue-100" : "bg-gray-100"
                    )}>
                      <Icon className={cn(
                        "w-4 h-4",
                        n.priority === "critical" ? "text-red-600" :
                        n.priority === "high" ? "text-amber-600" :
                        n.priority === "medium" ? "text-blue-600" : "text-gray-500"
                      )} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm font-semibold",
                          n.isRead ? "text-gray-600" : "text-gray-900"
                        )}>
                          {n.title}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {!n.isRead && (
                            <span className={cn("w-2 h-2 rounded-full shrink-0", PRIORITY_DOT[n.priority])} />
                          )}
                          <span className="text-[10px] text-gray-400">{timeAgo(n.createdAt)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                      {n.claimId && n.claimNumber && (
                        <Link
                          href={`/claims/${n.claimId}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2 font-medium"
                        >
                          View claim {n.claimNumber} →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}