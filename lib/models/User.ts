// FILE: lib/models/User.ts - 

import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole =
  | "super_admin"
  | "finance"
  | "receptionist"
  | "branch_manager"
  | "auditor";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  branch?: string;
  branchId?: mongoose.Types.ObjectId;
  active: boolean;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  mustChangePassword: boolean;
  passwordChangedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  fullName: string;
}

const UserSchema = new Schema<IUser>(
  {
    firstName:            { type: String, required: true, trim: true },
    lastName:             { type: String, required: true, trim: true },
    email:                { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:             { type: String, required: true, select: false },
    role:                 {
      type: String,
      enum: ["super_admin", "finance", "receptionist", "branch_manager", "auditor"],
      required: true,
      default: "receptionist",
    },
    branch:               { type: String, trim: true },
    branchId:             { type: Schema.Types.ObjectId, ref: "Branch" },
    active:               { type: Boolean, default: true },
    lastLoginAt:          { type: Date },
    lastLoginIp:          { type: String },
    failedLoginAttempts:  { type: Number, default: 0 },
    lockedUntil:          { type: Date },
    mustChangePassword:   { type: Boolean, default: false },
    passwordChangedAt:    { type: Date },
    isDeleted:            { type: Boolean, default: false },
    deletedAt:            { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

UserSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// FIXED: Hash password before save - use async function without next parameter
UserSchema.pre("save", async function() {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date();
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ branch: 1 });
UserSchema.index({ active: 1 });
UserSchema.index({ isDeleted: 1 });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;