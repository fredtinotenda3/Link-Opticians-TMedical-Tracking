// FILE: app/api/v1/claims/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { ClaimService } from "@/lib/services/claim.service";
import { toApiError } from "@/lib/errors";
import { getAuditContext } from "@/lib/auth/middleware";
import { hasPermission } from "@/lib/auth/auth.service";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/v1/claims/[id]
export const GET = withAuth(async (req, context) => {
  try {
    const { id } = await (context.params as any);
    const claim = await ClaimService.getById(id);
    return NextResponse.json({ success: true, data: ClaimService.normalizeAmounts(claim) });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

// PATCH /api/v1/claims/[id]
export const PATCH = withAuth(async (req, context) => {
  try {
    const { id } = await (context.params as any);
    const { user } = context as any;
    const body = await req.json();
    const auditCtx = getAuditContext(req, user);

    // Auditors cannot modify
    if (user.role === "auditor") {
      return NextResponse.json({ success: false, error: "Auditors have read-only access", code: "FORBIDDEN" }, { status: 403 });
    }

    // If status change — use transition
    if (body.status) {
      const updated = await ClaimService.transition(
        id,
        body.status,
        {
          paidDate: body.paidDate ? new Date(body.paidDate) : undefined,
          rejectionReason: body.rejectionReason,
          rejectionCode: body.rejectionCode,
          escalationReason: body.escalationReason,
          notes: body.notes,
          modifiedBy: user.userId,
          modifiedByName: `${user.firstName} ${user.lastName}`,
        },
        auditCtx
      );
      return NextResponse.json({ success: true, data: ClaimService.normalizeAmounts(updated) });
    }

    // Otherwise general update
    const updated = await ClaimService.update(
      id,
      {
        ...body,
        lastModifiedBy: user.userId,
        lastModifiedByName: `${user.firstName} ${user.lastName}`,
      },
      auditCtx
    );

    return NextResponse.json({ success: true, data: ClaimService.normalizeAmounts(updated) });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

// DELETE /api/v1/claims/[id]
export const DELETE = withAuth(async (req, context) => {
  try {
    const { id } = await (context.params as any);
    const { user } = context as any;
    const auditCtx = getAuditContext(req, user);

    if (!hasPermission(user.role, "canDeleteClaims")) {
      return NextResponse.json({ success: false, error: "You do not have permission to delete claims", code: "FORBIDDEN" }, { status: 403 });
    }

    await ClaimService.delete(id, user.userId, auditCtx);
    return NextResponse.json({ success: true, message: "Claim deleted" });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});