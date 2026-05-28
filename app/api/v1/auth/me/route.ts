// app/api/v1/auth/me/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";

export const GET = withAuth(async (_req, { user }) => {
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