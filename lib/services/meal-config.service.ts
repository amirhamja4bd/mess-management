import { DEFAULT_MEAL_WEIGHT_TOTAL } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { BusinessRuleError, ConflictError, NotFoundError } from "@/lib/errors";
import { MealConfigModel, MealTypeModel } from "@/lib/models";
import { recordAudit } from "@/lib/services/audit.service";
import type { OrgContext } from "@/lib/authorization";

export interface SetMealConfigItem {
  mealTypeId: string;
  weight: number;
}

export interface SetMealConfigInput {
  effectiveFrom: Date;
  items: SetMealConfigItem[];
}

export async function getCurrentConfig(context: OrgContext) {
  await connectToDatabase();
  return MealConfigModel.find({
    organizationId: context.organizationId,
    isCurrent: true,
  })
    .populate("mealTypeId")
    .sort({ mealTypeId: 1 });
}

export async function getConfigHistory(context: OrgContext) {
  await connectToDatabase();
  return MealConfigModel.find({ organizationId: context.organizationId })
    .populate("mealTypeId")
    .sort({ effectiveFrom: -1 });
}

/**
 * Replace the whole active meal-weight set from `effectiveFrom`.
 * Historical-safe: previously active slices are closed (effectiveTo set)
 * and new slices are created; the (organizationId, mealTypeId,
 * effectiveFrom) unique index guarantees no double replacement.
 */
export async function setMealWeights(context: OrgContext, input: SetMealConfigInput) {
  await connectToDatabase();

  const total = input.items.reduce((sum, item) => sum + item.weight, 0);
  if (total !== DEFAULT_MEAL_WEIGHT_TOTAL) {
    throw new BusinessRuleError(
      `meal weights must total ${DEFAULT_MEAL_WEIGHT_TOTAL}; got ${total}`
    );
  }

  const mealTypes = await MealTypeModel.find({
    organizationId: context.organizationId,
    _id: { $in: input.items.map((item) => item.mealTypeId) },
    deletedAt: null,
    status: "ACTIVE",
  });
  if (mealTypes.length !== new Set(input.items.map((item) => item.mealTypeId)).size) {
    throw new NotFoundError("One or more meal types were not found or are not active");
  }

  const existingStart = await MealConfigModel.findOne({
    organizationId: context.organizationId,
    effectiveFrom: input.effectiveFrom,
  });
  if (existingStart) {
    throw new ConflictError("A meal configuration already starts on this date");
  }

  // Close all currently-active slices at the new effective date.
  await MealConfigModel.updateMany(
    {
      organizationId: context.organizationId,
      isCurrent: true,
      $or: [{ effectiveTo: null }, { effectiveTo: { $gt: input.effectiveFrom } }],
    },
    { $set: { effectiveTo: input.effectiveFrom, isCurrent: false } }
  );

  const configs = await MealConfigModel.insertMany(
    input.items.map((item) => ({
      organizationId: context.organizationId,
      mealTypeId: item.mealTypeId,
      weight: item.weight,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: null,
      isCurrent: true,
    }))
  );

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: context.member.userId.toString(),
    action: "meal_config.changed",
    entityType: "MealConfig",
    changes: {
      effectiveFrom: input.effectiveFrom.toISOString(),
      items: input.items.map((item) => ({ mealTypeId: item.mealTypeId, weight: item.weight })),
    },
    metadata: { configIds: configs.map((config) => config._id.toString()) },
  });

  return configs;
}
