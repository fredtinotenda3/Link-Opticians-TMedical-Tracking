// FILE: lib/models/AuditLog.ts

import mongoose, { Schema, Document, Model } from "mongoose";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "STATUS_CHANGE"
  | "RESUBMISSION"
  | "PAYMENT"
  | "PARTIAL_PAYMENT"
  | "REJECTION"
  | "ESCALATION"
  | "FOLLOW_UP_SET"
  | "ARCHIVE"
  | "RESTORE"
  | "PASSWORD_CHANGE"
  | "BULK_ACTION";

export type AuditEntityType =
  | "Claim"
  | "Patient"
  | "MedicalAid"
  | "Branch"
  | "User"
  | "Task"
  | "Report"
  | "System";

export interface IAuditLog extends Document {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: mongoose.Types.ObjectId | string;
  entityLabel?: string;
  userId?: mongoose.Types.ObjectId;
  userEmail?: string;
  userRole?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedFields?: string[];
  metadata?: Record<string, any>;
  description?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action:         { type: String, required: true, enum: [
      "CREATE","UPDATE","DELETE","LOGIN","LOGOUT","EXPORT",
      "STATUS_CHANGE","RESUBMISSION","PAYMENT","PARTIAL_PAYMENT",
      "REJECTION","ESCALATION","FOLLOW_UP_SET","ARCHIVE","RESTORE",
      "PASSWORD_CHANGE","BULK_ACTION"
    ]},
    entityType:     { type: String, required: true, enum: [
      "Claim","Patient","MedicalAid","Branch","User","Task","Report","System"
    ]},
    entityId:       { type: Schema.Types.Mixed },
    entityLabel:    { type: String },
    userId:         { type: Schema.Types.ObjectId, ref: "User" },
    userEmail:      { type: String },
    userRole:       { type: String },
    userName:       { type: String },
    ipAddress:      { type: String },
    userAgent:      { type: String },
    previousValues: { type: Schema.Types.Mixed },
    newValues:      { type: Schema.Types.Mixed },
    changedFields:  { type: [String] },
    metadata:       { type: Schema.Types.Mixed },
    description:    { type: String },
    success:        { type: Boolean, default: true },
    errorMessage:   { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userEmail: 1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;