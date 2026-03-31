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
import { formatUSD } from "@/lib/utils/claims";

interface Props {
  claimId: string;
  totalAmount: number;
  onDone: () => void;
}

export function PartialPaymentDialog({ claimId, totalAmount, onDone }: Props) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes]     = useState("");

  const paid    = parseFloat(amountPaid) || 0;
  const balance = totalAmount - paid;

  async function handleSubmit() {
    if (!amountPaid || paid <= 0 || paid >= totalAmount) return;
    setLoading(true);
    await fetch(`/api/claims/${claimId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "partial",
        partialAmountPaid: paid,
        paidDate: new Date().toISOString(),
        notes,
      }),
    });
    setLoading(false);
    setOpen(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Partial Pay</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Partial Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Claim total</span>
              <span className="font-semibold">{formatUSD(totalAmount)}</span>
            </div>
            {paid > 0 && (
              <>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">Amount paid</span>
                  <span className="font-semibold text-green-600">{formatUSD(paid)}</span>
                </div>
                <div className="flex justify-between mt-1 border-t pt-1">
                  <span className="text-gray-500">Balance written off</span>
                  <span className="font-semibold text-red-500">{formatUSD(balance)}</span>
                </div>
              </>
            )}
          </div>
          <div className="space-y-1">
            <Label>Amount Paid by Medical Aid (USD)</Label>
            <Input
              type="number"
              placeholder={`Less than ${formatUSD(totalAmount)}`}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
            {paid >= totalAmount && (
              <p className="text-xs text-red-500">
                Must be less than total — use "Mark Paid" for full payment
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="e.g. PSMAS paid $80, balance $40 written off"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={loading || !paid || paid <= 0 || paid >= totalAmount}
            >
              {loading ? "Saving..." : "Confirm Partial Payment"}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}