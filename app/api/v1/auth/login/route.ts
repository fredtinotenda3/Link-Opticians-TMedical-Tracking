// FILE: app/api/v1/auth/login/route.ts

import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth/auth.service";
import { toApiError } from "@/lib/errors";
import { getClientIp } from "@/lib/auth/middleware";

const COOKIE_NAME = "lo_session";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 8 * 60 * 60, // 8 hours in seconds
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required", code: "VALIDATION_ERROR" },
        { status: 422 }
      );
    }

    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await AuthService.login(email, password, ipAddress, userAgent);

    const response = NextResponse.json({
      success: true,
      data: result.user,
      expiresAt: result.expiresAt,
    });

    // Set HttpOnly cookie
    response.cookies.set(COOKIE_NAME, result.token, {
      ...COOKIE_OPTIONS,
      expires: result.expiresAt,
    });

    return response;
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}