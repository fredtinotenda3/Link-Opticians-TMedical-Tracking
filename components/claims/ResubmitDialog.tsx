"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  claimId: string;
  originalClaimNumber: string;
  onDone: () => void;
}

export function ResubmitDialog({ claimId, originalClaimNumber, onDone }: Props) {
  const [open, setOpen]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm]     = useState({
    claimNumber:    "",
    submissionDate: new Date().toISOString().split("T")[0],
    notes:          "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleResubmit() {
    if (!form.claimNumber.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/claims/${claimId}/resubmit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      onDone();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Resubmit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resubmit Claim</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Original: <span className="font-mono">{originalClaimNumber}</span>
          <br />
          Enter the new claim number assigned by 263 after resubmission.
        </p>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label>New Claim Number (from 263)</Label>
            <Input
              value={form.claimNumber}
              onChange={(e) => set("claimNumber", e.target.value)}
              placeholder="New 263 claim number"
            />
          </div>
          <div className="space-y-1">
            <Label>Resubmission Date</Label>
            <Input
              type="date"
              value={form.submissionDate}
              onChange={(e) => set("submissionDate", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              placeholder="What was fixed before resubmitting?"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleResubmit}
              disabled={loading || !form.claimNumber.trim()}
            >
              {loading ? "Submitting..." : "Confirm Resubmission"}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}