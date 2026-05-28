// FILE: lib/models/ClaimComment.ts

import mongoose, { Schema, Document, Model } from "mongoose";

export type CommentVisibility = "public" | "finance" | "internal_audit";

export interface IClaimComment extends Document {
  claimId: mongoose.Types.ObjectId;
  authorId?: mongoose.Types.ObjectId;
  authorName: string;
  authorRole?: string;
  message: string;
  visibility: CommentVisibility;
  isPinned: boolean;
  attachments?: Array<{ filename: string; url: string; size: number; mimeType: string }>;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ClaimCommentSchema = new Schema<IClaimComment>(
  {
    claimId:    { type: Schema.Types.ObjectId, ref: "Claim", required: true },
    authorId:   { type: Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, required: true },
    authorRole: { type: String },
    message:    { type: String, required: true, trim: true },
    visibility: { type: String, enum: ["public","finance","internal_audit"], default: "public" },
    isPinned:   { type: Boolean, default: false },
    attachments:{ type: [{
      filename: String,
      url: String,
      size: Number,
      mimeType: String,
    }], default: [] },
    isDeleted:  { type: Boolean, default: false },
    deletedAt:  { type: Date },
    deletedBy:  { type: Schema.Types.ObjectId, ref: "User" },
    editedAt:   { type: Date },
  },
  { timestamps: true }
);

ClaimCommentSchema.index({ claimId: 1, createdAt: -1 });
ClaimCommentSchema.index({ authorId: 1 });
ClaimCommentSchema.index({ isDeleted: 1 });

const ClaimComment: Model<IClaimComment> =
  mongoose.models.ClaimComment || mongoose.model<IClaimComment>("ClaimComment", ClaimCommentSchema);

export default ClaimComment;