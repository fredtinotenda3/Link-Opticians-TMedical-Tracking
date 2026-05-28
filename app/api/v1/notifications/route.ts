// FILE: app/api/v1/notifications/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { NotificationService } from "@/lib/services/notification.service";
import { toApiError } from "@/lib/errors";

// GET /api/v1/notifications — get notifications for current user
export const GET = withAuth(async (req, context) => {
  try {
    const { user } = context as any;
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    const notifications = await NotificationService.getForUser(user.userId, {
      unreadOnly,
      limit,
    });

    const unreadCount = await NotificationService.getUnreadCount(user.userId);

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});