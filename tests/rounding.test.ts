import { describe, expect, it } from "vitest";
import { allocateByPercent, allocateByWeights, allocateEqual } from "@/lib/core/rounding";
import { BusinessRuleError } from "@/lib/errors";

describe("rounding allocations", () => {
  describe("allocateEqual", () => {
    it("splits divisible totals exactly", () => {
      expect(allocateEqual(1200, 3)).toEqual([400, 400, 400]);
    });

    it("splits indivisible totals with largest remainder (first gets the extra)", () => {
      expect(allocateEqual(10, 3)).toEqual([4, 3, 3]);
      expect(allocateEqual(1, 3)).toEqual([1, 0, 0]);
    });

    it("always preserves the total", () => {
      for (const [total, count] of [
        [1, 2],
        [5, 7],
        [999, 4],
        [100, 1],
      ] as const) {
        const parts = allocateEqual(total, count);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      }
    });

    it("rejects zero/negative counts", () => {
      expect(() => allocateEqual(10, 0)).toThrow(BusinessRuleError);
      expect(() => allocateEqual(10, -1)).toThrow(BusinessRuleError);
    });
  });

  describe("allocateByWeights", () => {
    it("allocates proportionally to weights", () => {
      expect(allocateByWeights(600, [1, 2, 3])).toEqual([100, 200, 300]);
    });

    it("distributes remainders by largest fractional part, index tie-break", () => {
      // exact: 1.666, 3.333, 5 -> floors 1,3,5 remainder 1 -> largest frac (1/3) gets it
      expect(allocateByWeights(10, [1, 2, 3])).toEqual([2, 3, 5]);
      // tie between two fractions -> earlier index wins
      expect(allocateByWeights(10, [2, 2])).toEqual([5, 5]);
    });

    it("preserves the total across many cases", () => {
      const cases: Array<[number, number[]]> = [
        [7, [3, 4, 9]],
        [100, [7, 7]],
        [13, [1, 1, 1]],
        [0, [5, 5]],
      ];
      for (const [total, weights] of cases) {
        expect(allocateByWeights(total, weights).reduce((a, b) => a + b, 0)).toBe(total);
      }
    });

    it("allocates zero totals to all zeros", () => {
      expect(allocateByWeights(0, [1, 2])).toEqual([0, 0]);
    });

    it("rejects invalid inputs", () => {
      expect(() => allocateByWeights(1.5, [1])).toThrow(BusinessRuleError);
      expect(() => allocateByWeights(-1, [1])).toThrow(BusinessRuleError);
      expect(() => allocateByWeights(10, [])).toThrow(BusinessRuleError);
      expect(() => allocateByWeights(10, [0, 0])).toThrow(BusinessRuleError);
    });
  });

  describe("allocateByPercent", () => {
    it("allocates by percentages summing to 100", () => {
      expect(allocateByPercent(1000, [50, 50])).toEqual([500, 500]);
      expect(allocateByPercent(333, [50, 50])).toEqual([167, 166]);
    });

    it("preserves the total", () => {
      expect(allocateByPercent(999, [30, 70]).reduce((a, b) => a + b, 0)).toBe(999);
    });

    it("rejects percentages not summing to 100", () => {
      expect(() => allocateByPercent(1000, [30, 60])).toThrow(BusinessRuleError);
      expect(() => allocateByPercent(1000, [100, 1])).toThrow(BusinessRuleError);
    });
  });
});
