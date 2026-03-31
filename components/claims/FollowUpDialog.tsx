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
import { getFollowUpDate } from "@/lib/utils/claims";

interface Props {
  claimId: string;
  submissionDate: string;
  currentFollowUpDate?: string;
  onDone: () => void;
}

export function FollowUpDialog({
  claimId,
  submissionDate,
  currentFollowUpDate,
  onDone,
}: Props) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);

  const defaultDate = currentFollowUpDate
    ? new Date(currentFollowUpDate).toISOString().split("T")[0]
    : getFollowUpDate(submissionDate).toISOString().split("T")[0];

  const [date, setDate] = useState(defaultDate);

  async function handleSave() {
    setLoading(true);
    await fetch(`/api/claims/${claimId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followUpDate: new Date(date).toISOString() }),
    });
    setLoading(false);
    setOpen(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-blue-500">
          📅 Follow-up
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Follow-up Date</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-500">
          Default is 30 days after submission. Change if needed.
        </p>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label>Follow-up Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save"}
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