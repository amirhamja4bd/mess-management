import { MEAL_DAY_STATUS } from "@/lib/constants/enums";
import { connectToDatabase } from "@/lib/db";
import { MealConfigModel, MealDayStatusModel, MealEntryModel } from "@/lib/models";
import { calculateMealUnits } from "@/lib/core/meal-units";
import type { MealUnitsResult } from "@/lib/core/meal-units";

/**
 * Loads meal entries, effective config slices and cancelled days for a
 * date range and computes meal units. Used by the expense distribution
 * preview and by the monthly calculation engine.
 */
export interface LoadedMealUnits {
  result: MealUnitsResult;
  slices: Array<{ mealTypeId: string; weight: number; effectiveFrom: Date; effectiveTo: Date | null }>;
}

export async function loadMealUnitsForRange(
  organizationId: string,
  start: Date,
  end: Date
): Promise<LoadedMealUnits> {
  await connectToDatabase();

  const [entries, slices, dayStatuses] = await Promise.all([
    MealEntryModel.find({
      organizationId,
      date: { $gte: start, $lt: end },
    }).lean(),
    MealConfigModel.find({ organizationId }).lean(),
    MealDayStatusModel.find({
      organizationId,
      date: { $gte: start, $lt: end },
      status: { $in: [MEAL_DAY_STATUS.CANCELLED, MEAL_DAY_STATUS.UNAVAILABLE] },
    }).lean(),
  ]);

  const normalizedSlices = slices.map((slice) => ({
    mealTypeId: slice.mealTypeId.toString(),
    weight: slice.weight,
    effectiveFrom: slice.effectiveFrom,
    effectiveTo: slice.effectiveTo ?? null,
  }));

  const result = calculateMealUnits(
    entries.map((entry) => ({
      organizationMemberId: entry.organizationMemberId.toString(),
      mealTypeId: entry.mealTypeId.toString(),
      date: entry.date,
      status: entry.status,
    })),
    normalizedSlices,
    dayStatuses.map((day) => ({
      date: day.date,
      mealTypeId: day.mealTypeId.toString(),
    }))
  );

  return { result, slices: normalizedSlices };
}
