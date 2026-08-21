import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { signToken } from "../utils/jwt";
import { RegisterInput, LoginInput } from "../validators/authValidators";

const SALT_ROUNDS = 10; // how many times bcrypt "scrambles" the password — 10 is the standard default

export async function registerUser(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new AppError(409, "EMAIL_IN_USE", "An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
  });

  const token = signToken({ userId: user._id.toString(), role: user.role });
  return { user, token };
}

export async function loginUser(input: LoginInput) {
  const user = await User.findOne({ email: input.email });
  // Deliberately the SAME error for "no such email" and "wrong password" —
  // if we said "email not found" specifically, an attacker could use that to
  // discover which emails are registered. One generic message either way.
  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
  }

  const passwordMatches = await user.comparePassword(input.password);
  if (!passwordMatches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
  }

  const token = signToken({ userId: user._id.toString(), role: user.role });
  return { user, token };
}
