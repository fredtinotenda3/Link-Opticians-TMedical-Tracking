// FILE: lib/models/Branch.ts

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBranch extends Document {
  branchName: string;
  code: string;
  city: string;
  address?: string;
  phone?: string;
  email?: string;
  managerId?: mongoose.Types.ObjectId;
  managerName?: string;
  active: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    branchName:  { type: String, required: true, trim: true },
    code:        { type: String, required: true, trim: true, uppercase: true, unique: true },
    city:        { type: String, required: true, trim: true },
    address:     { type: String, trim: true },
    phone:       { type: String, trim: true },
    email:       { type: String, trim: true, lowercase: true },
    managerId:   { type: Schema.Types.ObjectId, ref: "User" },
    managerName: { type: String, trim: true },
    active:      { type: Boolean, default: true },
    isDeleted:   { type: Boolean, default: false },
    deletedAt:   { type: Date },
  },
  { timestamps: true }
);

BranchSchema.index({ branchName: 1 });
BranchSchema.index({ code: 1 }, { unique: true });
BranchSchema.index({ active: 1 });
BranchSchema.index({ city: 1 });

const Branch: Model<IBranch> =
  mongoose.models.Branch || mongoose.model<IBranch>("Branch", BranchSchema);

export default Branch;