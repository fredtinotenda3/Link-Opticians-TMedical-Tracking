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
import { formatCurrency } from "@/lib/utils/currency";

interface Props {
  claimId: string;
  totalAmount: number;
  currency: "USD" | "ZWG";
  onDone: () => void;
}

export function PartialPaymentDialog({ claimId, totalAmount, currency, onDone }: Props) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes]     = useState("");

  const paid    = parseFloat(amountPaid) || 0;
  const balance = totalAmount - paid;

  async function handleSubmit() {
    if (!amountPaid || paid <= 0 || paid >= totalAmount) return;
    setLoading(true);
    
    const payload: any = {
      status: "partial",
      paidDate: new Date().toISOString(),
      notes,
    };
    
    if (currency === "USD") {
      payload.partialAmountPaid = paid;
    } else {
      payload.partialAmountPaidZWG = paid;
      payload.partialAmountPaid = paid; // Also set for display consistency
    }
    
    await fetch(`/api/claims/${claimId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
              <span className="font-semibold">{formatCurrency(totalAmount, currency)}</span>
            </div>
            {paid > 0 && (
              <>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">Amount paid</span>
                  <span className="font-semibold text-green-600">{formatCurrency(paid, currency)}</span>
                </div>
                <div className="flex justify-between mt-1 border-t pt-1">
                  <span className="text-gray-500">Balance written off</span>
                  <span className="font-semibold text-red-500">{formatCurrency(balance, currency)}</span>
                </div>
              </>
            )}
          </div>
          <div className="space-y-1">
            <Label>Amount Paid by Medical Aid ({currency})</Label>
            <Input
              type="number"
              placeholder={`Less than ${formatCurrency(totalAmount, currency)}`}
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
              placeholder="e.g. PSMAS paid partial amount, balance to be written off"
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