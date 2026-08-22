import { api, performRefresh, setAccessToken } from "./client";
import type { ApiSuccess, User, UserRole } from "../types";

export async function registerRequest(input: { name: string; email: string; password: string; role: UserRole }) {
  const res = await api.post<ApiSuccess<{ user: User; accessToken: string }>>("/auth/register", input);
  setAccessToken(res.data.data.accessToken);
  return res.data.data.user;
}

export async function loginRequest(input: { email: string; password: string }) {
  const res = await api.post<ApiSuccess<{ user: User; accessToken: string }>>("/auth/login", input);
  setAccessToken(res.data.data.accessToken);
  return res.data.data.user;
}

// Called once on app startup: exchanges the httpOnly refresh cookie (if any
// valid one exists) for a fresh access token, restoring the session without
// ever having stored the access token anywhere persistent.
export async function silentRefresh() {
  return performRefresh();
}

export async function meRequest() {
  const res = await api.get<ApiSuccess<{ user: User }>>("/auth/me");
  return res.data.data.user;
}

export async function logoutRequest() {
  await api.post("/auth/logout");
  setAccessToken(null);
}
