import { formatPaisa } from "@/lib/money";
import { DISTRIBUTION_METHOD, MEAL_ENTRY_STATUS } from "@/lib/constants/enums";

/** Format an integer paisa amount as "৳12,345.67". */
export function money(paisa: number | null | undefined): string {
  return formatPaisa(paisa ?? 0);
}

/** Format a taka number (grocery items) as "12,345". */
export function taka(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-08" -> "Aug 2026". */
export function periodLabel(periodKey: string): string {
  const [year, month] = periodKey.split("-").map(Number);
  if (!year || !month) return periodKey;
  return `${MONTHS[month - 1]} ${year}`;
}

/** Current period key "YYYY-MM" in local time. */
export function currentPeriodKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Local date string YYYY-MM-DD. */
export function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayInput(): string {
  return toDateInput(new Date());
}

/** "2026-08-16" -> "Aug 16, 2026". */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return `${formatDate(date)}, ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Human label for a distribution method. */
export function methodLabel(method: string): string {
  switch (method) {
    case DISTRIBUTION_METHOD.EQUAL:
      return "Equal share";
    case DISTRIBUTION_METHOD.MEAL_BASED:
      return "Meal based";
    case DISTRIBUTION_METHOD.SELECTED_MEMBERS:
      return "Selected members";
    case DISTRIBUTION_METHOD.PERCENTAGE:
      return "Percentage";
    case DISTRIBUTION_METHOD.FIXED_AMOUNT:
      return "Fixed amount";
    case DISTRIBUTION_METHOD.INDIVIDUAL:
      return "Individual";
    default:
      return method;
  }
}

export function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function mealEntryLabel(status: string): string {
  switch (status) {
    case MEAL_ENTRY_STATUS.CONSUMED:
      return "Consumed";
    case MEAL_ENTRY_STATUS.NOT_CONSUMED:
      return "Not consumed";
    case MEAL_ENTRY_STATUS.AWAY:
      return "Away";
    case MEAL_ENTRY_STATUS.CANCELLED:
      return "Cancelled";
    case MEAL_ENTRY_STATUS.ADJUSTED:
      return "Adjusted";
    default:
      return status;
  }
}

/** "BDT" / currency symbol for the org (backend stores paisa under BDT). */
export const CURRENCY = "BDT";
