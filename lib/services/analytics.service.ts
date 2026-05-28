// FILE: lib/services/analytics.service.ts

import { connectDB } from "@/lib/mongodb";
import Claim from "@/lib/models/Claim";

export interface DashboardMetrics {
  currency: "USD" | "ZWG";
  outstanding: { count: number; amount: number };
  pending:     { count: number; amount: number };
  approved:    { count: number; amount: number };
  partial:     { count: number; amount: number };
  paidThisMonth: { count: number; amount: number };
  rejected:    { count: number; amount: number };
  overdue60:   { count: number; amount: number };
  followUpDue: { count: number };
  aging: {
    bucket0_30:   { count: number; amount: number };
    bucket31_60:  { count: number; amount: number };
    bucket60plus: { count: number; amount: number };
  };
  byMedicalAid: Array<{
    name: string;
    pending: number;
    approved: number;
    partial: number;
    total: number;
    count: number;
  }>;
  byBranch: Array<{
    name: string;
    total: number;
    count: number;
    paidAmount: number;
  }>;
  collectionRate: number;
  rejectionRate: number;
  avgPaymentDays: number;
  topRejectionReasons: Array<{ reason: string; count: number }>;
  monthlyTrend: Array<{ month: string; submitted: number; paid: number; rejected: number; amount: number }>;
}

export class AnalyticsService {
  static async getDashboardMetrics(currency: "USD" | "ZWG"): Promise<DashboardMetrics> {
    await connectDB();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const amountField = currency === "ZWG"
      ? { $ifNull: ["$amountZWG", "$amount"] }
      : "$amount";

    // Main aggregation
    const [mainStats] = await Claim.aggregate([
      { $match: { currency, isDeleted: false } },
      {
        $group: {
          _id: null,
          pendingCount:   { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          pendingAmount:  { $sum: { $cond: [{ $eq: ["$status", "pending"] }, amountField, 0] } },
          approvedCount:  { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          approvedAmount: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, amountField, 0] } },
          partialCount:   { $sum: { $cond: [{ $eq: ["$status", "partial"] }, 1, 0] } },
          partialAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "partial"] },
                { $subtract: [amountField, { $ifNull: ["$partialAmountPaid", 0] }] },
                0,
              ],
            },
          },
          rejectedCount:  { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          rejectedAmount: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, amountField, 0] } },
          paidMonthCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$status", "paid"] }, { $gte: ["$paidDate", monthStart] }] },
                1, 0,
              ],
            },
          },
          paidMonthAmount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$status", "paid"] }, { $gte: ["$paidDate", monthStart] }] },
                amountField, 0,
              ],
            },
          },
          totalPaidCount:  { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
          totalPaidAmount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, amountField, 0] } },
          overdueCount:    { $sum: { $cond: [{ $and: [{ $in: ["$status", ["pending","approved","partial"]] }, { $lt: ["$submissionDate", d60] }] }, 1, 0] } },
          overdueAmount:   { $sum: { $cond: [{ $and: [{ $in: ["$status", ["pending","approved","partial"]] }, { $lt: ["$submissionDate", d60] }] }, amountField, 0] } },
          // Aging
          b0Count:  { $sum: { $cond: [{ $and: [{ $in: ["$status", ["pending","approved","partial"]] }, { $gte: ["$submissionDate", d30] }] }, 1, 0] } },
          b0Amount: { $sum: { $cond: [{ $and: [{ $in: ["$status", ["pending","approved","partial"]] }, { $gte: ["$submissionDate", d30] }] }, amountField, 0] } },
          b31Count:  { $sum: { $cond: [{ $and: [{ $in: ["$status", ["pending","approved","partial"]] }, { $lt: ["$submissionDate", d30] }, { $gte: ["$submissionDate", d60] }] }, 1, 0] } },
          b31Amount: { $sum: { $cond: [{ $and: [{ $in: ["$status", ["pending","approved","partial"]] }, { $lt: ["$submissionDate", d30] }, { $gte: ["$submissionDate", d60] }] }, amountField, 0] } },
          b60Count:  { $sum: { $cond: [{ $and: [{ $in: ["$status", ["pending","approved","partial"]] }, { $lt: ["$submissionDate", d60] }] }, 1, 0] } },
          b60Amount: { $sum: { $cond: [{ $and: [{ $in: ["$status", ["pending","approved","partial"]] }, { $lt: ["$submissionDate", d60] }] }, amountField, 0] } },
          totalCount: { $sum: 1 },
          // Average payment days
          paidDaysSum: {
            $sum: {
              $cond: [
                { $eq: ["$status", "paid"] },
                { $divide: [{ $subtract: ["$paidDate", "$submissionDate"] }, 86400000] },
                0,
              ],
            },
          },
          // Follow-up due
          followUpDueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$status", ["pending","approved","partial"]] },
                    { $lte: [{ $ifNull: ["$followUpDate", { $add: ["$submissionDate", 2592000000] }] }, now] },
                  ],
                },
                1, 0,
              ],
            },
          },
        },
      },
    ]);

    const s = mainStats || {};

    // By medical aid
    const byMedicalAid = await Claim.aggregate([
      { $match: { status: { $in: ["pending","approved","partial"] }, currency, isDeleted: false } },
      {
        $group: {
          _id: "$medicalAid",
          pending:  { $sum: { $cond: [{ $eq: ["$status","pending"] }, amountField, 0] } },
          approved: { $sum: { $cond: [{ $eq: ["$status","approved"] }, amountField, 0] } },
          partial:  { $sum: { $cond: [{ $eq: ["$status","partial"] }, { $subtract: [amountField, { $ifNull: ["$partialAmountPaid",0] }] }, 0] } },
          count: { $sum: 1 },
        },
      },
      { $addFields: { total: { $add: ["$pending","$approved","$partial"] } } },
      { $sort: { total: -1 } },
      {
        $project: {
          name: "$_id",
          pending: 1, approved: 1, partial: 1, total: 1, count: 1,
        },
      },
    ]);

    // By branch
    const byBranch = await Claim.aggregate([
      { $match: { currency, isDeleted: false, status: { $in: ["pending","approved","partial","paid"] } } },
      {
        $group: {
          _id: "$branch",
          total:      { $sum: { $cond: [{ $in: ["$status",["pending","approved","partial"]] }, amountField, 0] } },
          paidAmount: { $sum: { $cond: [{ $eq: ["$status","paid"] }, amountField, 0] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $project: { name: "$_id", total: 1, paidAmount: 1, count: 1 } },
    ]);

    // Top rejection reasons
    const rejectionReasons = await Claim.aggregate([
      { $match: { status: "rejected", currency, isDeleted: false, rejectionReason: { $exists: true, $ne: "" } } },
      { $group: { _id: "$rejectionReason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { reason: "$_id", count: 1, _id: 0 } },
    ]);

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyRaw = await Claim.aggregate([
      { $match: { currency, isDeleted: false, submissionDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year:  { $year: "$submissionDate" },
            month: { $month: "$submissionDate" },
          },
          submitted: { $sum: 1 },
          paid:      { $sum: { $cond: [{ $eq: ["$status","paid"] }, 1, 0] } },
          rejected:  { $sum: { $cond: [{ $eq: ["$status","rejected"] }, 1, 0] } },
          amount:    { $sum: amountField },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthlyTrend = monthlyRaw.map((m) => ({
      month: `${monthNames[m._id.month - 1]} ${m._id.year}`,
      submitted: m.submitted,
      paid: m.paid,
      rejected: m.rejected,
      amount: m.amount,
    }));

    // Compute rates
    const totalResolved = (s.totalPaidCount || 0) + (s.rejectedCount || 0);
    const collectionRate = totalResolved > 0
      ? Math.round((s.totalPaidCount / totalResolved) * 100)
      : 0;
    const totalSubmitted = s.totalCount || 1;
    const rejectionRate = Math.round((s.rejectedCount / totalSubmitted) * 100);
    const avgPaymentDays = s.totalPaidCount > 0
      ? Math.round(s.paidDaysSum / s.totalPaidCount)
      : 0;

    const outstandingAmount = (s.pendingAmount || 0) + (s.approvedAmount || 0) + (s.partialAmount || 0);
    const outstandingCount = (s.pendingCount || 0) + (s.approvedCount || 0) + (s.partialCount || 0);

    return {
      currency,
      outstanding:   { count: outstandingCount, amount: outstandingAmount },
      pending:       { count: s.pendingCount || 0,    amount: s.pendingAmount || 0 },
      approved:      { count: s.approvedCount || 0,   amount: s.approvedAmount || 0 },
      partial:       { count: s.partialCount || 0,    amount: s.partialAmount || 0 },
      paidThisMonth: { count: s.paidMonthCount || 0,  amount: s.paidMonthAmount || 0 },
      rejected:      { count: s.rejectedCount || 0,   amount: s.rejectedAmount || 0 },
      overdue60:     { count: s.overdueCount || 0,    amount: s.overdueAmount || 0 },
      followUpDue:   { count: s.followUpDueCount || 0 },
      aging: {
        bucket0_30:   { count: s.b0Count || 0,  amount: s.b0Amount || 0 },
        bucket31_60:  { count: s.b31Count || 0, amount: s.b31Amount || 0 },
        bucket60plus: { count: s.b60Count || 0, amount: s.b60Amount || 0 },
      },
      byMedicalAid,
      byBranch,
      collectionRate,
      rejectionRate,
      avgPaymentDays,
      topRejectionReasons: rejectionReasons,
      monthlyTrend,
    };
  }
}