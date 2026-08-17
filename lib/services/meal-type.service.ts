import { connectToDatabase } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { MealTypeModel } from "@/lib/models";
import { recordAudit } from "@/lib/services/audit.service";
import type { OrgContext } from "@/lib/authorization";

function actorId(context: OrgContext): string {
  return context.member.userId.toString();
}

export interface CreateMealTypeInput {
  name: string;
  sortOrder: number;
}

export interface UpdateMealTypeInput {
  name?: string;
  sortOrder?: number;
}

export async function listMealTypes(context: OrgContext) {
  await connectToDatabase();
  return MealTypeModel.find({
    organizationId: context.organizationId,
    deletedAt: null,
  }).sort({ sortOrder: 1, name: 1 });
}

export async function createMealType(context: OrgContext, input: CreateMealTypeInput) {
  await connectToDatabase();
  const existing = await MealTypeModel.findOne({
    organizationId: context.organizationId,
    name: input.name,
    deletedAt: null,
  });
  if (existing) {
    throw new ConflictError("A meal type with this name already exists");
  }
  const mealType = await MealTypeModel.create({ organizationId: context.organizationId, ...input });

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actorId(context),
    action: "meal_type.create",
    entityType: "MealType",
    entityId: mealType._id.toString(),
    changes: { ...input },
  });

  return mealType;
}

export async function updateMealType(context: OrgContext, mealTypeId: string, input: UpdateMealTypeInput) {
  await connectToDatabase();
  const mealType = await MealTypeModel.findOne({
    _id: mealTypeId,
    organizationId: context.organizationId,
    deletedAt: null,
  });
  if (!mealType) {
    throw new NotFoundError("Meal type not found");
  }
  if (input.name !== undefined) {
    const duplicate = await MealTypeModel.findOne({
      organizationId: context.organizationId,
      name: input.name,
      _id: { $ne: mealType._id },
      deletedAt: null,
    });
    if (duplicate) {
      throw new ConflictError("A meal type with this name already exists");
    }
    mealType.name = input.name;
  }
  if (input.sortOrder !== undefined) {
    mealType.sortOrder = input.sortOrder;
  }
  await mealType.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actorId(context),
    action: "meal_type.update",
    entityType: "MealType",
    entityId: mealType._id.toString(),
    changes: { ...input },
  });

  return mealType;
}

export async function archiveMealType(context: OrgContext, mealTypeId: string) {
  await connectToDatabase();
  const mealType = await MealTypeModel.findOne({
    _id: mealTypeId,
    organizationId: context.organizationId,
    deletedAt: null,
  });
  if (!mealType) {
    throw new NotFoundError("Meal type not found");
  }
  if (mealType.status === "ARCHIVED") {
    throw new ConflictError("Meal type is already archived");
  }
  mealType.status = "ARCHIVED";
  mealType.archivedAt = new Date();
  await mealType.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actorId(context),
    action: "meal_type.archived",
    entityType: "MealType",
    entityId: mealType._id.toString(),
  });

  return mealType;
}

export async function restoreMealType(context: OrgContext, mealTypeId: string) {
  await connectToDatabase();
  const mealType = await MealTypeModel.findOne({
    _id: mealTypeId,
    organizationId: context.organizationId,
    deletedAt: null,
  });
  if (!mealType) {
    throw new NotFoundError("Meal type not found");
  }
  if (mealType.status !== "ARCHIVED") {
    throw new ConflictError("Meal type is not archived");
  }
  mealType.status = "ACTIVE";
  mealType.archivedAt = null;
  await mealType.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actorId(context),
    action: "meal_type.restored",
    entityType: "MealType",
    entityId: mealType._id.toString(),
  });

  return mealType;
}

export async function reorderMealTypes(
  context: OrgContext,
  items: Array<{ id: string; sortOrder: number }>
) {
  await connectToDatabase();
  const ids = items.map((item) => item.id);
  const mealTypes = await MealTypeModel.find({
    _id: { $in: ids },
    organizationId: context.organizationId,
    deletedAt: null,
  });
  if (mealTypes.length !== ids.length) {
    throw new NotFoundError("One or more meal types were not found");
  }
  const byId = new Map(mealTypes.map((mealType) => [mealType._id.toString(), mealType]));
  for (const item of items) {
    const mealType = byId.get(item.id);
    if (mealType) {
      mealType.sortOrder = item.sortOrder;
    }
  }
  await Promise.all(mealTypes.map((mealType) => mealType.save()));

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actorId(context),
    action: "meal_type.reordered",
    entityType: "MealType",
    changes: { items },
  });

  return mealTypes.sort((a, b) => a.sortOrder - b.sortOrder);
}
