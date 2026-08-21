import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserRole } from "../models/User";

// What we encode INSIDE the token. Keep it small — just enough to identify
// who's making the request and what they're allowed to do, without another
// database lookup on every single request.
export interface JwtPayload {
  userId: string;
  role: UserRole;
}

// Access token only, no refresh token. Trade-off: after 7 days the user must
// log in again (a refresh token would let them silently get a new access
// token without re-entering a password). We're skipping refresh token
// rotation deliberately — it adds real complexity (storing refresh tokens,
// rotating/revoking them, handling theft detection) that isn't worth it for
// a 2-day demo. Flag if this project needs to survive long sessions later.
const TOKEN_EXPIRY = "7d";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
