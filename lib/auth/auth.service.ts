// FILE: lib/auth/auth.service.ts

import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import User, { IUser, UserRole } from "@/lib/models/User";
import AuditLog from "@/lib/models/AuditLog";
import { UnauthorizedError, ForbiddenError, NotFoundError, BusinessRuleError } from "@/lib/errors";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
const COOKIE_NAME = "lo_session";
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  branch?: string;
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
}

export interface LoginResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    branch?: string;
    mustChangePassword: boolean;
  };
  token: string;
  expiresAt: Date;
}

export class AuthService {
  // Sign JWT token
  static signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
  }

  // Verify JWT token
  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError("Invalid or expired session. Please log in again.");
    }
  }

  // Login
  static async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResult> {
    await connectDB();

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      isDeleted: false,
    }).select("+password");

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (!user.active) {
      throw new UnauthorizedError("Your account has been deactivated. Contact your administrator.");
    }

    // Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedError(
        `Account temporarily locked. Try again in ${minutesLeft} minute(s).`
      );
    }

    const passwordMatch = await user.comparePassword(password);

    if (!passwordMatch) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await user.save({ validateBeforeSave: false });

      await AuditLog.create({
        action: "LOGIN",
        entityType: "User",
        entityId: user._id,
        entityLabel: user.email,
        userEmail: email,
        ipAddress,
        userAgent,
        success: false,
        errorMessage: "Invalid password",
      });

      throw new UnauthorizedError("Invalid email or password");
    }

    // Reset failed attempts
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    await user.save({ validateBeforeSave: false });

    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    const token = AuthService.signToken({
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      branch: user.branch,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    await AuditLog.create({
      action: "LOGIN",
      entityType: "User",
      entityId: user._id,
      entityLabel: user.email,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      userName: user.fullName,
      ipAddress,
      userAgent,
      success: true,
    });

    return {
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        branch: user.branch,
        mustChangePassword: user.mustChangePassword,
      },
      token,
      expiresAt,
    };
  }

  // Get current user from request headers/cookies
  static async getCurrentUser(token: string): Promise<IUser> {
    const payload = AuthService.verifyToken(token);
    await connectDB();

    const user = await User.findById(payload.userId).where({ isDeleted: false, active: true });
    if (!user) throw new UnauthorizedError("User not found or deactivated");
    return user;
  }

  // Get token from cookie string or Authorization header
  static extractToken(cookieHeader?: string | null, authHeader?: string | null): string | null {
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      if (match) return match[1];
    }
    return null;
  }
}

// Permission matrix
export const PERMISSIONS: Record<UserRole, {
  canCreateClaims: boolean;
  canEditClaims: boolean;
  canDeleteClaims: boolean;
  canApproveClaims: boolean;
  canRejectClaims: boolean;
  canManagePayments: boolean;
  canExportReports: boolean;
  canViewAnalytics: boolean;
  canManageUsers: boolean;
  canManageBranches: boolean;
  canManageMedicalAids: boolean;
  canViewAuditLogs: boolean;
  canManageSettings: boolean;
  canViewAllBranches: boolean;
}> = {
  super_admin: {
    canCreateClaims: true, canEditClaims: true, canDeleteClaims: true,
    canApproveClaims: true, canRejectClaims: true, canManagePayments: true,
    canExportReports: true, canViewAnalytics: true, canManageUsers: true,
    canManageBranches: true, canManageMedicalAids: true, canViewAuditLogs: true,
    canManageSettings: true, canViewAllBranches: true,
  },
  finance: {
    canCreateClaims: false, canEditClaims: true, canDeleteClaims: false,
    canApproveClaims: true, canRejectClaims: true, canManagePayments: true,
    canExportReports: true, canViewAnalytics: true, canManageUsers: false,
    canManageBranches: false, canManageMedicalAids: false, canViewAuditLogs: true,
    canManageSettings: false, canViewAllBranches: true,
  },
  receptionist: {
    canCreateClaims: true, canEditClaims: true, canDeleteClaims: false,
    canApproveClaims: false, canRejectClaims: false, canManagePayments: false,
    canExportReports: false, canViewAnalytics: false, canManageUsers: false,
    canManageBranches: false, canManageMedicalAids: false, canViewAuditLogs: false,
    canManageSettings: false, canViewAllBranches: false,
  },
  branch_manager: {
    canCreateClaims: true, canEditClaims: true, canDeleteClaims: false,
    canApproveClaims: false, canRejectClaims: false, canManagePayments: false,
    canExportReports: true, canViewAnalytics: true, canManageUsers: false,
    canManageBranches: false, canManageMedicalAids: false, canViewAuditLogs: false,
    canManageSettings: false, canViewAllBranches: false,
  },
  auditor: {
    canCreateClaims: false, canEditClaims: false, canDeleteClaims: false,
    canApproveClaims: false, canRejectClaims: false, canManagePayments: false,
    canExportReports: true, canViewAnalytics: true, canManageUsers: false,
    canManageBranches: false, canManageMedicalAids: false, canViewAuditLogs: true,
    canManageSettings: false, canViewAllBranches: true,
  },
};

export function hasPermission(role: UserRole, permission: keyof typeof PERMISSIONS[UserRole]): boolean {
  return PERMISSIONS[role]?.[permission] ?? false;
}