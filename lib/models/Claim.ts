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
  status: "pending" | "approved" | "rejected" | "paid";
  rejectionReason?: string;
  paidDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Add to IClaim interface
  resubmittedFrom?: mongoose.Types.ObjectId; // links to original rejected claim
  resubmissionCount?: number;                // how many times resubmitted
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
    status:          {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
    },
    rejectionReason: { type: String },
    paidDate:        { type: Date },
    notes:           { type: String },
    // Add to ClaimSchema fields
    resubmittedFrom:    { type: Schema.Types.ObjectId, ref: "Claim" },
    resubmissionCount:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Claim: Model<IClaim> =
  mongoose.models.Claim || mongoose.model<IClaim>("Claim", ClaimSchema);

export default Claim;