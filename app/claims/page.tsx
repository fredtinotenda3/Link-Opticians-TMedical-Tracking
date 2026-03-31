"use client";

import { PartialPaymentDialog } from "@/components/claims/PartialPaymentDialog";
import { FollowUpDialog } from "@/components/claims/FollowUpDialog";
import { isFollowUpDue, getFollowUpDate } from "@/lib/utils/claims";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MEDICAL_AIDS, BRANCHES, STATUSES } from "@/lib/constants";
import { getDaysOutstanding, getAgingBucket, formatUSD } from "@/lib/utils/claims";
import Link from "next/link";
import { RejectDialog } from "@/components/claims/RejectDialog";
import { ResubmitDialog } from "@/components/claims/ResubmitDialog";
import { exportToCSV } from "@/lib/utils/export";
import { DeleteDialog } from "@/components/claims/DeleteDialog";

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-800",
  approved:   "bg-blue-100 text-blue-800",
  rejected:   "bg-red-100 text-red-800",
  paid:       "bg-green-100 text-green-800",
  partial:    "bg-orange-100 text-orange-800",
  superseded: "bg-gray-100 text-gray-400 line-through",
};

const AGING_COLORS: Record<string, string> = {
  current:  "text-green-600",
  warning:  "text-yellow-600 font-semibold",
  critical: "text-red-600 font-bold",
};

export default function ClaimsPage() {
  const [claims, setClaims]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatus]   = useState("all");
  const [aidFilter, setAid]         = useState("all");
  const [branchFilter, setBranch]   = useState("all");
  const [search, setSearch]         = useState("");

  async function fetchClaims() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (aidFilter !== "all")    params.set("medicalAid", aidFilter);
    if (branchFilter !== "all") params.set("branch", branchFilter);

    const res  = await fetch(`/api/claims?${params.toString()}`);
    const json = await res.json();
    setClaims(json.data || []);
    setLoading(false);
  }

  useEffect(() => { fetchClaims(); }, [statusFilter, aidFilter, branchFilter]);

  const filtered = claims.filter((c) =>
    search === "" ||
    c.patientName.toLowerCase().includes(search.toLowerCase()) ||
    c.claimNumber.toLowerCase().includes(search.toLowerCase())
  );

  async function updateStatus(id: string, status: string) {
    const body: any = { status };
    if (status === "paid") body.paidDate = new Date().toISOString();
    await fetch(`/api/claims/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    fetchClaims();
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Claims Tracker</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const date = new Date().toISOString().split("T")[0];
              exportToCSV(filtered, `link-optical-claims-${date}.csv`);
            }}
          >
            Export CSV
          </Button>
          <Link href="/claims/new">
            <Button>+ New Claim</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search patient or claim #"
          className="w-60"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select onValueChange={setStatus} defaultValue="all">
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select onValueChange={setAid} defaultValue="all">
          <SelectTrigger className="w-44"><SelectValue placeholder="Medical Aid" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Medical Aids</SelectItem>
            {MEDICAL_AIDS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select onValueChange={setBranch} defaultValue="all">
          <SelectTrigger className="w-44"><SelectValue placeholder="Branch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim #</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Medical Aid</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Days Out</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((claim) => {
              const days    = getDaysOutstanding(claim.submissionDate, claim.paidDate);
              const bucket  = getAgingBucket(days);
              const isDue   = (claim.status === "pending" || claim.status === "approved")
                && isFollowUpDue(claim.submissionDate, claim.followUpDate);
          return (
                    <TableRow
      key={claim._id}
      className={isDue ? "bg-orange-50 border-l-2 border-l-orange-400" : ""}
    >
      <TableCell className="font-mono text-sm">{claim.claimNumber}</TableCell>
      <TableCell>
        <div>
          <p>{claim.patientName}</p>
          {isDue && (
            <p className="text-[10px] text-orange-500 font-semibold">
              ⏰ Follow-up due
            </p>
          )}
        </div>
      </TableCell>
      <TableCell>{claim.medicalAid}</TableCell>
      <TableCell>{claim.branch}</TableCell>
      <TableCell>
        <div>
          <p>{formatUSD(claim.amount)}</p>
          {claim.partialAmountPaid && (
            <p className="text-[10px] text-orange-500">
              Paid: {formatUSD(claim.partialAmountPaid)}
            </p>
          )}
        </div>
      </TableCell>
      <TableCell>
        {new Date(claim.submissionDate).toLocaleDateString()}
      </TableCell>
      <TableCell className={AGING_COLORS[bucket]}>{days}d</TableCell>
      <TableCell>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[claim.status] || ""}`}>
          {claim.status}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex gap-1 items-center flex-wrap">
          {(claim.status === "pending" || claim.status === "approved") && (
            <>
              <Select onValueChange={(val) => updateStatus(claim._id, val)}>
                <SelectTrigger className="w-28 h-7 text-xs">
                  <SelectValue placeholder="Update" />
                </SelectTrigger>
                <SelectContent>
                  {(["pending", "approved", "paid"] as const).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <PartialPaymentDialog
                claimId={claim._id}
                totalAmount={claim.amount}
                onDone={fetchClaims}
              />
              <RejectDialog claimId={claim._id} onDone={fetchClaims} />
              <FollowUpDialog
                claimId={claim._id}
                submissionDate={claim.submissionDate}
                currentFollowUpDate={claim.followUpDate}
                onDone={fetchClaims}
              />
            </>
          )}
          {claim.status === "rejected" && (
            <ResubmitDialog
              claimId={claim._id}
              originalClaimNumber={claim.claimNumber}
              onDone={fetchClaims}
            />
          )}
          {(claim.status === "paid" ||
            claim.status === "partial" ||
            claim.status === "superseded") && (
            <span className="text-xs text-muted-foreground">{claim.status}</span>
          )}
          <Link href={`/claims/${claim._id}/edit`}>
            <Button variant="ghost" size="sm">Edit</Button>
          </Link>
          <DeleteDialog
            claimId={claim._id}
            claimNumber={claim.claimNumber}
            onDone={fetchClaims}
          />
        </div>
      </TableCell>
      </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No claims found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}