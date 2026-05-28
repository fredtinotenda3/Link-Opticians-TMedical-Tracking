// FILE: app/api/v1/reports/route.ts
// Generates and returns report data or CSV export

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { ReportingService, ReportFilter } from "@/lib/services/reporting.service";
import AuditLog from "@/lib/models/AuditLog";
import { toApiError } from "@/lib/errors";
import { getAuditContext } from "@/lib/auth/middleware";

export const POST = withAuth(async (req, context) => {
  try {
    const { user } = context as any;

    if (!["super_admin", "finance", "auditor", "branch_manager"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Access denied", code: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const auditCtx = getAuditContext(req, user);

    const filter: ReportFilter = {
      reportType: body.reportType || "outstanding",
      currency: body.currency,
      branch: body.branch,
      medicalAid: body.medicalAid,
      status: body.status,
      dateFrom: body.dateFrom ? new Date(body.dateFrom) : undefined,
      dateTo: body.dateTo ? new Date(body.dateTo) : undefined,
    };

    // Branch managers can only see their branch
    if (user.role === "branch_manager" && user.branch) {
      filter.branch = user.branch;
    }

    const report = await ReportingService.generate(filter);

    // Log the export
    await AuditLog.create({
      action: "EXPORT",
      entityType: "Report",
      entityLabel: report.title,
      newValues: { reportType: filter.reportType, rows: report.totalRows },
      ...auditCtx,
    });

    // Return CSV or JSON
    const format = body.format || "json";

    if (format === "csv") {
      const csv = ReportingService.toCSV(report);
      const filename = `${filter.reportType}-report-${new Date().toISOString().split("T")[0]}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});