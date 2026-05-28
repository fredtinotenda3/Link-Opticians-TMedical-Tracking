// FILE: app/api/v1/audit-logs/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { connectDB } from "@/lib/mongodb";
import AuditLog from "@/lib/models/AuditLog";
import { toApiError } from "@/lib/errors";

export const GET = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { user } = context as any;

    if (!["super_admin", "finance", "auditor"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Access denied", code: "FORBIDDEN" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filter: any = {};

    const action = searchParams.get("action");
    if (action && action !== "all") filter.action = action;

    const entityType = searchParams.get("entityType");
    if (entityType && entityType !== "all") filter.entityType = entityType;

    const userId = searchParams.get("userId");
    if (userId) filter.userId = userId;

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total, page, limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});