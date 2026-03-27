"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDaysOutstanding, formatUSD } from "@/lib/utils/claims";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [claims, setClaims] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/claims")
      .then((r) => r.json())
      .then((j) => setClaims(j.data || []));
  }, []);

 const unpaid = claims.filter(
  (c) => c.status === "pending" || c.status === "approved"
);
  const totalOutstanding = unpaid.reduce((sum, c) => sum + c.amount, 0);

  const bucket0_30  = unpaid.filter((c) => getDaysOutstanding(c.submissionDate) <= 30);
  const bucket31_60 = unpaid.filter((c) => {
    const d = getDaysOutstanding(c.submissionDate);
    return d > 30 && d <= 60;
  });
  const bucket60plus = unpaid.filter((c) => getDaysOutstanding(c.submissionDate) > 60);

  // Per medical aid breakdown
  const byAid: Record<string, number> = {};
  unpaid.forEach((c) => {
    byAid[c.medicalAid] = (byAid[c.medicalAid] || 0) + c.amount;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Claims Dashboard</h1>
        <Link href="/claims/new"><Button>+ New Claim</Button></Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Total Outstanding</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{formatUSD(totalOutstanding)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">0–30 Days</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatUSD(bucket0_30.reduce((s, c) => s + c.amount, 0))}</p>
            <p className="text-xs text-muted-foreground">{bucket0_30.length} claims</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">31–60 Days</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{formatUSD(bucket31_60.reduce((s, c) => s + c.amount, 0))}</p>
            <p className="text-xs text-muted-foreground">{bucket31_60.length} claims</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">60+ Days ⚠️</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-700">{formatUSD(bucket60plus.reduce((s, c) => s + c.amount, 0))}</p>
            <p className="text-xs text-muted-foreground">{bucket60plus.length} claims</p>
          </CardContent>
        </Card>
      </div>

      {/* Per Medical Aid */}
      <Card>
        <CardHeader><CardTitle>Outstanding by Medical Aid</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(byAid)
            .sort((a, b) => b[1] - a[1])
            .map(([aid, amount]) => (
              <div key={aid} className="flex items-center justify-between">
                <span className="font-medium">{aid}</span>
                <span className="text-red-600 font-semibold">{formatUSD(amount)}</span>
              </div>
            ))}
          {Object.keys(byAid).length === 0 && (
            <p className="text-muted-foreground text-sm">No outstanding claims</p>
          )}
        </CardContent>
      </Card>

      <Link href="/claims">
        <Button variant="outline">View All Claims →</Button>
      </Link>
    </div>
  );
}