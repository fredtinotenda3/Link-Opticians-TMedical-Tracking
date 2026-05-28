// FILE: lib/models/Claim.ts
// REPLACES existing lib/models/Claim.ts — fully upgraded with enterprise fields

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClaimHistoryEntry {
  changedAt: Date;
  changedBy?: mongoose.Types.ObjectId;
  changedByName?: string;
  previousStatus?: string;
  newStatus?: string;
  note?: string;
  action: string;
}

export interface IClaim extends Document {
  // Core identifiers
  claimNumber: string;
  claimReference?: string; // auto-generated CLM-YYYY-BRN-NNNNN

  // Patient info (legacy flat fields kept for backward compat; new records use patientRef)
  patientName: string;
  patientId: string;
  patientRef?: mongoose.Types.ObjectId; // references Patient model

  // Medical aid
  medicalAid: string;
  medicalAidRef?: mongoose.Types.ObjectId; // references MedicalAid model
  memberNumber: string;
  dependentCode?: string;
  authorizationNumber?: string;

  // Branch
  branch: string;
  branchRef?: mongoose.Types.ObjectId; // references Branch model

  // Dates
  serviceDate: Date;
  submissionDate: Date;
  paidDate?: Date;
  followUpDate?: Date;
  escalatedAt?: Date;
  archivedAt?: Date;

  // Financial
  amount: number;
  currency: "USD" | "ZWG";
  amountZWG?: number;
  partialAmountPaid?: number;
  partialAmountPaidZWG?: number;
  partialPaymentDate?: Date;
  invoiceNumber?: string;

  // Status & workflow
  status: "pending" | "approved" | "rejected" | "paid" | "superseded" | "partial" | "archived" | "escalated";
  priority: "normal" | "high" | "critical";
  rejectionReason?: string;
  rejectionCode?: string;
  escalationReason?: string;

  // Resubmission
  resubmittedFrom?: mongoose.Types.ObjectId;
  resubmissionCount: number;
  originalClaimId?: mongoose.Types.ObjectId;

  // Risk & validation
  riskScore?: number;
  riskFlags?: string[];
  isDuplicate?: boolean;
  duplicateOfId?: mongoose.Types.ObjectId;

  // Staff
  createdBy?: mongoose.Types.ObjectId;
  createdByName?: string;
  lastModifiedBy?: mongoose.Types.ObjectId;
  lastModifiedByName?: string;

  // Metadata
  notes?: string;
  serviceType?: string;
  diagnosisCode?: string;
  tags?: string[];
  history: IClaimHistoryEntry[];

  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  isArchived: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const ClaimHistorySchema = new Schema<IClaimHistoryEntry>(
  {
    changedAt:     { type: Date, default: Date.now },
    changedBy:     { type: Schema.Types.ObjectId, ref: "User" },
    changedByName: { type: String },
    previousStatus:{ type: String },
    newStatus:     { type: String },
    note:          { type: String },
    action:        { type: String, required: true },
  },
  { _id: false }
);

const ClaimSchema = new Schema<IClaim>(
  {
    claimNumber:       { type: String, required: true, trim: true },
    claimReference:    { type: String, trim: true, sparse: true },

    patientName:       { type: String, required: true, trim: true },
    patientId:         { type: String, required: true, trim: true },
    patientRef:        { type: Schema.Types.ObjectId, ref: "Patient" },

    medicalAid:        { type: String, required: true, trim: true },
    medicalAidRef:     { type: Schema.Types.ObjectId, ref: "MedicalAid" },
    memberNumber:      { type: String, required: true, trim: true },
    dependentCode:     { type: String, trim: true },
    authorizationNumber:{ type: String, trim: true },

    branch:            { type: String, required: true, trim: true },
    branchRef:         { type: Schema.Types.ObjectId, ref: "Branch" },

    serviceDate:       { type: Date, required: true },
    submissionDate:    { type: Date, required: true },
    paidDate:          { type: Date },
    followUpDate:      { type: Date },
    escalatedAt:       { type: Date },
    archivedAt:        { type: Date },

    amount:            { type: Number, required: true, default: 0 },
    currency:          { type: String, enum: ["USD","ZWG"], default: "USD", required: true },
    amountZWG:         { type: Number },
    partialAmountPaid:    { type: Number },
    partialAmountPaidZWG: { type: Number },
    partialPaymentDate:   { type: Date },
    invoiceNumber:        { type: String, trim: true },

    status: {
      type: String,
      enum: ["pending","approved","rejected","paid","superseded","partial","archived","escalated"],
      default: "pending",
      required: true,
    },
    priority:          { type: String, enum: ["normal","high","critical"], default: "normal" },
    rejectionReason:   { type: String },
    rejectionCode:     { type: String },
    escalationReason:  { type: String },

    resubmittedFrom:   { type: Schema.Types.ObjectId, ref: "Claim" },
    resubmissionCount: { type: Number, default: 0 },
    originalClaimId:   { type: Schema.Types.ObjectId, ref: "Claim" },

    riskScore:         { type: Number },
    riskFlags:         { type: [String], default: [] },
    isDuplicate:       { type: Boolean, default: false },
    duplicateOfId:     { type: Schema.Types.ObjectId, ref: "Claim" },

    createdBy:         { type: Schema.Types.ObjectId, ref: "User" },
    createdByName:     { type: String },
    lastModifiedBy:    { type: Schema.Types.ObjectId, ref: "User" },
    lastModifiedByName:{ type: String },

    notes:             { type: String },
    serviceType:       { type: String },
    diagnosisCode:     { type: String },
    tags:              { type: [String], default: [] },
    history:           { type: [ClaimHistorySchema], default: [] },

    isDeleted:         { type: Boolean, default: false },
    deletedAt:         { type: Date },
    deletedBy:         { type: Schema.Types.ObjectId, ref: "User" },
    isArchived:        { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals
ClaimSchema.virtual("displayAmount").get(function () {
  if (this.currency === "ZWG" && this.amountZWG) return this.amountZWG;
  return this.amount;
});

ClaimSchema.virtual("displayPartialAmountPaid").get(function () {
  if (this.currency === "ZWG" && this.partialAmountPaidZWG) return this.partialAmountPaidZWG;
  return this.partialAmountPaid;
});

ClaimSchema.virtual("effectiveBalance").get(function () {
  const amt = this.currency === "ZWG" ? (this.amountZWG || this.amount) : this.amount;
  const paid = this.currency === "ZWG"
    ? (this.partialAmountPaidZWG || 0)
    : (this.partialAmountPaid || 0);
  return amt - paid;
});

ClaimSchema.virtual("daysOutstanding").get(function () {
  const start = new Date(this.submissionDate);
  const end = this.paidDate ? new Date(this.paidDate) : new Date();
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
});

// Indexes
ClaimSchema.index({ claimNumber: 1 });
ClaimSchema.index({ patientName: 1 });
ClaimSchema.index({ patientRef: 1 });
ClaimSchema.index({ medicalAid: 1 });
ClaimSchema.index({ medicalAidRef: 1 });
ClaimSchema.index({ branch: 1 });
ClaimSchema.index({ branchRef: 1 });
ClaimSchema.index({ status: 1 });
ClaimSchema.index({ currency: 1 });
ClaimSchema.index({ submissionDate: -1 });
ClaimSchema.index({ followUpDate: 1 });
ClaimSchema.index({ priority: 1 });
ClaimSchema.index({ isDeleted: 1 });
ClaimSchema.index({ isArchived: 1 });
ClaimSchema.index({ status: 1, currency: 1 });
ClaimSchema.index({ status: 1, branch: 1 });
ClaimSchema.index({ status: 1, medicalAid: 1 });
ClaimSchema.index({ submissionDate: -1, status: 1 });
ClaimSchema.index(
  { claimNumber: "text", patientName: "text", memberNumber: "text", medicalAid: "text" },
  { name: "claim_text_search" }
);

const Claim: Model<IClaim> =
  mongoose.models.Claim || mongoose.model<IClaim>("Claim", ClaimSchema);

export default Claim;