// FILE: lib/models/MedicalAid.ts

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReimbursementRule {
  serviceType: string;
  coveragePercent: number;
  maxAmount?: number;
  requiresPreAuth: boolean;
  notes?: string;
}

export interface IMedicalAid extends Document {
  name: string;
  code: string;
  contactEmail?: string;
  contactPhone?: string;
  requiresAuthorization: boolean;
  paymentTerms: number; // days
  active: boolean;
  frameLimit?: number;
  lensLimit?: number;
  consultationLimit?: number;
  annualBenefitLimit?: number;
  currency: "USD" | "ZWG";
  reimbursementRules: IReimbursementRule[];
  averagePaymentDays?: number;
  rejectionRate?: number;
  notes?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReimbursementRuleSchema = new Schema<IReimbursementRule>(
  {
    serviceType:      { type: String, required: true },
    coveragePercent:  { type: Number, required: true, min: 0, max: 100 },
    maxAmount:        { type: Number },
    requiresPreAuth:  { type: Boolean, default: false },
    notes:            { type: String },
  },
  { _id: false }
);

const MedicalAidSchema = new Schema<IMedicalAid>(
  {
    name:                  { type: String, required: true, trim: true },
    code:                  { type: String, required: true, trim: true, uppercase: true, unique: true },
    contactEmail:          { type: String, trim: true, lowercase: true },
    contactPhone:          { type: String, trim: true },
    requiresAuthorization: { type: Boolean, default: false },
    paymentTerms:          { type: Number, default: 30 },
    active:                { type: Boolean, default: true },
    frameLimit:            { type: Number },
    lensLimit:             { type: Number },
    consultationLimit:     { type: Number },
    annualBenefitLimit:    { type: Number },
    currency:              { type: String, enum: ["USD", "ZWG"], default: "USD" },
    reimbursementRules:    { type: [ReimbursementRuleSchema], default: [] },
    averagePaymentDays:    { type: Number },
    rejectionRate:         { type: Number, min: 0, max: 100 },
    notes:                 { type: String },
    isDeleted:             { type: Boolean, default: false },
    deletedAt:             { type: Date },
  },
  { timestamps: true }
);

MedicalAidSchema.index({ name: 1 });
MedicalAidSchema.index({ code: 1 }, { unique: true });
MedicalAidSchema.index({ active: 1 });
MedicalAidSchema.index({ isDeleted: 1 });

const MedicalAid: Model<IMedicalAid> =
  mongoose.models.MedicalAid || mongoose.model<IMedicalAid>("MedicalAid", MedicalAidSchema);

export default MedicalAid;