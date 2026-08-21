import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole = "CUSTOMER" | "AGENT";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["CUSTOMER", "AGENT"], required: true },
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

// Mongoose "instance method" — every User document loaded from the database
// gets this method. It compares a plain-text password (from a login form)
// against the stored hash. We never store or compare plain-text passwords.
userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.passwordHash);
};

// Never send passwordHash to the frontend, even by accident — this runs
// automatically whenever a User document is converted to JSON (e.g. in a
// res.json(user) call).
userSchema.set("toJSON", {
  transform: (_doc, ret: any) => {
    delete ret.passwordHash;
    return ret;
  },
});

export const User = model<IUser>("User", userSchema);
