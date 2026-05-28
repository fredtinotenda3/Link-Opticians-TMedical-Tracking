import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { connectDB } from "@/lib/mongodb";
import Branch from "@/lib/models/Branch";
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
        { branchName: new RegExp(search, "i") },
        { code: new RegExp(search, "i") },
        { city: new RegExp(search, "i") },
      ];
    }

    const branches = await Branch.find(filter).sort({ branchName: 1 }).lean();
    return NextResponse.json({ success: true, data: branches, count: branches.length });
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

    if (user.role !== "super_admin") throw new ForbiddenError("Only Super Admin can create branches");

    const body = await req.json();
    const errors: Record<string, string> = {};
    if (!body.branchName?.trim()) errors.branchName = "Branch name is required";
    if (!body.code?.trim()) errors.code = "Code is required";
    if (!body.city?.trim()) errors.city = "City is required";
    if (Object.keys(errors).length > 0) throw new ValidationError("Validation failed", errors);

    const existing = await Branch.findOne({ code: body.code.toUpperCase().trim() });
    if (existing) throw new ValidationError("Validation failed", { code: "Code already exists" });

    const branch = await Branch.create({
      ...body,
      code: body.code.toUpperCase().trim(),
      branchName: body.branchName.trim(),
    });

    await AuditLog.create({
      action: "CREATE",
      entityType: "Branch",
      entityId: branch._id,
      entityLabel: branch.branchName,
      newValues: { branchName: branch.branchName, code: branch.code, city: branch.city },
      ...auditCtx,
    });

    return NextResponse.json({ success: true, data: branch }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});