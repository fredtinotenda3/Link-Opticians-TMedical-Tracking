// FILE: lib/auth/middleware.ts

import { NextRequest, NextResponse } from "next/server";
import { AuthService, JwtPayload, hasPermission, PERMISSIONS } from "./auth.service";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { toApiError } from "@/lib/errors";

export type AuthenticatedHandler = (
  req: NextRequest,
  context: { params?: Promise<Record<string, string>>; user: JwtPayload }
) => Promise<NextResponse>;

// Wrap an API handler with authentication
export function withAuth(handler: AuthenticatedHandler): (
  req: NextRequest,
  context: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse> {
  return async (req, context) => {
    try {
      const cookieHeader = req.headers.get("cookie");
      const authHeader = req.headers.get("authorization");
      const token = AuthService.extractToken(cookieHeader, authHeader);

      if (!token) {
        throw new UnauthorizedError("Authentication required. Please log in.");
      }

      const user = AuthService.verifyToken(token);

      return handler(req, { ...context, user });
    } catch (error) {
      const apiError = toApiError(error);
      return NextResponse.json(apiError, { status: apiError.statusCode });
    }
  };
}

// Wrap with permission check
export function withPermission(
  permission: keyof typeof PERMISSIONS[keyof typeof PERMISSIONS],
  handler: AuthenticatedHandler
): (req: NextRequest, context: { params?: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return withAuth(async (req, context) => {
    if (!hasPermission(context.user.role, permission as any)) {
      throw new ForbiddenError(
        `You do not have permission to perform this action. Required permission: ${permission}`
      );
    }
    return handler(req, context);
  });
}

// Wrap with role check
export function withRoles(
  roles: string[],
  handler: AuthenticatedHandler
): (req: NextRequest, context: { params?: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return withAuth(async (req, context) => {
    if (!roles.includes(context.user.role)) {
      throw new ForbiddenError(
        `Access denied. Required roles: ${roles.join(", ")}`
      );
    }
    return handler(req, context);
  });
}

// Helper: get IP from request
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Helper: create audit context from request
export function getAuditContext(req: NextRequest, user?: JwtPayload) {
  return {
    ipAddress: getClientIp(req),
    userAgent: req.headers.get("user-agent") || undefined,
    userId: user?.userId,
    userEmail: user?.email,
    userRole: user?.role,
    userName: user ? `${user.firstName} ${user.lastName}` : undefined,
  };
}