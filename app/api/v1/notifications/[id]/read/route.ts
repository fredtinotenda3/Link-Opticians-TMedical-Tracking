// FILE: app/api/v1/notifications/[id]/read/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { NotificationService } from "@/lib/services/notification.service";
import { toApiError } from "@/lib/errors";

export const POST = withAuth(async (_req, context) => {
  try {
    const { id } = await (context.params as any);
    await NotificationService.markRead(id);
    return NextResponse.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});