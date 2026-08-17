import { describe, expect, it } from "vitest";
import { calculateMealUnits, isCountedMealStatus } from "@/lib/core/meal-units";
import { MEAL_ENTRY_STATUS } from "@/lib/constants/enums";
import type { MealEntryInput, MealWeightSlice } from "@/lib/core/meal-units";
import type { MealEntryStatus } from "@/lib/constants/enums";

const BREAKFAST = "meal-type-breakfast";
const LUNCH = "meal-type-lunch";
const DINNER = "meal-type-dinner";

const M1 = "member-1";
const M2 = "member-2";

const defaultSlices: MealWeightSlice[] = [
  { mealTypeId: BREAKFAST, weight: 1, effectiveFrom: new Date("2026-08-01T00:00:00.000Z"), effectiveTo: null },
  { mealTypeId: LUNCH, weight: 1, effectiveFrom: new Date("2026-08-01T00:00:00.000Z"), effectiveTo: null },
  { mealTypeId: DINNER, weight: 1, effectiveFrom: new Date("2026-08-01T00:00:00.000Z"), effectiveTo: null },
];

function entry(
  memberId: string,
  mealTypeId: string,
  date: string,
  status: MealEntryStatus = MEAL_ENTRY_STATUS.CONSUMED
): MealEntryInput {
  return { organizationMemberId: memberId, mealTypeId, date: new Date(date), status };
}

describe("meal-units", () => {
  describe("isCountedMealStatus", () => {
    it("counts CONSUMED and ADJUSTED only", () => {
      expect(isCountedMealStatus(MEAL_ENTRY_STATUS.CONSUMED)).toBe(true);
      expect(isCountedMealStatus(MEAL_ENTRY_STATUS.ADJUSTED)).toBe(true);
      expect(isCountedMealStatus(MEAL_ENTRY_STATUS.NOT_CONSUMED)).toBe(false);
      expect(isCountedMealStatus(MEAL_ENTRY_STATUS.AWAY)).toBe(false);
      expect(isCountedMealStatus(MEAL_ENTRY_STATUS.CANCELLED)).toBe(false);
    });
  });

  it("counts 2 meals per day, 3 days for one member", () => {
    const result = calculateMealUnits(
      [
        entry(M1, BREAKFAST, "2026-08-01T00:00:00.000Z"),
        entry(M1, LUNCH, "2026-08-01T00:00:00.000Z"),
        entry(M1, BREAKFAST, "2026-08-02T00:00:00.000Z"),
        entry(M1, LUNCH, "2026-08-02T00:00:00.000Z"),
        entry(M1, BREAKFAST, "2026-08-03T00:00:00.000Z"),
        entry(M1, LUNCH, "2026-08-03T00:00:00.000Z"),
      ],
      defaultSlices
    );
    expect(result.totalUnits).toBe(6);
    expect(result.unitsByMember[M1]).toBe(6);
    expect(result.byMember[M1][BREAKFAST]).toEqual({ mealTypeId: BREAKFAST, count: 3, units: 3 });
    expect(result.byMember[M1][LUNCH]).toEqual({ mealTypeId: LUNCH, count: 3, units: 3 });
    expect(result.unresolved).toEqual([]);
  });

  it("counts 3 meals per day", () => {
    const result = calculateMealUnits(
      [
        entry(M1, BREAKFAST, "2026-08-01T00:00:00.000Z"),
        entry(M1, LUNCH, "2026-08-01T00:00:00.000Z"),
        entry(M1, DINNER, "2026-08-01T00:00:00.000Z"),
        entry(M1, DINNER, "2026-08-02T00:00:00.000Z"),
      ],
      defaultSlices
    );
    expect(result.totalUnits).toBe(4);
    expect(result.byMember[M1][DINNER]).toEqual({ mealTypeId: DINNER, count: 2, units: 2 });
  });

  it("uses the weight effective on the entry date across a config change", () => {
    const slices: MealWeightSlice[] = [
      { mealTypeId: BREAKFAST, weight: 1, effectiveFrom: new Date("2026-08-01T00:00:00.000Z"), effectiveTo: new Date("2026-08-10T00:00:00.000Z") },
      { mealTypeId: BREAKFAST, weight: 3, effectiveFrom: new Date("2026-08-10T00:00:00.000Z"), effectiveTo: null },
    ];
    const result = calculateMealUnits(
      [
        entry(M1, BREAKFAST, "2026-08-05T00:00:00.000Z"),
        entry(M1, BREAKFAST, "2026-08-10T00:00:00.000Z"),
        entry(M1, BREAKFAST, "2026-08-15T00:00:00.000Z"),
      ],
      slices
    );
    expect(result.totalUnits).toBe(1 + 3 + 3);
    expect(result.byMember[M1][BREAKFAST].count).toBe(3);
    expect(result.byMember[M1][BREAKFAST].units).toBe(7);
  });

  it("skips NOT_CONSUMED / AWAY / CANCELLED entries", () => {
    const result = calculateMealUnits(
      [
        entry(M1, BREAKFAST, "2026-08-01T00:00:00.000Z"),
        entry(M1, LUNCH, "2026-08-01T00:00:00.000Z", MEAL_ENTRY_STATUS.NOT_CONSUMED),
        entry(M1, DINNER, "2026-08-01T00:00:00.000Z", MEAL_ENTRY_STATUS.AWAY),
        entry(M1, DINNER, "2026-08-02T00:00:00.000Z", MEAL_ENTRY_STATUS.CANCELLED),
      ],
      defaultSlices
    );
    expect(result.totalUnits).toBe(1);
  });

  it("skips entries on cancelled meal days", () => {
    const result = calculateMealUnits(
      [
        entry(M1, BREAKFAST, "2026-08-01T00:00:00.000Z"),
        entry(M2, BREAKFAST, "2026-08-01T00:00:00.000Z"),
        entry(M1, LUNCH, "2026-08-01T00:00:00.000Z"),
      ],
      defaultSlices,
      [{ date: new Date("2026-08-01T00:00:00.000Z"), mealTypeId: BREAKFAST }]
    );
    expect(result.totalUnits).toBe(1); // only LUNCH counts
    expect(result.unitsByMember[M1]).toBe(1);
    expect(result.unitsByMember[M2]).toBeUndefined();
  });

  it("counts ADJUSTED entries as manual overrides", () => {
    const result = calculateMealUnits(
      [entry(M1, LUNCH, "2026-08-01T00:00:00.000Z", MEAL_ENTRY_STATUS.ADJUSTED)],
      defaultSlices
    );
    expect(result.totalUnits).toBe(1);
  });

  it("reports consumed entries without a config slice as unresolved", () => {
    const result = calculateMealUnits(
      [entry(M1, LUNCH, "2026-08-01T00:00:00.000Z")],
      [{ mealTypeId: BREAKFAST, weight: 1, effectiveFrom: new Date("2026-08-01T00:00:00.000Z"), effectiveTo: null }]
    );
    expect(result.totalUnits).toBe(0);
    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0]?.mealTypeId).toBe(LUNCH);
  });
});
