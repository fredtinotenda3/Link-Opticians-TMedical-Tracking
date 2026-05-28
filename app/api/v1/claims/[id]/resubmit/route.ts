// FILE: app/api/v1/claims/[id]/resubmit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { ClaimService } from "@/lib/services/claim.service";
import { toApiError } from "@/lib/errors";
import { getAuditContext } from "@/lib/auth/middleware";

export const POST = withAuth(async (req, context) => {
  try {
    const { id } = await (context.params as any);
    const { user } = context as any;
    const body = await req.json();
    const auditCtx = getAuditContext(req, user);

    const resubmitted = await ClaimService.resubmit(
      id,
      {
        claimNumber: body.claimNumber,
        submissionDate: body.submissionDate,
        notes: body.notes,
        createdBy: user.userId,
        createdByName: `${user.firstName} ${user.lastName}`,
      },
      auditCtx
    );

    return NextResponse.json(
      { success: true, data: ClaimService.normalizeAmounts(resubmitted) },
      { status: 201 }
    );
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

// ─────────────────────────────────────────────────────────────
// FILE: app/api/v1/claims/[id]/partial-payment/route.ts
// ─────────────────────────────────────────────────────────────

export const POST_partial = withAuth(async (req, context) => {
  try {
    const { id } = await (context.params as any);
    const { user } = context as any;
    const body = await req.json();
    const auditCtx = getAuditContext(req, user);

    if (!["super_admin", "finance"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Only Finance staff can record payments", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const updated = await ClaimService.recordPartialPayment(
      id,
      parseFloat(body.amountPaid),
      body.paymentDate ? new Date(body.paymentDate) : new Date(),
      auditCtx
    );

    return NextResponse.json({ success: true, data: ClaimService.normalizeAmounts(updated) });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

// ─────────────────────────────────────────────────────────────
// FILE: app/api/v1/claims/[id]/follow-up/route.ts
// ─────────────────────────────────────────────────────────────

export const POST_followup = withAuth(async (req, context) => {
  try {
    const { id } = await (context.params as any);
    const { user } = context as any;
    const body = await req.json();
    const auditCtx = getAuditContext(req, user);

    if (!body.followUpDate) {
      return NextResponse.json(
        { success: false, error: "Follow-up date is required", code: "VALIDATION_ERROR" },
        { status: 422 }
      );
    }

    const updated = await ClaimService.setFollowUpDate(
      id,
      new Date(body.followUpDate),
      auditCtx
    );

    return NextResponse.json({ success: true, data: ClaimService.normalizeAmounts(updated) });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

// ─────────────────────────────────────────────────────────────
// FILE: app/api/v1/claims/[id]/comments/route.ts
// ─────────────────────────────────────────────────────────────

import { connectDB } from "@/lib/mongodb";
import ClaimComment from "@/lib/models/ClaimComment";
import mongoose from "mongoose";

export const GET_comments = withAuth(async (req, context) => {
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

export const POST_comment = withAuth(async (req, context) => {
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