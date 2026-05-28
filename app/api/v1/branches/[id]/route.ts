// FILE: app/api/v1/branches/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { connectDB } from "@/lib/mongodb";
import Branch from "@/lib/models/Branch";
import AuditLog from "@/lib/models/AuditLog";
import { toApiError, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { getAuditContext } from "@/lib/auth/middleware";
import mongoose from "mongoose";

// GET /api/v1/branches/[id]
export const GET = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { id } = await (context.params as any);
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Branch");

    const branch = await Branch.findOne({ _id: id, isDeleted: false }).lean();
    if (!branch) throw new NotFoundError("Branch");

    return NextResponse.json({ success: true, data: branch });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

// PATCH /api/v1/branches/[id]
export const PATCH = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { id } = await (context.params as any);
    const { user } = context as any;
    const body = await req.json();
    const auditCtx = getAuditContext(req, user);

    if (user.role !== "super_admin") throw new ForbiddenError("Only Super Admin can update branches");
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Branch");

    // Validate code uniqueness if being changed
    if (body.code) {
      const existing = await Branch.findOne({
        code: body.code.toUpperCase().trim(),
        _id: { $ne: id },
        isDeleted: false,
      });
      if (existing) throw new ValidationError("Validation failed", { code: "Code already in use by another branch" });
      body.code = body.code.toUpperCase().trim();
    }

    if (body.branchName) body.branchName = body.branchName.trim();

    const branch = await Branch.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: body },
      { new: true, runValidators: true }
    );
    if (!branch) throw new NotFoundError("Branch");

    await AuditLog.create({
      action: "UPDATE",
      entityType: "Branch",
      entityId: id,
      entityLabel: branch.branchName,
      newValues: body,
      ...auditCtx,
    });

    return NextResponse.json({ success: true, data: branch });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

// DELETE /api/v1/branches/[id]
export const DELETE = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { id } = await (context.params as any);
    const { user } = context as any;
    const auditCtx = getAuditContext(req, user);

    if (user.role !== "super_admin") throw new ForbiddenError("Only Super Admin can delete branches");
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Branch");

    const branch = await Branch.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
    if (!branch) throw new NotFoundError("Branch");

    await AuditLog.create({
      action: "DELETE",
      entityType: "Branch",
      entityId: id,
      entityLabel: branch.branchName,
      ...auditCtx,
    });

    return NextResponse.json({ success: true, message: "Branch deleted" });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});