import { Category } from "../models/Category";

export function listActiveCategories() {
  return Category.find({ isActive: true }).sort({ name: 1 });
}

export function listAllCategories() {
  return Category.find().sort({ name: 1 });
}

export function findCategoryByName(name: string) {
  return Category.findOne({ name, isActive: true });
}

export function createCategory(data: { name: string; description?: string }) {
  return Category.create(data);
}

export function setCategoryActive(id: string, isActive: boolean) {
  return Category.findByIdAndUpdate(id, { isActive }, { returnDocument: "after" });
}
