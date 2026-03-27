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
import { Textarea } from "@/components/ui/textarea";

interface Props {
  claimId: string;
  onDone: () => void;
}

export function RejectDialog({ claimId, onDone }: Props) {
  const [open, setOpen]     = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReject() {
    if (!reason.trim()) return;
    setLoading(true);
    await fetch(`/api/claims/${claimId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected", rejectionReason: reason }),
    });
    setLoading(false);
    setOpen(false);
    setReason("");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">Reject</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Rejected</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <Label>Rejection Reason (from 263)</Label>
          <Textarea
            placeholder="e.g. Member not covered, duplicate claim, invalid procedure code..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading || !reason.trim()}
            >
              {loading ? "Saving..." : "Confirm Rejection"}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}