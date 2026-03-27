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