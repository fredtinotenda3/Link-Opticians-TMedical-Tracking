// FILE: app/search/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, FileText, Users, X, Loader2, Clock, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: "claim" | "patient";
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
  status?: string;
  amount?: number;
  currency?: "USD" | "ZWG";
}

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-700",
  approved:   "bg-blue-100 text-blue-700",
  rejected:   "bg-red-100 text-red-700",
  paid:       "bg-green-100 text-green-700",
  partial:    "bg-orange-100 text-orange-700",
  superseded: "bg-gray-100 text-gray-500",
  escalated:  "bg-red-200 text-red-800",
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { currency } = useCurrency();

  useEffect(() => {
    inputRef.current?.focus();
    const saved = localStorage.getItem("lo_recent_searches");
    if (saved) setRecentSearches(JSON.parse(saved).slice(0, 5));
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const debounce = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query]);

  async function performSearch(q: string) {
    setLoading(true);
    try {
      const [claimsRes, patientsRes] = await Promise.all([
        fetch(`/api/v1/claims?search=${encodeURIComponent(q)}&limit=10`, { credentials: "include" }),
        fetch(`/api/v1/patients?search=${encodeURIComponent(q)}&limit=5`, { credentials: "include" }),
      ]);

      const claimsData = claimsRes.ok ? await claimsRes.json() : { data: [] };
      const patientsData = patientsRes.ok ? await patientsRes.json() : { data: [] };

      const claimResults: SearchResult[] = (claimsData.data || []).map((c: any) => ({
        type: "claim" as const,
        id: c._id,
        title: c.claimNumber,
        subtitle: c.patientName,
        meta: `${c.medicalAid} · ${c.branch}`,
        href: `/claims/${c._id}`,
        status: c.status,
        amount: c.currency === "ZWG" ? (c.amountZWG || c.amount) : c.amount,
        currency: c.currency,
      }));

      const patientResults: SearchResult[] = (patientsData.data || []).map((p: any) => ({
        type: "patient" as const,
        id: p._id,
        title: `${p.firstName} ${p.lastName}`,
        subtitle: p.memberNumber || p.nationalId || "—",
        meta: `${p.medicalAid || "No medical aid"} · ${p.branch}`,
        href: `/patients/${p._id}`,
      }));

      setResults([...claimResults, ...patientResults]);

      // Save recent search
      if (q.trim()) {
        const updated = [q, ...recentSearches.filter((r) => r !== q)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem("lo_recent_searches", JSON.stringify(updated));
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  function clearRecent() {
    setRecentSearches([]);
    localStorage.removeItem("lo_recent_searches");
  }

  const claimResults = results.filter((r) => r.type === "claim");
  const patientResults = results.filter((r) => r.type === "patient");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3">
            {loading
              ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
              : <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
            }
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search claims, patients, member numbers…"
              className="flex-1 bg-transparent text-gray-900 placeholder:text-gray-400 text-sm outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")}>
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Empty state — show recent searches */}
        {!query && (
          <div>
            {recentSearches.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Recent searches</p>
                  <button onClick={clearRecent} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((s) => (
                    <button
                      key={s}
                      onClick={() => setQuery(s)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors text-left"
                    >
                      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Search for claims by claim number, patient name, or member number</p>
                <p className="text-gray-300 text-xs mt-1">Type at least 2 characters to search</p>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No results found for <span className="font-semibold">&ldquo;{query}&rdquo;</span></p>
            <p className="text-gray-400 text-xs mt-1">Try a different claim number, patient name, or member number</p>
          </div>
        )}

        {claimResults.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              Claims ({claimResults.length})
            </p>
            <div className="space-y-2">
              {claimResults.map((r) => (
                <Link key={r.id} href={r.href}>
                  <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-gray-200 hover:shadow-sm transition-all group">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono font-semibold text-gray-900">{r.title}</p>
                        {r.status && (
                          <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-semibold", STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600")}>
                            {r.status}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{r.subtitle}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{r.meta}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      {r.amount !== undefined && r.currency && (
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(r.amount, r.currency)}
                        </p>
                      )}
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {patientResults.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              Patients ({patientResults.length})
            </p>
            <div className="space-y-2">
              {patientResults.map((r) => (
                <Link key={r.id} href={r.href}>
                  <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-gray-200 hover:shadow-sm transition-all group">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Member: {r.subtitle}</p>
                      <p className="text-xs text-gray-400">{r.meta}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors ml-4 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}