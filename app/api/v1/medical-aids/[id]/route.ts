import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { connectDB } from "@/lib/mongodb";
import MedicalAid from "@/lib/models/MedicalAid";
import AuditLog from "@/lib/models/AuditLog";
import { toApiError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { getAuditContext } from "@/lib/auth/middleware";
import mongoose from "mongoose";

export const GET = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { id } = await (context.params as any);
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("MedicalAid");
    const aid = await MedicalAid.findOne({ _id: id, isDeleted: false }).lean();
    if (!aid) throw new NotFoundError("MedicalAid");
    return NextResponse.json({ success: true, data: aid });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

export const PATCH = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { id } = await (context.params as any);
    const { user } = context as any;
    const body = await req.json();
    const auditCtx = getAuditContext(req, user);

    if (!["super_admin", "finance"].includes(user.role)) throw new ForbiddenError();
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("MedicalAid");

    const aid = await MedicalAid.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: body },
      { new: true, runValidators: true }
    );
    if (!aid) throw new NotFoundError("MedicalAid");

    await AuditLog.create({
      action: "UPDATE",
      entityType: "MedicalAid",
      entityId: id,
      entityLabel: aid.name,
      newValues: body,
      ...auditCtx,
    });

    return NextResponse.json({ success: true, data: aid });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

export const DELETE = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { id } = await (context.params as any);
    const { user } = context as any;
    const auditCtx = getAuditContext(req, user);

    if (user.role !== "super_admin") throw new ForbiddenError("Only Super Admin can delete medical aids");
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("MedicalAid");

    const aid = await MedicalAid.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
    if (!aid) throw new NotFoundError("MedicalAid");

    await AuditLog.create({
      action: "DELETE",
      entityType: "MedicalAid",
      entityId: id,
      entityLabel: aid.name,
      ...auditCtx,
    });

    return NextResponse.json({ success: true, message: "Medical aid deleted" });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});