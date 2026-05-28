// FILE: app/api/v1/users/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { connectDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import AuditLog from "@/lib/models/AuditLog";
import { toApiError, ValidationError, ForbiddenError } from "@/lib/errors";
import { getAuditContext } from "@/lib/auth/middleware";

export const GET = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { user } = context as any;

    if (!["super_admin"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Access denied", code: "FORBIDDEN" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filter: any = { isDeleted: false };

    const role = searchParams.get("role");
    if (role && role !== "all") filter.role = role;

    const branch = searchParams.get("branch");
    if (branch && branch !== "all") filter.branch = branch;

    const active = searchParams.get("active");
    if (active !== null) filter.active = active === "true";

    const users = await User.find(filter)
      .select("-password")
      .sort({ lastName: 1, firstName: 1 })
      .lean();

    return NextResponse.json({ success: true, data: users, count: users.length });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

export const POST = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { user } = context as any;
    const auditCtx = getAuditContext(req, user);

    if (user.role !== "super_admin") {
      throw new ForbiddenError("Only Super Admin can create users");
    }

    const body = await req.json();
    const errors: Record<string, string> = {};

    if (!body.firstName?.trim()) errors.firstName = "First name is required";
    if (!body.lastName?.trim()) errors.lastName = "Last name is required";
    if (!body.email?.trim()) errors.email = "Email is required";
    if (!body.password || body.password.length < 8) errors.password = "Password must be at least 8 characters";
    if (!body.role) errors.role = "Role is required";

    if (Object.keys(errors).length > 0) {
      throw new ValidationError("User validation failed", errors);
    }

    const exists = await User.findOne({ email: body.email.toLowerCase().trim() });
    if (exists) {
      throw new ValidationError("Validation failed", { email: "Email already exists" });
    }

    const newUser = await User.create({
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: body.email.toLowerCase().trim(),
      password: body.password,
      role: body.role,
      branch: body.branch,
      active: true,
      mustChangePassword: body.mustChangePassword ?? true,
    });

    await AuditLog.create({
      action: "CREATE",
      entityType: "User",
      entityId: newUser._id,
      entityLabel: newUser.email,
      newValues: { role: newUser.role, branch: newUser.branch },
      ...auditCtx,
    });

    const { password: _, ...safeUser } = newUser.toObject();
    return NextResponse.json({ success: true, data: safeUser }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});