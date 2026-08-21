import { User, IUser, UserRole } from "../models/User";

// A repository's ONLY job is talking to the database for one collection —
// no business rules, no auth checks, no HTTP knowledge. Why add this layer
// on top of Mongoose (which is already a nice API)? Two reasons: (1) it's
// the seam a unit test can mock out to test a service's LOGIC without a
// real database, and (2) if we ever swapped MongoDB for something else,
// only this file would need to change — services wouldn't know the
// difference.
export function findUserByEmail(email: string) {
  return User.findOne({ email });
}

export function findUserById(id: string) {
  return User.findById(id);
}

export function createUser(data: { name: string; email: string; passwordHash: string; role: UserRole }) {
  return User.create(data);
}

export function findUsers(filter: { role?: UserRole }, skip: number, limit: number) {
  return User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
}

export function countUsers(filter: { role?: UserRole }) {
  return User.countDocuments(filter);
}

export function updateUser(id: string, updates: Partial<Pick<IUser, "role" | "isActive" | "name">>) {
  return User.findByIdAndUpdate(id, updates, { returnDocument: "after" });
}
