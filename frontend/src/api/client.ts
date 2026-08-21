import axios from "axios";

// One shared axios instance so every API call goes through the same base
// URL and the same token-attaching logic below, instead of repeating it
// everywhere we make a request.
export const api = axios.create({
  baseURL: "http://localhost:4000/api",
});

// An axios "interceptor" runs on EVERY outgoing request before it's sent.
// Here we read the JWT we stored at login and attach it as
// "Authorization: Bearer <token>" — exactly what the backend's requireAuth
// middleware expects to find.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Storage decision: we keep the JWT in localStorage (not an httpOnly
// cookie). Trade-off, explained plainly: localStorage is simple — no cookie
// config, no CSRF protection needed, works cleanly with a separate-origin
// frontend calling the API directly. The downside is it's readable by any
// JavaScript running on the page, so if this app ever had an XSS
// vulnerability, the token could be stolen. For a 2-day demo with no
// third-party scripts, that risk is acceptable; a production app handling
// sensitive data would likely use httpOnly cookies instead.

// A small helper to pull our backend's consistent error shape out of a
// failed axios request, so pages don't each re-implement this.
export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error?.message) {
    return err.response.data.error.message as string;
  }
  return "Something went wrong. Please try again.";
}
