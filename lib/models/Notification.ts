// FILE: lib/models/Notification.ts

import mongoose, { Schema, Document, Model } from "mongoose";

export type NotificationType =
  | "overdue_claim"
  | "follow_up_due"
  | "rejection_alert"
  | "escalation"
  | "payment_received"
  | "resubmission_reminder"
  | "task_assigned"
  | "system_alert";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  claimId?: mongoose.Types.ObjectId;
  claimNumber?: string;
  taskId?: mongoose.Types.ObjectId;
  isRead: boolean;
  readAt?: Date;
  priority: "low" | "medium" | "high" | "critical";
  expiresAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: "User", required: true },
    type:         { type: String, required: true, enum: [
      "overdue_claim","follow_up_due","rejection_alert","escalation",
      "payment_received","resubmission_reminder","task_assigned","system_alert"
    ]},
    title:        { type: String, required: true },
    message:      { type: String, required: true },
    claimId:      { type: Schema.Types.ObjectId, ref: "Claim" },
    claimNumber:  { type: String },
    taskId:       { type: Schema.Types.ObjectId, ref: "Task" },
    isRead:       { type: Boolean, default: false },
    readAt:       { type: Date },
    priority:     { type: String, enum: ["low","medium","high","critical"], default: "medium" },
    expiresAt:    { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;