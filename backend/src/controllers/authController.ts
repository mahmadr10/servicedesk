import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/authService";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";

// Controllers are deliberately "thin" — they don't contain business logic
// (that lives in services). A controller's only job: read the request, call
// the right service, shape the HTTP response. This separation (routes →
// controllers → services → models) means the state machine rules, auth
// rules, etc. all live in ONE place each, testable without spinning up HTTP.
export async function register(req: Request, res: Response) {
  const { user, token } = await registerUser(req.body);
  res.status(201).json({ success: true, data: { user, token } });
}

export async function login(req: Request, res: Response) {
  const { user, token } = await loginUser(req.body);
  res.status(200).json({ success: true, data: { user, token } });
}

// Lets the frontend ask "who am I?" on page load to restore a session from
// a stored token, without re-sending a password.
export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user!.userId);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found.");
  }
  res.status(200).json({ success: true, data: { user } });
}
