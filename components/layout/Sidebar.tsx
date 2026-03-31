"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/dashboard",
    icon: "📊",
    label: "Dashboard",
    description: "Overview & aging",
  },
  {
    href: "/claims",
    icon: "🗂️",
    label: "Claims",
    description: "All claims tracker",
  },
  {
    href: "/claims/new",
    icon: "➕",
    label: "New Claim",
    description: "Log a claim from 263",
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`
        relative flex flex-col bg-gray-900 text-white transition-all duration-300 ease-in-out
        ${collapsed ? "w-16" : "w-56"}
        min-h-screen shrink-0
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <span className="text-xl shrink-0">👁️</span>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold leading-tight whitespace-nowrap">
              Link Optical
            </p>
            <p className="text-[10px] text-gray-400 whitespace-nowrap">
              Claims Tracker
            </p>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col gap-1 p-2 flex-1">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors
                ${active
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
                }
              `}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              {!collapsed && (
                <div className="overflow-hidden">
                  <p className="text-sm font-medium leading-tight whitespace-nowrap">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-gray-500 whitespace-nowrap">
                    {item.description}
                  </p>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider + Info */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Data synced with 263 Health Platform
          </p>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="
          flex items-center justify-center
          border-t border-white/10 py-3
          text-gray-400 hover:text-white hover:bg-white/5
          transition-colors text-xs
        "
      >
        {collapsed ? "→" : "← Collapse"}
      </button>
    </aside>
  );
}