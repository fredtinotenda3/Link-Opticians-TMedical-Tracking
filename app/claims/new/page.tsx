"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function NewClaimPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    claimNumber:    "",
    patientName:    "",
    patientId:      "",
    medicalAid:     "",
    memberNumber:   "",
    branch:         "",
    serviceDate:    "",
    submissionDate: new Date().toISOString().split("T")[0],
    amount:         "",
    amountZWG:      "",  // NEW
    currency:       "USD",  // NEW
    notes:          "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setLoading(true);
    
    const payload: any = {
      ...form,
      amount: form.currency === "USD" ? parseFloat(form.amount) : 0,
      amountZWG: form.currency === "ZWG" ? parseFloat(form.amount) : undefined,
    };
    
    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (res.ok) router.push("/claims");
    else setLoading(false);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>New Claim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Claim Number (from 263)</Label>
              <Input value={form.claimNumber} onChange={(e) => set("claimNumber", e.target.value)} />
            </div>
            
            {/* NEW: Currency selector */}
            <div className="space-y-1">
              <Label>Currency</Label>
              <Select onValueChange={(v) => set("currency", v)} defaultValue="USD">
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
            
            {/* Amount field with dynamic label */}
            <div className="space-y-1">
              <Label>Amount ({form.currency})</Label>
              <Input 
                type="number" 
                placeholder={`Amount in ${form.currency}`}
                value={form.amount} 
                onChange={(e) => set("amount", e.target.value)} 
              />
            </div>
            
            <div className="space-y-1">
              <Label>Patient Name</Label>
              <Input value={form.patientName} onChange={(e) => set("patientName", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Patient ID (VP Number)</Label>
              <Input value={form.patientId} onChange={(e) => set("patientId", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Medical Aid</Label>
              <Select onValueChange={(v) => set("medicalAid", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
              <Select onValueChange={(v) => set("branch", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : "Save Claim"}
            </Button>
            <Button variant="outline" onClick={() => router.push("/claims")}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}