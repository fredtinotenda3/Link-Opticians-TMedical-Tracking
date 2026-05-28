// FILE: lib/domain/claim.workflow.ts
// Defines valid claim status transitions and business rules

export type ClaimStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "paid"
  | "partial"
  | "superseded"
  | "archived"
  | "escalated";

// Directed graph of allowed transitions
export const ALLOWED_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  pending:    ["approved", "rejected", "escalated"],
  approved:   ["paid", "partial", "rejected", "escalated"],
  rejected:   ["superseded"],           // resubmit creates new claim, marks old as superseded
  paid:       ["approved", "pending"],  // correction only
  partial:    ["paid", "approved", "pending"],
  superseded: ["pending"],              // reactivation correction
  archived:   ["pending"],              // restore from archive
  escalated:  ["approved", "rejected", "paid", "partial"],
};

export function validateClaimTransition(from: string, to: string): boolean {
  const allowed = ALLOWED_TRANSITIONS[from as ClaimStatus];
  if (!allowed) return false;
  return allowed.includes(to as ClaimStatus);
}

export function getAllowedTransitions(from: string): ClaimStatus[] {
  return ALLOWED_TRANSITIONS[from as ClaimStatus] || [];
}

// Business rule: can claim be modified?
export function canModifyClaim(status: string): boolean {
  return ["pending", "approved", "partial", "escalated"].includes(status);
}

// Business rule: is claim active/outstanding?
export function isClaimOutstanding(status: string): boolean {
  return ["pending", "approved", "partial", "escalated"].includes(status);
}

// Business rule: can claim be resubmitted?
export function canResubmitClaim(status: string): boolean {
  return status === "rejected";
}

// Aging bucket classification
export function getAgingBucket(days: number): "current" | "warning" | "critical" {
  if (days <= 30) return "current";
  if (days <= 60) return "warning";
  return "critical";
}

export function getAgingBucketLabel(days: number): string {
  if (days <= 30) return "0–30 days";
  if (days <= 60) return "31–60 days";
  return "60+ days";
}

// Priority escalation rules
export function shouldEscalate(daysOutstanding: number, status: string): boolean {
  if (!isClaimOutstanding(status)) return false;
  return daysOutstanding >= 60;
}

// Follow-up due check
export function isFollowUpDue(
  submissionDate: Date | string,
  followUpDate?: Date | string | null
): boolean {
  const due = followUpDate
    ? new Date(followUpDate)
    : new Date(new Date(submissionDate).getTime() + 30 * 24 * 60 * 60 * 1000);
  return new Date() >= due;
}

// Get default follow-up date (30 days after submission)
export function getDefaultFollowUpDate(submissionDate: Date | string): Date {
  const d = new Date(submissionDate);
  d.setDate(d.getDate() + 30);
  return d;
}

// Status display config
export const STATUS_CONFIG: Record<ClaimStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  description: string;
}> = {
  pending: {
    label: "Pending",
    color: "text-yellow-800",
    bgColor: "bg-yellow-100",
    borderColor: "border-yellow-200",
    icon: "🕒",
    description: "Submitted, awaiting medical aid response",
  },
  approved: {
    label: "Approved",
    color: "text-blue-800",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-200",
    icon: "✅",
    description: "Approved by medical aid, awaiting payment",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-800",
    bgColor: "bg-red-100",
    borderColor: "border-red-200",
    icon: "❌",
    description: "Declined by medical aid, requires resubmission",
  },
  paid: {
    label: "Paid",
    color: "text-green-800",
    bgColor: "bg-green-100",
    borderColor: "border-green-200",
    icon: "💰",
    description: "Payment received in full",
  },
  partial: {
    label: "Partial",
    color: "text-orange-800",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-200",
    icon: "⚡",
    description: "Partial payment received, balance outstanding",
  },
  superseded: {
    label: "Superseded",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-200",
    icon: "↩",
    description: "Replaced by a resubmission",
  },
  archived: {
    label: "Archived",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: "📦",
    description: "Archived for record-keeping",
  },
  escalated: {
    label: "Escalated",
    color: "text-red-900",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
    icon: "🚨",
    description: "Escalated — requires urgent attention",
  },
};