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

interface Props {
  claimId: string;
  claimNumber: string;
  onDone: () => void;
}

export function DeleteDialog({ claimId, claimNumber, onDone }: Props) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/claims/${claimId}`, { method: "DELETE" });
    setLoading(false);
    setOpen(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Claim?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Claim <span className="font-mono font-semibold">{claimNumber}</span> will be
          permanently deleted. This cannot be undone.
        </p>
        <div className="flex gap-2 pt-2">
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Yes, Delete"}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}