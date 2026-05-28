// FILE: app/api/v1/claims/route.ts
// Enterprise claims API with auth, validation, pagination, search

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { ClaimService } from "@/lib/services/claim.service";
import { ClaimRepository } from "@/lib/repositories/claim.repository";
import { toApiError } from "@/lib/errors";
import { getAuditContext } from "@/lib/auth/middleware";

// GET /api/v1/claims
export const GET = withAuth(async (req, { user }) => {
  try {
    const { searchParams } = new URL(req.url);

    const filters: any = {
      isDeleted: false,
    };

    const status = searchParams.get("status");
    if (status && status !== "all") filters.status = status;

    const medicalAid = searchParams.get("medicalAid");
    if (medicalAid && medicalAid !== "all") filters.medicalAid = medicalAid;

    const branch = searchParams.get("branch");
    if (branch && branch !== "all") {
      // Branch managers can only see their own branch
      if (user.role === "branch_manager" && branch !== user.branch) {
        return NextResponse.json({ success: false, error: "Access denied to this branch", code: "FORBIDDEN" }, { status: 403 });
      }
      filters.branch = branch;
    } else if (user.role === "branch_manager" && user.branch) {
      // Branch managers always filtered to their branch
      filters.branch = user.branch;
    }

    const currency = searchParams.get("currency");
    if (currency) filters.currency = currency;

    const search = searchParams.get("search");
    if (search) filters.search = search;

    const priority = searchParams.get("priority");
    if (priority) filters.priority = priority;

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const sortBy = searchParams.get("sortBy") || "submissionDate";
    const sortDir = (searchParams.get("sortDir") || "desc") as "asc" | "desc";

    const paginate = searchParams.get("paginate") === "true";

    if (paginate) {
      const result = await ClaimRepository.findAll(filters, { page, limit, sortBy, sortDir });
      const paged = result as any;
      return NextResponse.json({
        success: true,
        data: paged.data.map(ClaimService.normalizeAmounts),
        pagination: {
          total: paged.total,
          page: paged.page,
          limit: paged.limit,
          totalPages: paged.totalPages,
          hasNext: paged.hasNext,
          hasPrev: paged.hasPrev,
        },
      });
    }

    const claims = await ClaimService.getClaims(filters);

    return NextResponse.json({
      success: true,
      data: claims.map(ClaimService.normalizeAmounts),
      count: claims.length,
    });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

// POST /api/v1/claims
export const POST = withAuth(async (req, { user }) => {
  try {
    // Check permission
    if (!["super_admin", "finance", "receptionist", "branch_manager"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "You do not have permission to create claims", code: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const auditCtx = getAuditContext(req, user);

    const claim = await ClaimService.create(
      {
        ...body,
        createdBy: user.userId,
        createdByName: `${user.firstName} ${user.lastName}`,
      },
      auditCtx
    );

    return NextResponse.json(
      { success: true, data: ClaimService.normalizeAmounts(claim) },
      { status: 201 }
    );
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});