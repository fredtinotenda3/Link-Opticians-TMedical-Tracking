"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEDICAL_AIDS, BRANCHES, CURRENCIES } from "@/lib/constants";

export default function EditClaimPage() {
  const router    = useRouter();
  const { id }    = useParams();
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm]         = useState<any>(null);

  useEffect(() => {
    fetch(`/api/claims/${id}`)
      .then((r) => r.json())
      .then((j) => {
        const c = j.data;
        setForm({
          ...c,
          serviceDate:    c.serviceDate?.split("T")[0] || "",
          submissionDate: c.submissionDate?.split("T")[0] || "",
          currency:       c.currency || "USD",
        });
        setFetching(false);
      });
  }, [id]);

  function set(field: string, value: string) {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setLoading(true);
    const payload: any = { ...form };
    if (form.currency === "USD") {
      payload.amount = parseFloat(form.amount);
      payload.amountZWG = undefined;
    } else {
      payload.amountZWG = parseFloat(form.amount);
      payload.amount = 0;
    }
    await fetch(`/api/claims/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    router.push("/claims");
  }

  if (fetching) return <p className="p-6 text-muted-foreground">Loading...</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Edit Claim — <span className="font-mono">{form.claimNumber}</span></CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Claim Number</Label>
              <Input value={form.claimNumber} onChange={(e) => set("claimNumber", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Select onValueChange={(v) => set("currency", v)} defaultValue={form.currency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Amount ({form.currency})</Label>
              <Input 
                type="number" 
                value={form.amount} 
                onChange={(e) => set("amount", e.target.value)} 
              />
            </div>
            <div className="space-y-1">
              <Label>Patient Name</Label>
              <Input value={form.patientName} onChange={(e) => set("patientName", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Patient ID</Label>
              <Input value={form.patientId} onChange={(e) => set("patientId", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Medical Aid</Label>
              <Select onValueChange={(v) => set("medicalAid", v)} defaultValue={form.medicalAid}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEDICAL_AIDS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Member Number</Label>
              <Input value={form.memberNumber} onChange={(e) => set("memberNumber", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Branch</Label>
              <Select onValueChange={(v) => set("branch", v)} defaultValue={form.branch}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Service Date</Label>
              <Input type="date" value={form.serviceDate} onChange={(e) => set("serviceDate", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Submission Date</Label>
              <Input type="date" value={form.submissionDate} onChange={(e) => set("submissionDate", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={() => router.push("/claims")}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}