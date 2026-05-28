// FILE: lib/repositories/claim.repository.ts

import mongoose from "mongoose";
import Claim, { IClaim } from "@/lib/models/Claim";
import { connectDB } from "@/lib/mongodb";
import { NotFoundError } from "@/lib/errors";

export interface ClaimFilters {
  status?: string | string[];
  medicalAid?: string;
  branch?: string;
  currency?: "USD" | "ZWG";
  patientRef?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  priority?: string;
  isDeleted?: boolean;
  isArchived?: boolean;
  minDaysOutstanding?: number;
  followUpDueBefore?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class ClaimRepository {
  static async findById(id: string): Promise<IClaim> {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Claim");
    const claim = await Claim.findOne({ _id: id, isDeleted: false });
    if (!claim) throw new NotFoundError("Claim");
    return claim;
  }

  static async findAll(
    filters: ClaimFilters = {},
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<IClaim> | IClaim[]> {
    await connectDB();
    const query = ClaimRepository.buildQuery(filters);

    if (!pagination) {
      const data = await Claim.find(query).sort({ submissionDate: -1 }).lean();
      return data as IClaim[];
    }

    const { page = 1, limit = 50, sortBy = "submissionDate", sortDir = "desc" } = pagination;
    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortDir === "asc" ? 1 : -1 };

    const [data, total] = await Promise.all([
      Claim.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Claim.countDocuments(query),
    ]);

    return {
      data: data as IClaim[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }

  static async findWithCursor(filters: ClaimFilters = {}): Promise<IClaim[]> {
    await connectDB();
    const query = ClaimRepository.buildQuery(filters);
    return Claim.find(query).sort({ submissionDate: -1 }).lean() as Promise<IClaim[]>;
  }

  static async create(data: Partial<IClaim>): Promise<IClaim> {
    await connectDB();
    return Claim.create(data);
  }

  static async update(id: string, data: Partial<IClaim>): Promise<IClaim> {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Claim");
    const claim = await Claim.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!claim) throw new NotFoundError("Claim");
    return claim;
  }

  static async softDelete(id: string, deletedBy?: string): Promise<void> {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Claim");
    const result = await Claim.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } }
    );
    if (!result) throw new NotFoundError("Claim");
  }

  static async addHistoryEntry(
    id: string,
    entry: IClaim["history"][0]
  ): Promise<void> {
    await connectDB();
    await Claim.findByIdAndUpdate(id, {
      $push: { history: { $each: [entry], $position: 0 } },
    });
  }

  static async getOutstandingByMedicalAid(currency: "USD" | "ZWG"): Promise<
    Array<{ _id: string; pending: number; approved: number; partial: number; total: number; count: number }>
  > {
    await connectDB();
    return Claim.aggregate([
      {
        $match: {
          status: { $in: ["pending", "approved", "partial"] },
          currency,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$medicalAid",
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, { $ifNull: ["$amountZWG", "$amount"] }, 0] },
          },
          approved: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, { $ifNull: ["$amountZWG", "$amount"] }, 0] },
          },
          partial: {
            $sum: {
              $cond: [
                { $eq: ["$status", "partial"] },
                { $subtract: [{ $ifNull: ["$amountZWG", "$amount"] }, { $ifNull: ["$partialAmountPaid", 0] }] },
                0,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $addFields: { total: { $add: ["$pending", "$approved", "$partial"] } },
      },
      { $sort: { total: -1 } },
    ]);
  }

  static async getAgingBuckets(currency: "USD" | "ZWG"): Promise<{
    bucket0_30: { count: number; amount: number };
    bucket31_60: { count: number; amount: number };
    bucket60plus: { count: number; amount: number };
  }> {
    await connectDB();
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const results = await Claim.aggregate([
      {
        $match: {
          status: { $in: ["pending", "approved", "partial"] },
          currency,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          bucket0_30_count: { $sum: { $cond: [{ $gte: ["$submissionDate", d30] }, 1, 0] } },
          bucket0_30_amount: { $sum: { $cond: [{ $gte: ["$submissionDate", d30] }, { $ifNull: ["$amountZWG", "$amount"] }, 0] } },
          bucket31_60_count: { $sum: { $cond: [{ $and: [{ $lt: ["$submissionDate", d30] }, { $gte: ["$submissionDate", d60] }] }, 1, 0] } },
          bucket31_60_amount: { $sum: { $cond: [{ $and: [{ $lt: ["$submissionDate", d30] }, { $gte: ["$submissionDate", d60] }] }, { $ifNull: ["$amountZWG", "$amount"] }, 0] } },
          bucket60plus_count: { $sum: { $cond: [{ $lt: ["$submissionDate", d60] }, 1, 0] } },
          bucket60plus_amount: { $sum: { $cond: [{ $lt: ["$submissionDate", d60] }, { $ifNull: ["$amountZWG", "$amount"] }, 0] } },
        },
      },
    ]);

    const r = results[0] || {};
    return {
      bucket0_30:   { count: r.bucket0_30_count || 0,   amount: r.bucket0_30_amount || 0 },
      bucket31_60:  { count: r.bucket31_60_count || 0,  amount: r.bucket31_60_amount || 0 },
      bucket60plus: { count: r.bucket60plus_count || 0, amount: r.bucket60plus_amount || 0 },
    };
  }

  static async getFollowUpDue(): Promise<IClaim[]> {
    await connectDB();
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return Claim.find({
      status: { $in: ["pending", "approved", "partial"] },
      isDeleted: false,
      $or: [
        { followUpDate: { $lte: now } },
        { followUpDate: { $exists: false }, submissionDate: { $lte: d30 } },
      ],
    }).sort({ submissionDate: 1 }).lean() as Promise<IClaim[]>;
  }

  static async getOverdueClaims(days = 60): Promise<IClaim[]> {
    await connectDB();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return Claim.find({
      status: { $in: ["pending", "approved", "partial"] },
      submissionDate: { $lte: cutoff },
      isDeleted: false,
    }).sort({ submissionDate: 1 }).lean() as Promise<IClaim[]>;
  }

  static async searchClaims(query: string, currency?: string): Promise<IClaim[]> {
    await connectDB();
    const filter: any = {
      isDeleted: false,
      $text: { $search: query },
    };
    if (currency) filter.currency = currency;
    return Claim.find(filter, { score: { $meta: "textScore" } })
      .sort({ score: { $meta: "textScore" } })
      .limit(20)
      .lean() as Promise<IClaim[]>;
  }

  private static buildQuery(filters: ClaimFilters): Record<string, any> {
    const query: Record<string, any> = {
      isDeleted: filters.isDeleted ?? false,
    };

    if (filters.isArchived !== undefined) query.isArchived = filters.isArchived;
    if (filters.status) {
      query.status = Array.isArray(filters.status)
        ? { $in: filters.status }
        : filters.status;
    }
    if (filters.medicalAid) query.medicalAid = filters.medicalAid;
    if (filters.branch) query.branch = filters.branch;
    if (filters.currency) query.currency = filters.currency;
    if (filters.patientRef) query.patientRef = filters.patientRef;
    if (filters.priority) query.priority = filters.priority;

    if (filters.dateFrom || filters.dateTo) {
      query.submissionDate = {};
      if (filters.dateFrom) query.submissionDate.$gte = filters.dateFrom;
      if (filters.dateTo) query.submissionDate.$lte = filters.dateTo;
    }

    if (filters.followUpDueBefore) {
      query.followUpDate = { $lte: filters.followUpDueBefore };
    }

    if (filters.minDaysOutstanding) {
      const cutoff = new Date(
        Date.now() - filters.minDaysOutstanding * 24 * 60 * 60 * 1000
      );
      query.submissionDate = { ...query.submissionDate, $lte: cutoff };
    }

    if (filters.search) {
      const re = new RegExp(filters.search, "i");
      query.$or = [
        { claimNumber: re },
        { patientName: re },
        { memberNumber: re },
        { medicalAid: re },
        { notes: re },
      ];
    }

    return query;
  }
}