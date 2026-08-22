import { api } from "./client";
import type { ApiSuccess, Category } from "../types";

export async function listActiveCategoriesRequest() {
  const res = await api.get<ApiSuccess<{ categories: Category[] }>>("/categories");
  return res.data.data.categories;
}
