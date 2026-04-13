// FILE: lib/models/Claim.ts

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClaim extends Document {
  claimNumber: string;
  patientName: string;
  patientId: string;
  medicalAid: string;
  memberNumber: string;
  branch: string;
  serviceDate: Date;
  submissionDate: Date;
  amount: number;
  currency: "USD" | "ZWG";
  amountZWG?: number;
  status: "pending" | "approved" | "rejected" | "paid" | "superseded" | "partial";
  rejectionReason?: string;
  paidDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  resubmittedFrom?: mongoose.Types.ObjectId; 
  resubmissionCount?: number; 
  partialAmountPaid?: number;
  partialAmountPaidZWG?: number;
  followUpDate?: Date;               
}

const ClaimSchema = new Schema<IClaim>(
  {
    claimNumber:     { type: String, required: true },
    patientName:     { type: String, required: true },
    patientId:       { type: String, required: true },
    medicalAid:      { type: String, required: true },
    memberNumber:    { type: String, required: true },
    branch:          { type: String, required: true },
    serviceDate:     { type: Date,   required: true },
    submissionDate:  { type: Date,   required: true },
    amount:          { type: Number, required: true },
    currency:        { type: String, enum: ["USD", "ZWG"], default: "USD", required: true },
    amountZWG:       { type: Number },
    partialAmountPaid: { type: Number },
    partialAmountPaidZWG: { type: Number },
    followUpDate:      { type: Date },
    status:          {
      type: String,
      enum: ["pending", "approved", "rejected", "paid", "superseded", "partial"],
      default: "pending",
    },
    rejectionReason: { type: String },
    paidDate:        { type: Date },
    notes:           { type: String },
    resubmittedFrom:    { type: Schema.Types.ObjectId, ref: "Claim" },
    resubmissionCount:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Add a virtual field to get the display amount based on currency
ClaimSchema.virtual('displayAmount').get(function() {
  if (this.currency === 'ZWG' && this.amountZWG) {
    return this.amountZWG;
  }
  return this.amount;
});

const Claim: Model<IClaim> =
  mongoose.models.Claim || mongoose.model<IClaim>("Claim", ClaimSchema);

export default Claim;