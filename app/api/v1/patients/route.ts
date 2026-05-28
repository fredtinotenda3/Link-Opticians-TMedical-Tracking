// FILE: app/api/v1/patients/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { connectDB } from "@/lib/mongodb";
import Patient from "@/lib/models/Patient";
import AuditLog from "@/lib/models/AuditLog";
import { toApiError, ValidationError } from "@/lib/errors";
import { getAuditContext } from "@/lib/auth/middleware";

// GET /api/v1/patients
export const GET = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { user } = context as any;
    const { searchParams } = new URL(req.url);

    const filter: any = { isDeleted: false };

    const search = searchParams.get("search");
    if (search) {
      filter.$text = { $search: search };
    }

    const branch = searchParams.get("branch");
    if (branch && branch !== "all") {
      if (user.role === "branch_manager" && branch !== user.branch) {
        return NextResponse.json({ success: false, error: "Access denied", code: "FORBIDDEN" }, { status: 403 });
      }
      filter.branch = branch;
    } else if (user.role === "branch_manager" && user.branch) {
      filter.branch = user.branch;
    }

    const medicalAid = searchParams.get("medicalAid");
    if (medicalAid) filter.medicalAid = medicalAid;

    const status = searchParams.get("status");
    if (status) filter.status = status;

    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Patient.find(filter).sort({ lastName: 1, firstName: 1 }).skip(skip).limit(limit).lean(),
      Patient.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total, page, limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

// POST /api/v1/patients
export const POST = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { user } = context as any;
    const body = await req.json();
    const auditCtx = getAuditContext(req, user);

    // Validate
    const errors: Record<string, string> = {};
    if (!body.firstName?.trim()) errors.firstName = "First name is required";
    if (!body.lastName?.trim()) errors.lastName = "Last name is required";
    if (!body.branch?.trim()) errors.branch = "Branch is required";

    if (Object.keys(errors).length > 0) {
      throw new ValidationError("Patient validation failed", errors);
    }

    const patient = await Patient.create({
      ...body,
      firstName: body.firstName?.trim(),
      lastName: body.lastName?.trim(),
    });

    await AuditLog.create({
      action: "CREATE",
      entityType: "Patient",
      entityId: patient._id,
      entityLabel: `${patient.firstName} ${patient.lastName}`,
      newValues: { firstName: patient.firstName, lastName: patient.lastName, branch: patient.branch },
      ...auditCtx,
    });

    return NextResponse.json({ success: true, data: patient }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});