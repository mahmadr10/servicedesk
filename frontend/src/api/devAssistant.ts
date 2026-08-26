import { api } from "./client";
import type { ApiSuccess, ApplyFixResult, DevAssistantResult } from "../types";

export async function askDevAssistantRequest(question: string) {
  const res = await api.post<ApiSuccess<DevAssistantResult>>("/admin/dev-assistant/ask", { question });
  return res.data.data;
}

export async function applyDevAssistantFixRequest(input: { targetFile: string; oldCode: string; newCode: string }) {
  const res = await api.post<ApiSuccess<ApplyFixResult>>("/admin/dev-assistant/apply-fix", input);
  return res.data.data;
}
