// FILE: lib/automation/rejection.intelligence.ts
// Analyzes rejection patterns and produces insight reports

import { connectDB } from "@/lib/mongodb";
import Claim from "@/lib/models/Claim";

export interface RejectionInsights {
  totalRejected: number;
  rejectionRate: number;
  byMedicalAid: Array<{
    medicalAid: string;
    total: number;
    rejected: number;
    rate: number;
    topReason: string;
  }>;
  byBranch: Array<{
    branch: string;
    total: number;
    rejected: number;
    rate: number;
  }>;
  topReasons: Array<{ reason: string; count: number; percentage: number }>;
  trend: Array<{ month: string; rejected: number; total: number; rate: number }>;
  resubmissionSuccessRate: number;
  avgDaysToResubmit: number;
  worstPerformingAid: string;
  mostCommonReason: string;
}

export class RejectionIntelligence {
  static async analyze(currency?: "USD" | "ZWG"): Promise<RejectionInsights> {
    await connectDB();

    const matchBase: any = { isDeleted: false };
    if (currency) matchBase.currency = currency;

    // Overall stats
    const [overall] = await Claim.aggregate([
      { $match: matchBase },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        },
      },
    ]);

    const totalRejected = overall?.rejected || 0;
    const totalClaims = overall?.total || 1;
    const rejectionRate = Math.round((totalRejected / totalClaims) * 100);

    // By medical aid
    const byAidRaw = await Claim.aggregate([
      { $match: matchBase },
      {
        $group: {
          _id: "$medicalAid",
          total: { $sum: 1 },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        },
      },
    ]);

    // Top rejection reason per medical aid
    const topReasonByAid = await Claim.aggregate([
      { $match: { ...matchBase, status: "rejected", rejectionReason: { $exists: true, $ne: "" } } },
      {
        $group: {
          _id: { medicalAid: "$medicalAid", reason: "$rejectionReason" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      {
        $group: {
          _id: "$_id.medicalAid",
          topReason: { $first: "$_id.reason" },
          count: { $first: "$count" },
        },
      },
    ]);

    const topReasonMap: Record<string, string> = {};
    topReasonByAid.forEach((r) => {
      topReasonMap[r._id] = r.topReason;
    });

    const byMedicalAid = byAidRaw
      .map((r) => ({
        medicalAid: r._id,
        total: r.total,
        rejected: r.rejected,
        rate: Math.round((r.rejected / (r.total || 1)) * 100),
        topReason: topReasonMap[r._id] || "—",
      }))
      .sort((a, b) => b.rate - a.rate);

    // By branch
    const byBranchRaw = await Claim.aggregate([
      { $match: matchBase },
      {
        $group: {
          _id: "$branch",
          total: { $sum: 1 },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        },
      },
    ]);

    const byBranch = byBranchRaw
      .map((r) => ({
        branch: r._id,
        total: r.total,
        rejected: r.rejected,
        rate: Math.round((r.rejected / (r.total || 1)) * 100),
      }))
      .sort((a, b) => b.rejected - a.rejected);

    // Top rejection reasons
    const reasonsRaw = await Claim.aggregate([
      { $match: { ...matchBase, status: "rejected", rejectionReason: { $exists: true, $ne: "" } } },
      { $group: { _id: "$rejectionReason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]);

    const topReasons = reasonsRaw.map((r) => ({
      reason: r._id,
      count: r.count,
      percentage: Math.round((r.count / (totalRejected || 1)) * 100),
    }));

    // Monthly trend (6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const trendRaw = await Claim.aggregate([
      { $match: { ...matchBase, submissionDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$submissionDate" }, month: { $month: "$submissionDate" } },
          total: { $sum: 1 },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const trend = trendRaw.map((m) => ({
      month: `${monthNames[m._id.month - 1]} ${m._id.year}`,
      rejected: m.rejected,
      total: m.total,
      rate: Math.round((m.rejected / (m.total || 1)) * 100),
    }));

    // Resubmission success rate
    const resubStats = await Claim.aggregate([
      { $match: { ...matchBase, resubmissionCount: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          successful: { $sum: { $cond: [{ $in: ["$status", ["paid", "approved", "partial"]] }, 1, 0] } },
        },
      },
    ]);

    const resubTotal = resubStats[0]?.total || 0;
    const resubSuccessful = resubStats[0]?.successful || 0;
    const resubmissionSuccessRate = resubTotal > 0
      ? Math.round((resubSuccessful / resubTotal) * 100)
      : 0;

    return {
      totalRejected,
      rejectionRate,
      byMedicalAid,
      byBranch,
      topReasons,
      trend,
      resubmissionSuccessRate,
      avgDaysToResubmit: 0, // Would need more data tracking
      worstPerformingAid: byMedicalAid[0]?.medicalAid || "—",
      mostCommonReason: topReasons[0]?.reason || "—",
    };
  }
}