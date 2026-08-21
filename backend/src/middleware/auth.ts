import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { UserRole } from "../models/User";

// "Middleware" — a function that runs BEFORE the route handler, like a
// security guard checking ID before you're let into a room. This one reads
// the JWT from the Authorization header, checks it's valid, and attaches
// the decoded { userId, role } to req.user so every later handler knows
// who's asking.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization; // expected format: "Bearer <token>"

  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHORIZED", "Missing or malformed Authorization header.");
  }

  const token = header.slice("Bearer ".length);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token.");
  }
}

// Role-based authorization — separate from authentication on purpose.
// requireAuth answers "who are you?", requireRole answers "are you allowed
// to do THIS?". Enforced here on the server, not just hidden in the UI,
// because a customer could otherwise call the agent-only API directly with
// a tool like curl and bypass any button we hide in the frontend.
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, "FORBIDDEN", `This action requires role: ${roles.join(" or ")}.`);
    }
    next();
  };
}
