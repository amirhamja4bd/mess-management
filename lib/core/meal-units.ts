import { MEAL_ENTRY_STATUS } from "@/lib/constants/enums";
import type { MealEntryStatus } from "@/lib/constants/enums";

/**
 * Meal-unit calculation.
 *
 * A "meal unit" for a single meal entry is the meal type's weight that
 * was effective on the entry's date (weight history is respected). Only
 * CONSUMED and ADJUSTED (manual override) entries count; NOT_CONSUMED,
 * AWAY and CANCELLED contribute zero. If the meal day was cancelled for
 * that meal type (MealDayStatus), entries for that day are ignored.
 *
 * Weights are looked up against config slices (effectiveFrom <= date <
 * effectiveTo). If a consumed entry has no applicable config slice it is
 * skipped and reported in `unresolved` so the service can raise a clear
 * error instead of silently dropping meals.
 */

export interface MealWeightSlice {
  mealTypeId: string;
  weight: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export interface MealEntryInput {
  organizationMemberId: string;
  mealTypeId: string;
  date: Date;
  status: MealEntryStatus;
}

export interface CancelledMealDayInput {
  date: Date;
  mealTypeId: string;
}

export interface MealTypeStat {
  mealTypeId: string;
  count: number;
  units: number;
}

export interface UnresolvedMeal {
  organizationMemberId: string;
  mealTypeId: string;
  date: Date;
}

export interface MealUnitsResult {
  /** memberId -> mealTypeId -> aggregate stat. */
  byMember: Record<string, Record<string, MealTypeStat>>;
  /** memberId -> total units across all meal types. */
  unitsByMember: Record<string, number>;
  totalUnits: number;
  unresolved: UnresolvedMeal[];
}

export function isCountedMealStatus(status: MealEntryStatus): boolean {
  return status === MEAL_ENTRY_STATUS.CONSUMED || status === MEAL_ENTRY_STATUS.ADJUSTED;
}

function dayKey(date: Date): number {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
}

function sliceWeightFor(
  slices: readonly MealWeightSlice[],
  mealTypeId: string,
  date: Date
): number | null {
  const time = date.getTime();
  let best: MealWeightSlice | null = null;
  for (const slice of slices) {
    if (slice.mealTypeId !== mealTypeId) {
      continue;
    }
    if (time < slice.effectiveFrom.getTime()) {
      continue;
    }
    if (slice.effectiveTo && time >= slice.effectiveTo.getTime()) {
      continue;
    }
    if (!best || slice.effectiveFrom.getTime() > best.effectiveFrom.getTime()) {
      best = slice;
    }
  }
  return best ? best.weight : null;
}

export function calculateMealUnits(
  entries: readonly MealEntryInput[],
  slices: readonly MealWeightSlice[],
  cancelledDays: readonly CancelledMealDayInput[] = []
): MealUnitsResult {
  const cancelled = new Set(
    cancelledDays.map(({ date, mealTypeId }) => `${mealTypeId}:${dayKey(date)}`)
  );

  const byMember: Record<string, Record<string, MealTypeStat>> = {};
  const unitsByMember: Record<string, number> = {};
  const unresolved: UnresolvedMeal[] = [];
  let totalUnits = 0;

  for (const entry of entries) {
    if (!isCountedMealStatus(entry.status)) {
      continue;
    }
    if (cancelled.has(`${entry.mealTypeId}:${dayKey(entry.date)}`)) {
      continue;
    }
    const weight = sliceWeightFor(slices, entry.mealTypeId, entry.date);
    if (weight === null) {
      unresolved.push({
        organizationMemberId: entry.organizationMemberId,
        mealTypeId: entry.mealTypeId,
        date: entry.date,
      });
      continue;
    }

    byMember[entry.organizationMemberId] ??= {};
    const stat = (byMember[entry.organizationMemberId]![entry.mealTypeId] ??= {
      mealTypeId: entry.mealTypeId,
      count: 0,
      units: 0,
    });
    stat.count += 1;
    stat.units += weight;

    unitsByMember[entry.organizationMemberId] =
      (unitsByMember[entry.organizationMemberId] ?? 0) + weight;
    totalUnits += weight;
  }

  return { byMember, unitsByMember, totalUnits, unresolved };
}
