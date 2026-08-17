import { BusinessRuleError } from "@/lib/errors";

/**
 * Accounting-period helpers.
 *
 * A period is identified by a "YYYY-MM" key. The organization setting
 * `accountingPeriodStartDay` (1-28) determines when a period starts:
 *   - startDay = 1  => calendar month
 *   - startDay = 15 => period runs 15th of month M to 14th of month M+1,
 *     keyed by the month in which it starts.
 *
 * Dates are normalized to UTC day boundaries. Timezone-aware day
 * boundaries are a documented limitation (see docs/backend.md).
 */

export interface PeriodRange {
  /** Inclusive start of the period. */
  startDate: Date;
  /** Exclusive end of the period. */
  endDate: Date;
}

const PERIOD_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidPeriodKey(periodKey: string): boolean {
  return PERIOD_KEY_RE.test(periodKey);
}

export function assertPeriodKey(periodKey: string): void {
  if (!PERIOD_KEY_RE.test(periodKey)) {
    throw new BusinessRuleError("period must be in YYYY-MM format");
  }
}

function startOfPeriodForKey(periodKey: string, startDay: number): Date {
  const [year, month] = periodKey.split("-").map(Number);
  // month is 1-based; Date.UTC months are 0-based.
  return new Date(Date.UTC(year, month - 1, startDay, 0, 0, 0, 0));
}

/** Start (inclusive) and end (exclusive) dates for a period key. */
export function periodKeyToRange(periodKey: string, startDay = 1): PeriodRange {
  assertPeriodKey(periodKey);
  if (startDay < 1 || startDay > 28) {
    throw new BusinessRuleError("accountingPeriodStartDay must be between 1 and 28");
  }
  const startDate = startOfPeriodForKey(periodKey, startDay);
  // Next month start: add one month index.
  const [year, month] = periodKey.split("-").map(Number);
  const endDate = new Date(Date.UTC(year, month, startDay, 0, 0, 0, 0));
  return { startDate, endDate };
}

function calendarKeyOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(periodKey: string, offset: number): string {
  const [year, month] = periodKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Resolve which period a date falls into, given the organization's start
 * day. A date always belongs to exactly one period key.
 */
export function periodKeyOf(date: Date, startDay = 1): string {
  const calendarKey = calendarKeyOf(date);
  for (const candidate of [calendarKey, shiftMonth(calendarKey, -1)]) {
    const { startDate, endDate } = periodKeyToRange(candidate, startDay);
    if (date.getTime() >= startDate.getTime() && date.getTime() < endDate.getTime()) {
      return candidate;
    }
  }
  // Shift +1 as well covers the boundary case of a start day > 1 where the
  // current calendar month is still inside the previous month's period.
  const next = periodKeyToRange(shiftMonth(calendarKey, 1), startDay);
  if (date.getTime() >= next.startDate.getTime() && date.getTime() < next.endDate.getTime()) {
    return shiftMonth(calendarKey, 1);
  }
  throw new BusinessRuleError(`unable to resolve period for date ${date.toISOString()}`);
}

/** The current (ongoing) period key. */
export function currentPeriodKey(now = new Date(), startDay = 1): string {
  return periodKeyOf(now, startDay);
}

export function isDateInPeriod(date: Date, range: PeriodRange): boolean {
  return date.getTime() >= range.startDate.getTime() && date.getTime() < range.endDate.getTime();
}

/** Previous period key, e.g. "2026-08" -> "2026-07". */
export function previousPeriodKey(periodKey: string): string {
  return shiftMonth(periodKey, -1);
}
