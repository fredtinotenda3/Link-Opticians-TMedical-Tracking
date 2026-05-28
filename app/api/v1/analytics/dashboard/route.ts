// FILE: app/api/v1/analytics/dashboard/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { AnalyticsService } from "@/lib/services/analytics.service";
import { toApiError } from "@/lib/errors";

export const GET = withAuth(async (req, { user }) => {
  try {
    const { searchParams } = new URL(req.url);
    const currency = (searchParams.get("currency") || "USD") as "USD" | "ZWG";

    const metrics = await AnalyticsService.getDashboardMetrics(currency);

    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});