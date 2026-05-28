// FILE: app/api/v1/automation/run/route.ts
// Manual trigger for automation engines (admin only)

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { FollowUpEngine } from "@/lib/automation/followup.engine";
import { EscalationEngine } from "@/lib/automation/escalation.engine";
import { toApiError } from "@/lib/errors";

export const POST = withAuth(async (req, context) => {
  try {
    const { user } = context as any;

    if (!["super_admin", "finance"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Access denied", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const engine = body.engine || "all";

    const results: Record<string, any> = {};

    if (engine === "followup" || engine === "all") {
      results.followup = await FollowUpEngine.run();
    }

    if (engine === "escalation" || engine === "all") {
      results.escalation = await EscalationEngine.run();
    }

    return NextResponse.json({
      success: true,
      message: `Automation engine(s) executed`,
      data: results,
      triggeredBy: `${user.firstName} ${user.lastName}`,
      triggeredAt: new Date().toISOString(),
    });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

// GET status
export const GET = withAuth(async (_req, context) => {
  const { user } = context as any;
  if (!["super_admin", "finance"].includes(user.role)) {
    return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
  }
  return NextResponse.json({
    success: true,
    data: {
      engines: ["followup", "escalation"],
      schedule: {
        followup: "Daily at 07:00 CAT (05:00 UTC)",
        escalation: "Daily at 08:00 CAT (06:00 UTC)",
      },
      status: "active",
    },
  });
});