// FILE: app/api/v1/notifications/read-all/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { NotificationService } from "@/lib/services/notification.service";
import { toApiError } from "@/lib/errors";

export const POST = withAuth(async (_req, context) => {
  try {
    const { user } = context as any;
    await NotificationService.markAllRead(user.userId);
    return NextResponse.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});