// FILE: app/api/v1/claims/[id]/comments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { connectDB } from "@/lib/mongodb";
import ClaimComment from "@/lib/models/ClaimComment";
import { toApiError } from "@/lib/errors";
import mongoose from "mongoose";

// GET /api/v1/claims/[id]/comments
export const GET = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { id } = await (context.params as any);
    const { user } = context as any;

    const filter: any = { claimId: new mongoose.Types.ObjectId(id), isDeleted: false };

    // Restrict by visibility
    if (user.role === "auditor") {
      filter.visibility = { $in: ["public", "internal_audit"] };
    } else if (!["super_admin", "finance"].includes(user.role)) {
      filter.visibility = "public";
    }

    const comments = await ClaimComment.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: comments });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

// POST /api/v1/claims/[id]/comments
export const POST = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { id } = await (context.params as any);
    const { user } = context as any;
    const body = await req.json();

    if (!body.message?.trim()) {
      return NextResponse.json(
        { success: false, error: "Comment message is required", code: "VALIDATION_ERROR" },
        { status: 422 }
      );
    }

    const comment = await ClaimComment.create({
      claimId: new mongoose.Types.ObjectId(id),
      authorId: user.userId,
      authorName: `${user.firstName} ${user.lastName}`,
      authorRole: user.role,
      message: body.message.trim(),
      visibility: body.visibility || "public",
    });

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});