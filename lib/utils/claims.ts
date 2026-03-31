// Days between submission and today (or paid date)
export function getDaysOutstanding(
  submissionDate: string | Date,
  paidDate?: string | Date | null
): number {
  const start = new Date(submissionDate);
  const end = paidDate ? new Date(paidDate) : new Date();
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function getAgingBucket(days: number): "current" | "warning" | "critical" {
  if (days <= 30) return "current";
  if (days <= 60) return "warning";
  return "critical";
}

export function formatUSD(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// Auto follow-up date = submission date + 30 days
export function getFollowUpDate(submissionDate: string | Date): Date {
  const d = new Date(submissionDate);
  d.setDate(d.getDate() + 30);
  return d;
}

// Is follow-up due today or overdue?
export function isFollowUpDue(
  submissionDate: string | Date,
  followUpDate?: string | Date | null
): boolean {
  const due = followUpDate
    ? new Date(followUpDate)
    : getFollowUpDate(submissionDate);
  return new Date() >= due;
}

export function getBalanceOwed(amount: number, partialAmountPaid?: number): number {
  if (!partialAmountPaid) return amount;
  return amount - partialAmountPaid;
}