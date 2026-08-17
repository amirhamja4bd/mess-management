import { BusinessRuleError } from "@/lib/errors";

/**
 * Deterministic integer allocation.
 *
 * Uses the largest-remainder method so that fractional paisa amounts are
 * rounded in a way that (a) never loses money and (b) is reproducible.
 * Exact per-item values are floored, and the remaining whole paisa units
 * are distributed to the items with the largest fractional parts, ties
 * broken by index order (stable).
 */

export function allocateByWeights(total: number, weights: readonly number[]): number[] {
  if (!Number.isInteger(total)) {
    throw new BusinessRuleError("allocation total must be an integer amount");
  }
  if (total < 0) {
    throw new BusinessRuleError("allocation total must not be negative");
  }
  if (weights.length === 0) {
    throw new BusinessRuleError("cannot allocate across an empty participant set");
  }
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum <= 0) {
    throw new BusinessRuleError("allocation requires a positive total weight");
  }

  if (total === 0) {
    return weights.map(() => 0);
  }

  const exact = weights.map((weight) => (total * weight) / weightSum);
  const floors = exact.map((value) => Math.floor(value));
  let remainder = total - floors.reduce((sum, value) => sum + value, 0);

  if (remainder === 0) {
    return floors;
  }

  // Rank items by fractional part, largest first, index as tie-breaker.
  const order = weights
    .map((_, index) => index)
    .sort((a, b) => {
      const fracA = exact[a] - floors[a];
      const fracB = exact[b] - floors[b];
      if (fracB !== fracA) {
        return fracB - fracA;
      }
      return a - b;
    });

  const result = [...floors];
  for (let i = 0; i < order.length && remainder > 0; i += 1) {
    result[order[i]!] += 1;
    remainder -= 1;
  }

  return result;
}

/** Allocate `total` equally across `count` participants (largest remainder). */
export function allocateEqual(total: number, count: number): number[] {
  if (count <= 0) {
    throw new BusinessRuleError("cannot allocate across an empty participant set");
  }
  return allocateByWeights(total, Array.from({ length: count }, () => 1));
}

/** Split `total` proportionally to `percent` values that sum to 100. */
export function allocateByPercent(total: number, percents: readonly number[]): number[] {
  const percentSum = percents.reduce((sum, percent) => sum + percent, 0);
  if (percentSum !== 100) {
    throw new BusinessRuleError(
      `percentages must total exactly 100 for allocation; got ${percentSum}`
    );
  }
  return allocateByWeights(total, percents);
}
