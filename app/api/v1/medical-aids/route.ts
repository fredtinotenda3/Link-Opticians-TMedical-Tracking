import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { connectDB } from "@/lib/mongodb";
import MedicalAid from "@/lib/models/MedicalAid";
import AuditLog from "@/lib/models/AuditLog";
import { toApiError, ValidationError, ForbiddenError } from "@/lib/errors";
import { getAuditContext } from "@/lib/auth/middleware";

export const GET = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const filter: any = { isDeleted: false };
    const active = searchParams.get("active");
    if (active !== null) filter.active = active === "true";
    const search = searchParams.get("search");
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { code: new RegExp(search, "i") },
      ];
    }

    const aids = await MedicalAid.find(filter).sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: aids, count: aids.length });
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

    if (!["super_admin", "finance"].includes(user.role)) {
      throw new ForbiddenError("Only Super Admin or Finance can create medical aids");
    }

    const body = await req.json();
    const errors: Record<string, string> = {};
    if (!body.name?.trim()) errors.name = "Name is required";
    if (!body.code?.trim()) errors.code = "Code is required";
    if (Object.keys(errors).length > 0) throw new ValidationError("Validation failed", errors);

    const existing = await MedicalAid.findOne({ code: body.code.toUpperCase().trim() });
    if (existing) throw new ValidationError("Validation failed", { code: "Code already exists" });

    const aid = await MedicalAid.create({
      ...body,
      code: body.code.toUpperCase().trim(),
      name: body.name.trim(),
    });

    await AuditLog.create({
      action: "CREATE",
      entityType: "MedicalAid",
      entityId: aid._id,
      entityLabel: aid.name,
      newValues: { name: aid.name, code: aid.code },
      ...auditCtx,
    });

    return NextResponse.json({ success: true, data: aid }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});