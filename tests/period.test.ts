import { describe, expect, it } from "vitest";
import {
  assertPeriodKey,
  currentPeriodKey,
  isDateInPeriod,
  isValidPeriodKey,
  periodKeyOf,
  periodKeyToRange,
  previousPeriodKey,
} from "@/lib/core/period";
import { BusinessRuleError } from "@/lib/errors";

describe("period helpers", () => {
  describe("isValidPeriodKey / assertPeriodKey", () => {
    it("accepts YYYY-MM keys", () => {
      expect(isValidPeriodKey("2026-08")).toBe(true);
      expect(isValidPeriodKey("2026-01")).toBe(true);
      expect(isValidPeriodKey("2026-12")).toBe(true);
    });

    it("rejects malformed keys", () => {
      expect(isValidPeriodKey("2026-13")).toBe(false);
      expect(isValidPeriodKey("2026-0")).toBe(false);
      expect(isValidPeriodKey("2026-1")).toBe(false);
      expect(isValidPeriodKey("2026/08")).toBe(false);
      expect(isValidPeriodKey("026-08")).toBe(false);
      expect(isValidPeriodKey("2026-08-01")).toBe(false);
      expect(isValidPeriodKey("")).toBe(false);
    });

    it("assertPeriodKey throws on invalid keys", () => {
      expect(() => assertPeriodKey("2026-13")).toThrow(BusinessRuleError);
      expect(() => assertPeriodKey("2026-08")).not.toThrow();
    });
  });

  describe("periodKeyToRange", () => {
    it("maps a calendar-month key to inclusive/exclusive bounds", () => {
      const { startDate, endDate } = periodKeyToRange("2026-08");
      expect(startDate.toISOString()).toBe("2026-08-01T00:00:00.000Z");
      expect(endDate.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    });

    it("handles year boundaries", () => {
      const { startDate, endDate } = periodKeyToRange("2026-12");
      expect(startDate.toISOString()).toBe("2026-12-01T00:00:00.000Z");
      expect(endDate.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    });

    it("respects a non-1 start day", () => {
      const { startDate, endDate } = periodKeyToRange("2026-08", 15);
      expect(startDate.toISOString()).toBe("2026-08-15T00:00:00.000Z");
      expect(endDate.toISOString()).toBe("2026-09-15T00:00:00.000Z");
    });

    it("rejects invalid start days", () => {
      expect(() => periodKeyToRange("2026-08", 0)).toThrow(BusinessRuleError);
      expect(() => periodKeyToRange("2026-08", 29)).toThrow(BusinessRuleError);
    });
  });

  describe("periodKeyOf", () => {
    it("maps dates to their calendar period", () => {
      expect(periodKeyOf(new Date("2026-08-01T00:00:00.000Z"))).toBe("2026-08");
      expect(periodKeyOf(new Date("2026-08-31T23:59:59.999Z"))).toBe("2026-08");
      expect(periodKeyOf(new Date("2026-09-01T00:00:00.000Z"))).toBe("2026-09");
    });

    it("maps dates correctly with a 15th start day", () => {
      expect(periodKeyOf(new Date("2026-08-14T23:59:59.999Z"), 15)).toBe("2026-07");
      expect(periodKeyOf(new Date("2026-08-15T00:00:00.000Z"), 15)).toBe("2026-08");
      expect(periodKeyOf(new Date("2026-09-14T23:59:59.999Z"), 15)).toBe("2026-08");
      expect(periodKeyOf(new Date("2026-09-15T00:00:00.000Z"), 15)).toBe("2026-09");
    });

    it("maps dates correctly with a 28th start day", () => {
      expect(periodKeyOf(new Date("2026-08-27T23:59:59.999Z"), 28)).toBe("2026-07");
      expect(periodKeyOf(new Date("2026-08-28T00:00:00.000Z"), 28)).toBe("2026-08");
      expect(periodKeyOf(new Date("2026-09-27T23:59:59.999Z"), 28)).toBe("2026-08");
    });

    it("maps dates near year boundaries with a late start day", () => {
      // Dec 28 2026 starts "2026-12"; Jan 15 2027 is still inside it.
      expect(periodKeyOf(new Date("2026-12-28T00:00:00.000Z"), 28)).toBe("2026-12");
      expect(periodKeyOf(new Date("2027-01-27T23:59:59.999Z"), 28)).toBe("2026-12");
      expect(periodKeyOf(new Date("2027-01-28T00:00:00.000Z"), 28)).toBe("2027-01");
    });
  });

  describe("currentPeriodKey / isDateInPeriod / previousPeriodKey", () => {
    it("currentPeriodKey uses periodKeyOf", () => {
      const now = new Date("2026-08-16T00:00:00.000Z");
      expect(currentPeriodKey(now)).toBe("2026-08");
      expect(currentPeriodKey(now, 15)).toBe("2026-08");
    });

    it("isDateInPeriod is half-open", () => {
      const range = periodKeyToRange("2026-08");
      expect(isDateInPeriod(new Date("2026-08-01T00:00:00.000Z"), range)).toBe(true);
      expect(isDateInPeriod(new Date("2026-08-31T23:59:59.999Z"), range)).toBe(true);
      expect(isDateInPeriod(new Date("2026-09-01T00:00:00.000Z"), range)).toBe(false);
      expect(isDateInPeriod(new Date("2026-07-31T00:00:00.000Z"), range)).toBe(false);
    });

    it("previousPeriodKey wraps years", () => {
      expect(previousPeriodKey("2026-08")).toBe("2026-07");
      expect(previousPeriodKey("2026-01")).toBe("2025-12");
      expect(previousPeriodKey("2025-12")).toBe("2025-11");
    });
  });
});
