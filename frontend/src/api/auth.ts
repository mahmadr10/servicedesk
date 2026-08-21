import { api } from "./client";
import type { ApiSuccess, User, UserRole } from "../types";

export async function registerRequest(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) {
  const res = await api.post<ApiSuccess<{ user: User; token: string }>>("/auth/register", input);
  return res.data.data;
}

export async function loginRequest(input: { email: string; password: string }) {
  const res = await api.post<ApiSuccess<{ user: User; token: string }>>("/auth/login", input);
  return res.data.data;
}

export async function meRequest() {
  const res = await api.get<ApiSuccess<{ user: User }>>("/auth/me");
  return res.data.data.user;
}
