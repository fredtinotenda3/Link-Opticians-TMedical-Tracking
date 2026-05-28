// FILE: app/api/v1/claims/[id]/follow-up/route.ts

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