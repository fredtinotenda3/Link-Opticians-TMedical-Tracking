// FILE: lib/models/Patient.ts

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPatient extends Document {
  firstName: string;
  lastName: string;
  fullName: string;
  nationalId?: string;
  dateOfBirth?: Date;
  phone?: string;
  email?: string;
  address?: string;
  medicalAid?: string;
  memberNumber?: string;
  dependentCode?: string;
  branch: string;
  status: "active" | "inactive";
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    firstName:    { type: String, required: true, trim: true },
    lastName:     { type: String, required: true, trim: true },
    nationalId:   { type: String, trim: true, sparse: true },
    dateOfBirth:  { type: Date },
    phone:        { type: String, trim: true },
    email:        { type: String, trim: true, lowercase: true },
    address:      { type: String, trim: true },
    medicalAid:   { type: String, trim: true },
    memberNumber: { type: String, trim: true },
    dependentCode:{ type: String, trim: true },
    branch:       { type: String, required: true, trim: true },
    status:       { type: String, enum: ["active", "inactive"], default: "active" },
    isDeleted:    { type: Boolean, default: false },
    deletedAt:    { type: Date },
    deletedBy:    { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: fullName
PatientSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes
PatientSchema.index({ firstName: 1, lastName: 1 });
PatientSchema.index({ nationalId: 1 }, { sparse: true });
PatientSchema.index({ memberNumber: 1 }, { sparse: true });
PatientSchema.index({ branch: 1 });
PatientSchema.index({ medicalAid: 1 });
PatientSchema.index({ isDeleted: 1 });
PatientSchema.index(
  { firstName: "text", lastName: "text", nationalId: "text", memberNumber: "text" },
  { name: "patient_text_search" }
);

const Patient: Model<IPatient> =
  mongoose.models.Patient || mongoose.model<IPatient>("Patient", PatientSchema);

export default Patient;