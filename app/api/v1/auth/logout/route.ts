// FILE: app/api/v1/auth/logout/route.ts

import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "lo_session";

export async function POST(_req: NextRequest) {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

// ─────────────────────────────────────────────────────────────
// FILE: app/api/v1/auth/me/route.ts
// Get current user info from token
// ─────────────────────────────────────────────────────────────

// Note: This is exported separately. In your project, create this as a
// separate file at app/api/v1/auth/me/route.ts

import { withAuth } from "@/lib/auth/middleware";

export const GET_me = withAuth(async (_req, { user }) => {
  return NextResponse.json({
    success: true,
    data: {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      branch: user.branch,
    },
  });
});