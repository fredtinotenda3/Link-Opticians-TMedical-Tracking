import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { connectDB } from "@/lib/mongodb";
import Patient from "@/lib/models/Patient";
import Claim from "@/lib/models/Claim";
import AuditLog from "@/lib/models/AuditLog";
import { toApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { getAuditContext } from "@/lib/auth/middleware";
import mongoose from "mongoose";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { id } = await (context.params as any);

    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Patient");

    const [patient, claims] = await Promise.all([
      Patient.findOne({ _id: id, isDeleted: false }).lean(),
      Claim.find({
        $or: [
          { patientRef: new mongoose.Types.ObjectId(id) },
          { patientId: id },
        ],
        isDeleted: false,
      })
        .sort({ submissionDate: -1 })
        .limit(50)
        .lean(),
    ]);

    if (!patient) throw new NotFoundError("Patient");

    return NextResponse.json({ success: true, data: { ...patient, claims } });
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

    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Patient");

    const patient = await Patient.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: body },
      { new: true, runValidators: true }
    );
    if (!patient) throw new NotFoundError("Patient");

    await AuditLog.create({
      action: "UPDATE",
      entityType: "Patient",
      entityId: id,
      entityLabel: `${patient.firstName} ${patient.lastName}`,
      newValues: body,
      ...auditCtx,
    });

    return NextResponse.json({ success: true, data: patient });
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

    if (!["super_admin", "finance"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Access denied", code: "FORBIDDEN" }, { status: 403 });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Patient");

    const patient = await Patient.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: new mongoose.Types.ObjectId(user.userId) } }
    );
    if (!patient) throw new NotFoundError("Patient");

    await AuditLog.create({
      action: "DELETE",
      entityType: "Patient",
      entityId: id,
      entityLabel: `${patient.firstName} ${patient.lastName}`,
      ...auditCtx,
    });

    return NextResponse.json({ success: true, message: "Patient deleted" });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});