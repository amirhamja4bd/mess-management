import { describe, expect, it } from "vitest";
import { distributeExpense } from "@/lib/core/distribution";
import { DISTRIBUTION_METHOD } from "@/lib/constants/enums";
import { BusinessRuleError } from "@/lib/errors";

const M1 = "member-1";
const M2 = "member-2";
const M3 = "member-3";

describe("distributeExpense", () => {
  it("rejects non-integer or non-positive amounts", () => {
    expect(() =>
      distributeExpense({ method: DISTRIBUTION_METHOD.EQUAL, amount: 10.5, participants: [], memberIds: [M1] })
    ).toThrow(BusinessRuleError);
    expect(() =>
      distributeExpense({ method: DISTRIBUTION_METHOD.EQUAL, amount: 0, participants: [], memberIds: [M1] })
    ).toThrow(BusinessRuleError);
  });

  describe("EQUAL", () => {
    it("splits across all active members on the date", () => {
      const result = distributeExpense({
        method: DISTRIBUTION_METHOD.EQUAL,
        amount: 1000,
        participants: [],
        memberIds: [M1, M2, M3],
      });
      expect(result.total).toBe(1000);
      expect(result.allocations).toEqual([
        { organizationMemberId: M1, amount: 334 },
        { organizationMemberId: M2, amount: 333 },
        { organizationMemberId: M3, amount: 333 },
      ]);
    });

    it("requires at least one active member", () => {
      expect(() =>
        distributeExpense({ method: DISTRIBUTION_METHOD.EQUAL, amount: 100, participants: [], memberIds: [] })
      ).toThrow(BusinessRuleError);
    });
  });

  describe("MEAL_BASED", () => {
    it("allocates proportionally to meal units", () => {
      const result = distributeExpense({
        method: DISTRIBUTION_METHOD.MEAL_BASED,
        amount: 1200,
        participants: [],
        memberIds: [M1, M2],
        mealUnitsByMember: { [M1]: 2, [M2]: 1 },
      });
      expect(result.total).toBe(1200);
      expect(result.allocations).toEqual([
        { organizationMemberId: M1, amount: 800 },
        { organizationMemberId: M2, amount: 400 },
      ]);
    });

    it("treats missing units as zero and rejects a zero total", () => {
      expect(() =>
        distributeExpense({
          method: DISTRIBUTION_METHOD.MEAL_BASED,
          amount: 100,
          participants: [],
          memberIds: [M1, M2],
        })
      ).toThrow(BusinessRuleError);
    });
  });

  describe("SELECTED_MEMBERS", () => {
    it("splits equally across the selected members", () => {
      const result = distributeExpense({
        method: DISTRIBUTION_METHOD.SELECTED_MEMBERS,
        amount: 999,
        participants: [{ organizationMemberId: M1 }, { organizationMemberId: M2 }, { organizationMemberId: M3 }],
      });
      expect(result.allocations).toEqual([
        { organizationMemberId: M1, amount: 333 },
        { organizationMemberId: M2, amount: 333 },
        { organizationMemberId: M3, amount: 333 },
      ]);
    });

    it("requires at least two participants", () => {
      expect(() =>
        distributeExpense({
          method: DISTRIBUTION_METHOD.SELECTED_MEMBERS,
          amount: 100,
          participants: [{ organizationMemberId: M1 }],
        })
      ).toThrow(BusinessRuleError);
    });
  });

  describe("PERCENTAGE", () => {
    it("allocates by percentages", () => {
      const result = distributeExpense({
        method: DISTRIBUTION_METHOD.PERCENTAGE,
        amount: 1000,
        participants: [
          { organizationMemberId: M1, percent: 70 },
          { organizationMemberId: M2, percent: 30 },
        ],
      });
      expect(result.total).toBe(1000);
      expect(result.allocations).toEqual([
        { organizationMemberId: M1, amount: 700 },
        { organizationMemberId: M2, amount: 300 },
      ]);
    });

    it("rejects percentages that do not sum to 100", () => {
      expect(() =>
        distributeExpense({
          method: DISTRIBUTION_METHOD.PERCENTAGE,
          amount: 100,
          participants: [
            { organizationMemberId: M1, percent: 60 },
            { organizationMemberId: M2, percent: 30 },
          ],
        })
      ).toThrow(BusinessRuleError);
    });
  });

  describe("FIXED_AMOUNT", () => {
    it("uses explicit per-member amounts", () => {
      const result = distributeExpense({
        method: DISTRIBUTION_METHOD.FIXED_AMOUNT,
        amount: 500,
        participants: [
          { organizationMemberId: M1, amount: 200 },
          { organizationMemberId: M2, amount: 300 },
        ],
      });
      expect(result.allocations).toEqual([
        { organizationMemberId: M1, amount: 200 },
        { organizationMemberId: M2, amount: 300 },
      ]);
    });

    it("rejects amounts that do not sum to the expense total", () => {
      expect(() =>
        distributeExpense({
          method: DISTRIBUTION_METHOD.FIXED_AMOUNT,
          amount: 500,
          participants: [
            { organizationMemberId: M1, amount: 200 },
            { organizationMemberId: M2, amount: 200 },
          ],
        })
      ).toThrow(BusinessRuleError);
    });
  });

  describe("INDIVIDUAL", () => {
    it("assigns the full amount to the single participant", () => {
      const result = distributeExpense({
        method: DISTRIBUTION_METHOD.INDIVIDUAL,
        amount: 750,
        participants: [{ organizationMemberId: M1, amount: 750 }],
      });
      expect(result.allocations).toEqual([{ organizationMemberId: M1, amount: 750 }]);
    });

    it("requires at least one participant", () => {
      expect(() =>
        distributeExpense({ method: DISTRIBUTION_METHOD.INDIVIDUAL, amount: 100, participants: [] })
      ).toThrow(BusinessRuleError);
    });
  });
});
