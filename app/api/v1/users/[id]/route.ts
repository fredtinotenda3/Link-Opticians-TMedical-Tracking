// FILE: app/api/v1/users/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { connectDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import AuditLog from "@/lib/models/AuditLog";
import { toApiError, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { getAuditContext } from "@/lib/auth/middleware";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// GET /api/v1/users/[id]
export const GET = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { id } = await (context.params as any);
    const { user } = context as any;

    if (user.role !== "super_admin") throw new ForbiddenError("Only Super Admin can view user details");
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("User");

    const found = await User.findOne({ _id: id, isDeleted: false })
      .select("-password")
      .lean();
    if (!found) throw new NotFoundError("User");

    return NextResponse.json({ success: true, data: found });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

// PATCH /api/v1/users/[id]
export const PATCH = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { id } = await (context.params as any);
    const { user } = context as any;
    const body = await req.json();
    const auditCtx = getAuditContext(req, user);

    if (user.role !== "super_admin") throw new ForbiddenError("Only Super Admin can update users");
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("User");

    const target = await User.findOne({ _id: id, isDeleted: false });
    if (!target) throw new NotFoundError("User");

    const updateData: any = {};

    // Allowed fields
    if (body.firstName !== undefined) updateData.firstName = body.firstName.trim();
    if (body.lastName !== undefined) updateData.lastName = body.lastName.trim();
    if (body.role !== undefined) updateData.role = body.role;
    if (body.branch !== undefined) updateData.branch = body.branch;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.mustChangePassword !== undefined) updateData.mustChangePassword = body.mustChangePassword;

    // Email uniqueness check
    if (body.email && body.email !== target.email) {
      const emailExists = await User.findOne({
        email: body.email.toLowerCase().trim(),
        _id: { $ne: id },
        isDeleted: false,
      });
      if (emailExists) throw new ValidationError("Validation failed", { email: "Email already in use" });
      updateData.email = body.email.toLowerCase().trim();
    }

    // Password reset
    if (body.newPassword) {
      if (body.newPassword.length < 8) {
        throw new ValidationError("Validation failed", { newPassword: "Password must be at least 8 characters" });
      }
      const salt = await bcrypt.genSalt(12);
      updateData.password = await bcrypt.hash(body.newPassword, salt);
      updateData.mustChangePassword = true;
      updateData.passwordChangedAt = new Date();
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    await AuditLog.create({
      action: "UPDATE",
      entityType: "User",
      entityId: id,
      entityLabel: target.email,
      newValues: { ...updateData, password: undefined },
      ...auditCtx,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

// DELETE /api/v1/users/[id] — soft delete
export const DELETE = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { id } = await (context.params as any);
    const { user } = context as any;
    const auditCtx = getAuditContext(req, user);

    if (user.role !== "super_admin") throw new ForbiddenError("Only Super Admin can delete users");
    if (user.userId === id) throw new ForbiddenError("You cannot delete your own account");
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("User");

    const target = await User.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), active: false } }
    );
    if (!target) throw new NotFoundError("User");

    await AuditLog.create({
      action: "DELETE",
      entityType: "User",
      entityId: id,
      entityLabel: target.email,
      ...auditCtx,
    });

    return NextResponse.json({ success: true, message: "User deleted" });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});