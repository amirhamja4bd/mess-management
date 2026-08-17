import { connectToDatabase } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { ExpenseCategoryModel } from "@/lib/models";
import type { OrgContext } from "@/lib/authorization";

export interface CreateCategoryInput {
  name: string;
  isFood: boolean;
  color?: string;
  icon?: string;
  sortOrder: number;
}

export interface UpdateCategoryInput {
  name?: string;
  isFood?: boolean;
  color?: string | null;
  icon?: string | null;
  sortOrder?: number;
}

export async function listCategories(context: OrgContext) {
  await connectToDatabase();
  return ExpenseCategoryModel.find({
    organizationId: context.organizationId,
    deletedAt: null,
  }).sort({ sortOrder: 1, name: 1 });
}

export async function createCategory(context: OrgContext, input: CreateCategoryInput) {
  await connectToDatabase();
  const existing = await ExpenseCategoryModel.findOne({
    organizationId: context.organizationId,
    name: input.name,
    deletedAt: null,
  });
  if (existing) {
    throw new ConflictError("A category with this name already exists");
  }
  return ExpenseCategoryModel.create({ organizationId: context.organizationId, ...input });
}

export async function updateCategory(context: OrgContext, categoryId: string, input: UpdateCategoryInput) {
  await connectToDatabase();
  const category = await ExpenseCategoryModel.findOne({
    _id: categoryId,
    organizationId: context.organizationId,
    deletedAt: null,
  });
  if (!category) {
    throw new NotFoundError("Category not found");
  }
  if (input.name !== undefined) {
    const duplicate = await ExpenseCategoryModel.findOne({
      organizationId: context.organizationId,
      name: input.name,
      _id: { $ne: category._id },
      deletedAt: null,
    });
    if (duplicate) {
      throw new ConflictError("A category with this name already exists");
    }
    category.name = input.name;
  }
  if (input.isFood !== undefined) {
    category.isFood = input.isFood;
  }
  if (input.color !== undefined) {
    category.color = input.color ?? undefined;
  }
  if (input.icon !== undefined) {
    category.icon = input.icon ?? undefined;
  }
  if (input.sortOrder !== undefined) {
    category.sortOrder = input.sortOrder;
  }
  await category.save();
  return category;
}

export async function archiveCategory(context: OrgContext, categoryId: string) {
  await connectToDatabase();
  const category = await ExpenseCategoryModel.findOne({
    _id: categoryId,
    organizationId: context.organizationId,
    deletedAt: null,
  });
  if (!category) {
    throw new NotFoundError("Category not found");
  }
  if (category.status === "ARCHIVED") {
    throw new ConflictError("Category is already archived");
  }
  category.status = "ARCHIVED";
  category.archivedAt = new Date();
  await category.save();
  return category;
}

export async function restoreCategory(context: OrgContext, categoryId: string) {
  await connectToDatabase();
  const category = await ExpenseCategoryModel.findOne({
    _id: categoryId,
    organizationId: context.organizationId,
    deletedAt: null,
  });
  if (!category) {
    throw new NotFoundError("Category not found");
  }
  if (category.status !== "ARCHIVED") {
    throw new ConflictError("Category is not archived");
  }
  category.status = "ACTIVE";
  category.archivedAt = null;
  await category.save();
  return category;
}

export async function reorderCategories(
  context: OrgContext,
  items: Array<{ id: string; sortOrder: number }>
) {
  await connectToDatabase();
  const ids = items.map((item) => item.id);
  const categories = await ExpenseCategoryModel.find({
    _id: { $in: ids },
    organizationId: context.organizationId,
    deletedAt: null,
  });
  if (categories.length !== ids.length) {
    throw new NotFoundError("One or more categories were not found");
  }
  const byId = new Map(categories.map((category) => [category._id.toString(), category]));
  for (const item of items) {
    const category = byId.get(item.id);
    if (category) {
      category.sortOrder = item.sortOrder;
    }
  }
  await Promise.all(categories.map((category) => category.save()));
  return categories.sort((a, b) => a.sortOrder - b.sortOrder);
}
