// FILE: lib/services/reporting.service.ts
// Generates structured report data for CSV, Excel, PDF exports

import { connectDB } from "@/lib/mongodb";
import Claim from "@/lib/models/Claim";
import AuditLog from "@/lib/models/AuditLog";

export type ReportType =
  | "aging"
  | "outstanding"
  | "branch"
  | "medical_aid"
  | "rejection"
  | "payment"
  | "followup"
  | "collections"
  | "monthly"
  | "yearly"
  | "full_audit";

export interface ReportFilter {
  currency?: "USD" | "ZWG";
  branch?: string;
  medicalAid?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  reportType: ReportType;
}

export interface ReportRow {
  [key: string]: string | number | undefined;
}

export interface ReportResult {
  title: string;
  subtitle: string;
  generatedAt: string;
  filters: ReportFilter;
  headers: string[];
  rows: ReportRow[];
  summary: Record<string, string | number>;
  totalRows: number;
}

export class ReportingService {
  static async generate(filter: ReportFilter): Promise<ReportResult> {
    await connectDB();

    switch (filter.reportType) {
      case "aging":       return ReportingService.agingReport(filter);
      case "outstanding": return ReportingService.outstandingReport(filter);
      case "rejection":   return ReportingService.rejectionReport(filter);
      case "payment":     return ReportingService.paymentReport(filter);
      case "branch":      return ReportingService.branchReport(filter);
      case "medical_aid": return ReportingService.medicalAidReport(filter);
      case "followup":    return ReportingService.followupReport(filter);
      case "monthly":     return ReportingService.monthlyReport(filter);
      case "full_audit":  return ReportingService.fullAuditReport(filter);
      default:            return ReportingService.outstandingReport(filter);
    }
  }

  // ─── Aging Report ─────────────────────────────────────────────────────────
  static async agingReport(filter: ReportFilter): Promise<ReportResult> {
    const query: any = {
      isDeleted: false,
      status: { $in: ["pending", "approved", "partial"] },
    };
    if (filter.currency) query.currency = filter.currency;
    if (filter.branch) query.branch = filter.branch;
    if (filter.medicalAid) query.medicalAid = filter.medicalAid;

    const claims = await Claim.find(query).sort({ submissionDate: 1 }).lean();
    const now = new Date();

    const rows: ReportRow[] = claims.map((c) => {
      const days = Math.floor(
        (now.getTime() - new Date(c.submissionDate).getTime()) / 86400000
      );
      const bucket = days <= 30 ? "0-30 days" : days <= 60 ? "31-60 days" : "60+ days";
      const eff = c.status === "partial" && c.partialAmountPaid
        ? (filter.currency === "ZWG" ? (c.amountZWG || c.amount) : c.amount) - c.partialAmountPaid
        : (filter.currency === "ZWG" ? (c.amountZWG || c.amount) : c.amount);

      return {
        "Claim #": c.claimNumber,
        "Patient": c.patientName,
        "Medical Aid": c.medicalAid,
        "Branch": c.branch,
        "Status": c.status,
        "Submitted": new Date(c.submissionDate).toLocaleDateString(),
        "Days Outstanding": days,
        "Aging Bucket": bucket,
        "Currency": c.currency,
        "Amount": +eff.toFixed(2),
      };
    });

    const bucket0 = rows.filter((r) => r["Aging Bucket"] === "0-30 days").length;
    const bucket31 = rows.filter((r) => r["Aging Bucket"] === "31-60 days").length;
    const bucket60 = rows.filter((r) => r["Aging Bucket"] === "60+ days").length;
    const totalAmt = rows.reduce((s, r) => s + (Number(r["Amount"]) || 0), 0);

    return {
      title: "Aging Report",
      subtitle: `Outstanding claims by age bucket — ${filter.currency || "All currencies"}`,
      generatedAt: new Date().toISOString(),
      filters: filter,
      headers: ["Claim #","Patient","Medical Aid","Branch","Status","Submitted","Days Outstanding","Aging Bucket","Currency","Amount"],
      rows,
      summary: {
        "Total Claims": rows.length,
        "0-30 Days": bucket0,
        "31-60 Days": bucket31,
        "60+ Days": bucket60,
        "Total Outstanding": totalAmt.toFixed(2),
      },
      totalRows: rows.length,
    };
  }

  // ─── Outstanding Report ───────────────────────────────────────────────────
  static async outstandingReport(filter: ReportFilter): Promise<ReportResult> {
    const query: any = {
      isDeleted: false,
      status: { $in: ["pending", "approved", "partial"] },
    };
    if (filter.currency) query.currency = filter.currency;
    if (filter.branch) query.branch = filter.branch;
    if (filter.medicalAid) query.medicalAid = filter.medicalAid;

    const claims = await Claim.find(query).sort({ submissionDate: -1 }).lean();
    const now = new Date();

    const rows: ReportRow[] = claims.map((c) => {
      const days = Math.floor((now.getTime() - new Date(c.submissionDate).getTime()) / 86400000);
      const amount = filter.currency === "ZWG" ? (c.amountZWG || c.amount) : c.amount;
      const partial = c.partialAmountPaid || 0;
      const balance = c.status === "partial" ? amount - partial : amount;

      return {
        "Claim #": c.claimNumber,
        "Patient": c.patientName,
        "Member #": c.memberNumber,
        "Medical Aid": c.medicalAid,
        "Branch": c.branch,
        "Status": c.status,
        "Currency": c.currency,
        "Claim Amount": +amount.toFixed(2),
        "Partial Paid": +partial.toFixed(2),
        "Balance": +balance.toFixed(2),
        "Submitted": new Date(c.submissionDate).toLocaleDateString(),
        "Days Out": days,
        "Follow-up": c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : "—",
        "Priority": c.priority || "normal",
      };
    });

    const totalBalance = rows.reduce((s, r) => s + (Number(r["Balance"]) || 0), 0);

    return {
      title: "Outstanding Claims Report",
      subtitle: `All active outstanding claims — ${filter.currency || "All currencies"}`,
      generatedAt: new Date().toISOString(),
      filters: filter,
      headers: ["Claim #","Patient","Member #","Medical Aid","Branch","Status","Currency","Claim Amount","Partial Paid","Balance","Submitted","Days Out","Follow-up","Priority"],
      rows,
      summary: {
        "Total Claims": rows.length,
        "Total Balance": totalBalance.toFixed(2),
        "Pending": rows.filter((r) => r["Status"] === "pending").length,
        "Approved": rows.filter((r) => r["Status"] === "approved").length,
        "Partial": rows.filter((r) => r["Status"] === "partial").length,
      },
      totalRows: rows.length,
    };
  }

  // ─── Rejection Report ─────────────────────────────────────────────────────
  static async rejectionReport(filter: ReportFilter): Promise<ReportResult> {
    const query: any = { isDeleted: false, status: "rejected" };
    if (filter.currency) query.currency = filter.currency;
    if (filter.branch) query.branch = filter.branch;
    if (filter.medicalAid) query.medicalAid = filter.medicalAid;
    if (filter.dateFrom) query.submissionDate = { $gte: filter.dateFrom };
    if (filter.dateTo) query.submissionDate = { ...query.submissionDate, $lte: filter.dateTo };

    const claims = await Claim.find(query).sort({ submissionDate: -1 }).lean();

    const rows: ReportRow[] = claims.map((c) => ({
      "Claim #": c.claimNumber,
      "Patient": c.patientName,
      "Medical Aid": c.medicalAid,
      "Branch": c.branch,
      "Currency": c.currency,
      "Amount": +((filter.currency === "ZWG" ? (c.amountZWG || c.amount) : c.amount)).toFixed(2),
      "Submitted": new Date(c.submissionDate).toLocaleDateString(),
      "Rejection Reason": c.rejectionReason || "—",
      "Rejection Code": c.rejectionCode || "—",
      "Resubmission Count": c.resubmissionCount || 0,
    }));

    const byReason: Record<string, number> = {};
    rows.forEach((r) => {
      const reason = String(r["Rejection Reason"]);
      byReason[reason] = (byReason[reason] || 0) + 1;
    });
    const topReason = Object.entries(byReason).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    return {
      title: "Rejection Report",
      subtitle: `Rejected claims analysis`,
      generatedAt: new Date().toISOString(),
      filters: filter,
      headers: ["Claim #","Patient","Medical Aid","Branch","Currency","Amount","Submitted","Rejection Reason","Rejection Code","Resubmission Count"],
      rows,
      summary: {
        "Total Rejected": rows.length,
        "Top Rejection Reason": topReason,
        "Total Amount at Risk": rows.reduce((s, r) => s + (Number(r["Amount"]) || 0), 0).toFixed(2),
      },
      totalRows: rows.length,
    };
  }

  // ─── Payment Report ───────────────────────────────────────────────────────
  static async paymentReport(filter: ReportFilter): Promise<ReportResult> {
    const query: any = { isDeleted: false, status: { $in: ["paid", "partial"] } };
    if (filter.currency) query.currency = filter.currency;
    if (filter.branch) query.branch = filter.branch;
    if (filter.dateFrom) query.paidDate = { $gte: filter.dateFrom };
    if (filter.dateTo) query.paidDate = { ...query.paidDate, $lte: filter.dateTo };

    const claims = await Claim.find(query).sort({ paidDate: -1 }).lean();

    const rows: ReportRow[] = claims.map((c) => {
      const amount = filter.currency === "ZWG" ? (c.amountZWG || c.amount) : c.amount;
      const paidAmt = c.status === "paid" ? amount : (c.partialAmountPaid || 0);
      const days = c.paidDate && c.submissionDate
        ? Math.floor((new Date(c.paidDate).getTime() - new Date(c.submissionDate).getTime()) / 86400000)
        : 0;
      return {
        "Claim #": c.claimNumber,
        "Patient": c.patientName,
        "Medical Aid": c.medicalAid,
        "Branch": c.branch,
        "Currency": c.currency,
        "Claim Amount": +amount.toFixed(2),
        "Paid Amount": +paidAmt.toFixed(2),
        "Payment Type": c.status === "partial" ? "Partial" : "Full",
        "Submitted": new Date(c.submissionDate).toLocaleDateString(),
        "Paid Date": c.paidDate ? new Date(c.paidDate).toLocaleDateString() : "—",
        "Days to Pay": days,
      };
    });

    const totalPaid = rows.reduce((s, r) => s + (Number(r["Paid Amount"]) || 0), 0);
    const avgDays = rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + (Number(r["Days to Pay"]) || 0), 0) / rows.length)
      : 0;

    return {
      title: "Payment Report",
      subtitle: `Paid and partial payment claims`,
      generatedAt: new Date().toISOString(),
      filters: filter,
      headers: ["Claim #","Patient","Medical Aid","Branch","Currency","Claim Amount","Paid Amount","Payment Type","Submitted","Paid Date","Days to Pay"],
      rows,
      summary: {
        "Total Payments": rows.length,
        "Total Collected": totalPaid.toFixed(2),
        "Avg Days to Pay": avgDays,
        "Full Payments": rows.filter((r) => r["Payment Type"] === "Full").length,
        "Partial Payments": rows.filter((r) => r["Payment Type"] === "Partial").length,
      },
      totalRows: rows.length,
    };
  }

  // ─── Branch Report ────────────────────────────────────────────────────────
  static async branchReport(filter: ReportFilter): Promise<ReportResult> {
    const currency = filter.currency || "USD";
    const amountField = currency === "ZWG" ? { $ifNull: ["$amountZWG", "$amount"] } : "$amount";

    const data = await Claim.aggregate([
      { $match: { isDeleted: false, currency } },
      {
        $group: {
          _id: "$branch",
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          outstanding: { $sum: { $cond: [{ $in: ["$status", ["pending", "approved", "partial"]] }, amountField, 0] } },
          collected: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, amountField, 0] } },
        },
      },
      { $sort: { outstanding: -1 } },
    ]);

    const rows: ReportRow[] = data.map((r) => ({
      "Branch": r._id,
      "Total Claims": r.total,
      "Pending": r.pending,
      "Approved": r.approved,
      "Paid": r.paid,
      "Rejected": r.rejected,
      "Outstanding Amount": +r.outstanding.toFixed(2),
      "Collected Amount": +r.collected.toFixed(2),
      "Rejection Rate": `${Math.round((r.rejected / (r.total || 1)) * 100)}%`,
    }));

    return {
      title: "Branch Performance Report",
      subtitle: `Claims breakdown by branch — ${currency}`,
      generatedAt: new Date().toISOString(),
      filters: filter,
      headers: ["Branch","Total Claims","Pending","Approved","Paid","Rejected","Outstanding Amount","Collected Amount","Rejection Rate"],
      rows,
      summary: {
        "Total Claims": rows.reduce((s, r) => s + (Number(r["Total Claims"]) || 0), 0),
        "Total Outstanding": rows.reduce((s, r) => s + (Number(r["Outstanding Amount"]) || 0), 0).toFixed(2),
        "Total Collected": rows.reduce((s, r) => s + (Number(r["Collected Amount"]) || 0), 0).toFixed(2),
      },
      totalRows: rows.length,
    };
  }

  // ─── Medical Aid Report ───────────────────────────────────────────────────
  static async medicalAidReport(filter: ReportFilter): Promise<ReportResult> {
    const currency = filter.currency || "USD";
    const amountField = currency === "ZWG" ? { $ifNull: ["$amountZWG", "$amount"] } : "$amount";

    const data = await Claim.aggregate([
      { $match: { isDeleted: false, currency } },
      {
        $group: {
          _id: "$medicalAid",
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          outstanding: { $sum: { $cond: [{ $in: ["$status", ["pending", "approved", "partial"]] }, amountField, 0] } },
          paidAmount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, amountField, 0] } },
          avgDays: {
            $avg: {
              $cond: [
                { $eq: ["$status", "paid"] },
                { $divide: [{ $subtract: ["$paidDate", "$submissionDate"] }, 86400000] },
                null,
              ],
            },
          },
        },
      },
      { $sort: { outstanding: -1 } },
    ]);

    const rows: ReportRow[] = data.map((r) => ({
      "Medical Aid": r._id,
      "Total Claims": r.total,
      "Pending": r.pending,
      "Approved": r.approved,
      "Paid": r.paid,
      "Rejected": r.rejected,
      "Outstanding Amount": +r.outstanding.toFixed(2),
      "Paid Amount": +r.paidAmount.toFixed(2),
      "Rejection Rate": `${Math.round((r.rejected / (r.total || 1)) * 100)}%`,
      "Avg Payment Days": r.avgDays ? Math.round(r.avgDays) : "—",
    }));

    return {
      title: "Medical Aid Performance Report",
      subtitle: `Claims analysis by medical aid — ${currency}`,
      generatedAt: new Date().toISOString(),
      filters: filter,
      headers: ["Medical Aid","Total Claims","Pending","Approved","Paid","Rejected","Outstanding Amount","Paid Amount","Rejection Rate","Avg Payment Days"],
      rows,
      summary: {
        "Medical Aids": rows.length,
        "Total Outstanding": rows.reduce((s, r) => s + (Number(r["Outstanding Amount"]) || 0), 0).toFixed(2),
        "Total Collected": rows.reduce((s, r) => s + (Number(r["Paid Amount"]) || 0), 0).toFixed(2),
      },
      totalRows: rows.length,
    };
  }

  // ─── Follow-up Report ─────────────────────────────────────────────────────
  static async followupReport(filter: ReportFilter): Promise<ReportResult> {
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400000);

    const query: any = {
      isDeleted: false,
      status: { $in: ["pending", "approved", "partial"] },
      $or: [
        { followUpDate: { $lte: now } },
        { followUpDate: { $exists: false }, submissionDate: { $lte: d30 } },
      ],
    };
    if (filter.currency) query.currency = filter.currency;
    if (filter.branch) query.branch = filter.branch;

    const claims = await Claim.find(query).sort({ submissionDate: 1 }).lean();

    const rows: ReportRow[] = claims.map((c) => {
      const days = Math.floor((now.getTime() - new Date(c.submissionDate).getTime()) / 86400000);
      const followUpDate = c.followUpDate
        ? new Date(c.followUpDate).toLocaleDateString()
        : new Date(new Date(c.submissionDate).getTime() + 30 * 86400000).toLocaleDateString();
      return {
        "Claim #": c.claimNumber,
        "Patient": c.patientName,
        "Medical Aid": c.medicalAid,
        "Branch": c.branch,
        "Status": c.status,
        "Currency": c.currency,
        "Amount": +((filter.currency === "ZWG" ? (c.amountZWG || c.amount) : c.amount)).toFixed(2),
        "Submitted": new Date(c.submissionDate).toLocaleDateString(),
        "Days Out": days,
        "Follow-up Date": followUpDate,
        "Priority": days >= 60 ? "CRITICAL" : days >= 30 ? "HIGH" : "MEDIUM",
      };
    });

    return {
      title: "Follow-up Required Report",
      subtitle: `Claims requiring immediate follow-up`,
      generatedAt: new Date().toISOString(),
      filters: filter,
      headers: ["Claim #","Patient","Medical Aid","Branch","Status","Currency","Amount","Submitted","Days Out","Follow-up Date","Priority"],
      rows,
      summary: {
        "Total Due": rows.length,
        "Critical (60+d)": rows.filter((r) => r["Priority"] === "CRITICAL").length,
        "High (30-60d)": rows.filter((r) => r["Priority"] === "HIGH").length,
        "Total Amount": rows.reduce((s, r) => s + (Number(r["Amount"]) || 0), 0).toFixed(2),
      },
      totalRows: rows.length,
    };
  }

  // ─── Monthly Report ───────────────────────────────────────────────────────
  static async monthlyReport(filter: ReportFilter): Promise<ReportResult> {
    const currency = filter.currency || "USD";
    const amountField = currency === "ZWG" ? { $ifNull: ["$amountZWG", "$amount"] } : "$amount";

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 11);
    sixMonthsAgo.setDate(1);

    const data = await Claim.aggregate([
      { $match: { currency, isDeleted: false, submissionDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$submissionDate" }, month: { $month: "$submissionDate" } },
          submitted: { $sum: 1 },
          paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          totalAmount: { $sum: amountField },
          paidAmount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, amountField, 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const rows: ReportRow[] = data.map((m) => ({
      "Month": `${monthNames[m._id.month - 1]} ${m._id.year}`,
      "Submitted": m.submitted,
      "Paid": m.paid,
      "Rejected": m.rejected,
      "Collection Rate": `${Math.round((m.paid / (m.submitted || 1)) * 100)}%`,
      "Rejection Rate": `${Math.round((m.rejected / (m.submitted || 1)) * 100)}%`,
      "Total Amount": +m.totalAmount.toFixed(2),
      "Collected Amount": +m.paidAmount.toFixed(2),
    }));

    return {
      title: "Monthly Performance Report",
      subtitle: `Month-by-month claims analysis — ${currency}`,
      generatedAt: new Date().toISOString(),
      filters: filter,
      headers: ["Month","Submitted","Paid","Rejected","Collection Rate","Rejection Rate","Total Amount","Collected Amount"],
      rows,
      summary: {
        "Months Covered": rows.length,
        "Total Submitted": rows.reduce((s, r) => s + (Number(r["Submitted"]) || 0), 0),
        "Total Collected": rows.reduce((s, r) => s + (Number(r["Collected Amount"]) || 0), 0).toFixed(2),
      },
      totalRows: rows.length,
    };
  }

  // ─── Full Audit Report ────────────────────────────────────────────────────
  static async fullAuditReport(filter: ReportFilter): Promise<ReportResult> {
    const query: any = {};
    if (filter.dateFrom) query.createdAt = { $gte: filter.dateFrom };
    if (filter.dateTo) query.createdAt = { ...query.createdAt, $lte: filter.dateTo };

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const rows: ReportRow[] = logs.map((l) => ({
      "Action": l.action,
      "Entity Type": l.entityType,
      "Entity": l.entityLabel || String(l.entityId) || "—",
      "User": l.userName || l.userEmail || "System",
      "Role": l.userRole || "—",
      "IP Address": l.ipAddress || "—",
      "Date": new Date(l.createdAt).toLocaleString(),
      "Success": l.success ? "Yes" : "No",
      "Details": l.description || "",
    }));

    return {
      title: "Audit Log Report",
      subtitle: "Complete system activity audit trail",
      generatedAt: new Date().toISOString(),
      filters: filter,
      headers: ["Action","Entity Type","Entity","User","Role","IP Address","Date","Success","Details"],
      rows,
      summary: {
        "Total Events": rows.length,
        "Successful": rows.filter((r) => r["Success"] === "Yes").length,
        "Failed": rows.filter((r) => r["Success"] === "No").length,
      },
      totalRows: rows.length,
    };
  }

  // ─── CSV Export helper ────────────────────────────────────────────────────
  static toCSV(report: ReportResult): string {
    const headerLine = report.headers
      .map((h) => `"${h}"`)
      .join(",");

    const dataLines = report.rows.map((row) =>
      report.headers
        .map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );

    const summaryLines = [
      "",
      '"Summary"',
      ...Object.entries(report.summary).map(([k, v]) => `"${k}","${v}"`),
      `"Generated At","${report.generatedAt}"`,
    ];

    return [headerLine, ...dataLines, ...summaryLines].join("\n");
  }
}