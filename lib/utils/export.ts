export function exportToCSV(claims: any[], filename: string) {
  const headers = [
    "Claim #",
    "Patient Name",
    "Patient ID",
    "Medical Aid",
    "Member #",
    "Branch",
    "Service Date",
    "Submission Date",
    "Amount (USD)",
    "Status",
    "Days Outstanding",
    "Rejection Reason",
    "Paid Date",
    "Notes",
  ];

  const rows = claims.map((c) => {
    const days =
      c.status !== "paid"
        ? Math.floor(
            (new Date().getTime() - new Date(c.submissionDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : "";
    return [
      c.claimNumber,
      c.patientName,
      c.patientId,
      c.medicalAid,
      c.memberNumber,
      c.branch,
      new Date(c.serviceDate).toLocaleDateString(),
      new Date(c.submissionDate).toLocaleDateString(),
      c.amount.toFixed(2),
      c.status,
      days,
      c.rejectionReason || "",
      c.paidDate ? new Date(c.paidDate).toLocaleDateString() : "",
      c.notes || "",
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const blob = new URL(
    `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`
  );

  const link = document.createElement("a");
  link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
  link.download = filename;
  link.click();
}