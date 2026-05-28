// FILE: components/layout/AppShell.tsx
// REPLACES existing AppShell — full enterprise nav with auth, notifications, user menu
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import {
  LayoutDashboard, FileText, Users, Building2, Stethoscope,
  BarChart3, Settings, ClipboardList, Bell, LogOut, ChevronLeft,
  ChevronRight, Plus, Search, Activity, Shield, FileBarChart,
  AlertTriangle, CheckCircle, Clock, Zap, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
  requiredPermission?: string;
  children?: NavItem[];
}

const NAV: NavItem[] = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/claims",       label: "Claims",       icon: FileText,    badge: undefined },
  { href: "/patients",     label: "Patients",     icon: Users },
  { href: "/medical-aids", label: "Medical Aids", icon: Stethoscope, requiredPermission: "admin" },
  { href: "/branches",     label: "Branches",     icon: Building2,   requiredPermission: "admin" },
  { href: "/tasks",        label: "Tasks",        icon: ClipboardList },
  { href: "/reports",      label: "Reports",      icon: FileBarChart, requiredPermission: "export" },
  { href: "/analytics",   label: "Analytics",    icon: BarChart3,   requiredPermission: "export" },
  { href: "/activity",     label: "Activity",     icon: Activity,    requiredPermission: "audit" },
  { href: "/audit-logs",   label: "Audit Logs",   icon: Shield,      requiredPermission: "audit" },
  { href: "/users",        label: "Users",        icon: Users,       requiredPermission: "admin" },
  { href: "/settings",     label: "Settings",     icon: Settings,    requiredPermission: "admin" },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin:    "Super Admin",
  finance:        "Finance",
  receptionist:   "Receptionist",
  branch_manager: "Branch Manager",
  auditor:        "Auditor",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin:    "bg-purple-900/50 text-purple-300 border-purple-700",
  finance:        "bg-green-900/50 text-green-300 border-green-700",
  receptionist:   "bg-blue-900/50 text-blue-300 border-blue-700",
  branch_manager: "bg-orange-900/50 text-orange-300 border-orange-700",
  auditor:        "bg-gray-800 text-gray-300 border-gray-700",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, hasPermission, loading } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  // Don't render shell on login page
  const isPublicPage = pathname.startsWith("/login");
  if (isPublicPage) return <>{children}</>;
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const visibleNav = NAV.filter(item =>
    !item.requiredPermission || hasPermission(item.requiredPermission)
  );

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 flex flex-col bg-gray-950 border-r border-gray-800/60 transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center border-b border-gray-800/60 h-16 shrink-0",
          collapsed ? "justify-center px-0" : "px-5 gap-3"
        )}>
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">LO</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">Link Optical</p>
              <p className="text-gray-500 text-[10px] truncate">Claims ERP</p>
            </div>
          )}
        </div>

        {/* Currency toggle */}
        {!collapsed && (
          <div className="mx-3 mt-3 flex rounded-lg overflow-hidden border border-gray-800 shrink-0">
            {(["USD", "ZWG"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={cn(
                  "flex-1 py-1.5 text-xs font-semibold transition-colors",
                  currency === c
                    ? "bg-blue-600 text-white"
                    : "bg-transparent text-gray-500 hover:text-gray-300"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative",
                  active
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/60",
                  collapsed && "justify-center px-0"
                )}>
                  <Icon className={cn("w-4 h-4 shrink-0", active && "text-blue-400")} />
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                  {!collapsed && item.badge !== undefined && (
                    <span className={cn(
                      "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      item.badgeColor || "bg-red-600 text-white"
                    )}>
                      {item.badge}
                    </span>
                  )}
                  {/* Tooltip when collapsed */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-gray-200 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className={cn(
          "border-t border-gray-800/60 p-3 shrink-0",
          collapsed ? "flex justify-center" : ""
        )}>
          {collapsed ? (
            <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors p-1">
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">
                    {user.firstName[0]}{user.lastName[0]}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-gray-500 text-[10px] truncate">{user.email}</p>
                </div>
              </div>
              <div className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                ROLE_COLORS[user.role] || "bg-gray-800 text-gray-300 border-gray-700"
              )}>
                {ROLE_LABELS[user.role] || user.role}
                {user.branch && ` · ${user.branch}`}
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors lg:flex"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3" />
            : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 gap-4 shrink-0">
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Global search */}
          <div className="flex-1 max-w-md hidden sm:block">
            <Link href="/search">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl text-sm text-gray-400 hover:bg-gray-200 transition-colors cursor-pointer">
                <Search className="w-4 h-4 shrink-0" />
                <span>Search claims, patients…</span>
                <kbd className="ml-auto text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
              </div>
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* New claim quick action */}
            {hasPermission("create") && (
              <Link href="/claims/new">
                <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  New Claim
                </button>
              </Link>
            )}

            {/* Notifications */}
            <Link href="/notifications">
              <button className="relative w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            </Link>

            {/* Currency (mobile) */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200 sm:hidden">
              {(["USD", "ZWG"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={cn(
                    "px-2 py-1 text-xs font-semibold transition-colors",
                    currency === c ? "bg-blue-600 text-white" : "bg-white text-gray-500"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}