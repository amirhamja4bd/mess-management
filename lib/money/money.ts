import { DEFAULT_CURRENCY } from "@/lib/constants";

/**
 * Monetary values are stored as integer minor units.
 *
 * For BDT we use paisa (৳1 = 100 paisa), so:
 *   ৳100.50  ==  10050 paisa
 *
 * All financial amounts (expenses, payments, adjustments, shares,
 * balances, settlements) MUST be integers in this unit. Floating point
 * arithmetic is never used for money; deterministic rounding is done
 * with Math.round on integer inputs only.
 */
export const MINOR_UNIT = 100;

export type Paisa = number;

/** Convert a decimal taka amount (e.g. 100.5) to integer paisa. */
export function takaToPaisa(taka: number): Paisa {
  if (!Number.isFinite(taka)) {
    throw new Error("takaToPaisa: amount must be a finite number");
  }
  return Math.round(taka * MINOR_UNIT);
}

/** Convert integer paisa back to decimal taka for display only. */
export function paisaToTaka(paisa: Paisa): number {
  return paisa / MINOR_UNIT;
}

/** Round a possibly fractional paisa value to the nearest integer paisa (deterministic). */
export function roundPaisa(value: number): Paisa {
  if (!Number.isFinite(value)) {
    throw new Error("roundPaisa: value must be a finite number");
  }
  return Math.round(value);
}

/**
 * Format paisa as a human readable amount with thousand separators.
 * e.g. formatPaisa(1234567, "BDT") => "৳12,345.67"
 */
export function formatPaisa(paisa: Paisa, currency: string = DEFAULT_CURRENCY): string {
  const taka = paisaToTaka(paisa);
  const parts = Math.abs(taka).toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = taka < 0 ? "-" : "";
  const symbol = currency === "BDT" ? "৳" : `${currency} `;
  return `${sign}${symbol}${parts.join(".")}`;
}

export function isPaisa(value: unknown): value is Paisa {
  return typeof value === "number" && Number.isInteger(value);
}
