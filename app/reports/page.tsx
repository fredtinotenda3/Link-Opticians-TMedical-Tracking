// FILE: app/reports/page.tsx
"use client";

import { useState } from "react";
import {
  FileBarChart, Download, Loader2, Calendar, Building2,
  Stethoscope, Filter, ChevronDown, AlertCircle, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BRANCHES, MEDICAL_AIDS } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";

type ReportType =
  | "outstanding"
  | "aging"
  | "rejection"
  | "payment"
  | "branch"
  | "medical_aid"
  | "followup"
  | "monthly"
  | "full_audit";

const REPORT_TYPES: { value: ReportType; label: string; description: string; icon: string; roles?: string[] }[] = [
  {
    value: "outstanding",
    label: "Outstanding Claims",
    description: "All active claims — pending, approved, and partial balances",
    icon: "📋",
  },
  {
    value: "aging",
    label: "Aging Analysis",
    description: "Claims grouped by 0–30, 31–60, and 60+ day buckets",
    icon: "⏱",
  },
  {
    value: "rejection",
    label: "Rejection Report",
    description: "Rejected claims with reasons and resubmission status",
    icon: "❌",
  },
  {
    value: "payment",
    label: "Payment Report",
    description: "Paid and partial payment claims with collection stats",
    icon: "💰",
  },
  {
    value: "branch",
    label: "Branch Performance",
    description: "Claims breakdown and collection rates by branch",
    icon: "🏢",
  },
  {
    value: "medical_aid",
    label: "Medical Aid Performance",
    description: "Outstanding amounts, rejection rates, and avg payment days per provider",
    icon: "🏥",
  },
  {
    value: "followup",
    label: "Follow-up Required",
    description: "Claims that have passed their follow-up date",
    icon: "🔔",
  },
  {
    value: "monthly",
    label: "Monthly Trend",
    description: "Month-by-month submission, payment, and rejection rates",
    icon: "📈",
  },
  {
    value: "full_audit",
    label: "Full Audit Log",
    description: "Complete system activity trail — admin/auditor only",
    icon: "🔍",
    roles: ["super_admin", "auditor"],
  },
];

interface ReportResult {
  title: string;
  subtitle: string;
  generatedAt: string;
  headers: string[];
  rows: Record<string, string | number | undefined>[];
  summary: Record<string, string | number>;
  totalRows: number;
}

export default function ReportsPage() {
  const { user, hasPermission } = useAuth();
  const [selectedType, setSelectedType] = useState<ReportType>("outstanding");
  const [currency, setCurrency] = useState<"USD" | "ZWG">("USD");
  const [branch, setBranch] = useState("all");
  const [medicalAid, setMedicalAid] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [format, setFormat] = useState<"json" | "csv">("json");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState("");

  const selectedReport = REPORT_TYPES.find((r) => r.value === selectedType)!;
  const visibleReports = REPORT_TYPES.filter(
    (r) => !r.roles || (user && r.roles.includes(user.role))
  );

  async function generateReport() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const body: any = {
        reportType: selectedType,
        currency,
        format,
      };
      if (branch !== "all") body.branch = branch;
      if (medicalAid !== "all") body.medicalAid = medicalAid;
      if (dateFrom) body.dateFrom = dateFrom;
      if (dateTo) body.dateTo = dateTo;

      if (format === "csv") {
        const res = await fetch("/api/v1/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const json = await res.json();
          setError(json.error || "Failed to generate report");
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedType}-report-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      const res = await fetch("/api/v1/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
      } else {
        setError(json.error || "Failed to generate report");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    setFormat("csv");
    setTimeout(generateReport, 0);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileBarChart className="w-5 h-5" />
              Reports
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Generate and export structured reports for claims analysis
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report type selector */}
          <div className="lg:col-span-1 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Report Type
            </p>
            <div className="space-y-2">
              {visibleReports.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setSelectedType(r.value)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedType === r.value
                      ? "bg-gray-900 border-gray-900 text-white"
                      : "bg-white border-gray-100 text-gray-700 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base mt-0.5">{r.icon}</span>
                    <div>
                      <p className={`text-sm font-semibold ${selectedType === r.value ? "text-white" : "text-gray-800"}`}>
                        {r.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${selectedType === r.value ? "text-gray-300" : "text-gray-400"}`}>
                        {r.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filters + Generate */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" />
                Filters
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as "USD" | "ZWG")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="ZWG">ZWG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Branch</Label>
                  <Select value={branch} onValueChange={setBranch}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Medical Aid</Label>
                  <Select value={medicalAid} onValueChange={setMedicalAid}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Medical Aids</SelectItem>
                      {MEDICAL_AIDS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Date From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Date To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <Button
                  onClick={() => { setFormat("json"); setTimeout(generateReport, 0); }}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileBarChart className="w-4 h-4" />}
                  Generate Report
                </Button>
                <Button
                  variant="outline"
                  onClick={downloadCSV}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Result */}
            {result && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {result.title}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">{result.subtitle}</p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Generated {new Date(result.generatedAt).toLocaleString()} · {result.totalRows} rows
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadCSV} className="flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </Button>
                </div>

                {/* Summary */}
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4">
                  {Object.entries(result.summary).map(([k, v]) => (
                    <div key={k} className="text-xs">
                      <span className="text-gray-400">{k}: </span>
                      <span className="font-semibold text-gray-800">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white border-b border-gray-100">
                      <tr>
                        {result.headers.map((h) => (
                          <th key={h} className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.slice(0, 200).map((row, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          {result.headers.map((h) => (
                            <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                              {row[h] ?? "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {result.rows.length > 200 && (
                        <tr>
                          <td colSpan={result.headers.length} className="px-3 py-3 text-center text-xs text-gray-400">
                            Showing 200 of {result.totalRows} rows · Export CSV for full data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {result.rows.length === 0 && (
                    <div className="py-12 text-center text-gray-400 text-sm">
                      No data found for the selected filters
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}