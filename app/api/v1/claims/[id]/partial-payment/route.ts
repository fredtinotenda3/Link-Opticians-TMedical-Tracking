// FILE: app/api/v1/claims/[id]/partial-payment/route.ts

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

    if (!["super_admin", "finance"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Only Finance staff can record payments", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (!body.amountPaid || parseFloat(body.amountPaid) <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount paid must be greater than 0", code: "VALIDATION_ERROR" },
        { status: 422 }
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