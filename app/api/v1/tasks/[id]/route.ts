// FILE: app/api/v1/tasks/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { connectDB } from "@/lib/mongodb";
import Task from "@/lib/models/Task";
import AuditLog from "@/lib/models/AuditLog";
import { toApiError, NotFoundError } from "@/lib/errors";
import { getAuditContext } from "@/lib/auth/middleware";
import mongoose from "mongoose";

// PATCH /api/v1/tasks/[id]
export const PATCH = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { user } = context as any;
    const { id } = await (context.params as any);
    const body = await req.json();
    const auditCtx = getAuditContext(req, user);

    const update: any = { ...body };

    // Mark completion
    if (body.status === "completed" && !body.completedAt) {
      update.completedAt = new Date();
      update.completedBy = new mongoose.Types.ObjectId(user.userId);
    }

    const task = await Task.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: update },
      { new: true }
    );

    if (!task) throw new NotFoundError("Task");

    await AuditLog.create({
      action: "UPDATE",
      entityType: "Task",
      entityId: id,
      entityLabel: task.title,
      newValues: update,
      ...auditCtx,
    });

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});

// DELETE /api/v1/tasks/[id]
export const DELETE = withAuth(async (req, context) => {
  try {
    await connectDB();
    const { id } = await (context.params as any);
    const { user } = context as any;

    if (!["super_admin", "finance"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    await Task.findByIdAndUpdate(id, { isDeleted: true });
    return NextResponse.json({ success: true, message: "Task deleted" });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
});