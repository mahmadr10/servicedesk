import { api } from "./client";
import type { ApiSuccess, DevAssistantResult } from "../types";

export async function askDevAssistantRequest(question: string) {
  const res = await api.post<ApiSuccess<DevAssistantResult>>("/admin/dev-assistant/ask", { question });
  return res.data.data;
}
