import { DISTRIBUTION_METHOD } from "@/lib/constants/enums";
import type { DistributionMethod } from "@/lib/constants/enums";
import { BusinessRuleError } from "@/lib/errors";
import { allocateByWeights, allocateEqual } from "@/lib/core/rounding";

/**
 * Expense distribution strategies.
 *
 * Pure, independently testable functions. The service layer resolves
 * eligibility (active members on a date, meal units for the period) and
 * feeds plain data in; each strategy produces integer paisa allocations
 * that always sum exactly to the expense amount.
 *
 *   EQUAL             - split across members active on the expense date
 *   MEAL_BASED        - split proportionally to meal units
 *   SELECTED_MEMBERS  - split equally across explicitly listed members
 *   PERCENTAGE        - split by participant percentages (sum = 100)
 *   FIXED_AMOUNT      - each participant carries an explicit paisa amount
 *   INDIVIDUAL        - one participant carries the exact amount (own purchase)
 */

export interface DistributionParticipant {
  organizationMemberId: string;
  percent?: number;
  amount?: number;
}

export interface DistributionInput {
  method: DistributionMethod;
  amount: number;
  participants: DistributionParticipant[];
  /** Member ids active on the expense date (required for EQUAL / MEAL_BASED). */
  memberIds?: string[];
  /** memberId -> meal units in the period (required for MEAL_BASED). */
  mealUnitsByMember?: Record<string, number>;
}

export interface Allocation {
  organizationMemberId: string;
  amount: number;
}

export interface DistributionResult {
  method: DistributionMethod;
  allocations: Allocation[];
  /** Always equal to the input amount. */
  total: number;
}

function toAllocations(ids: readonly string[], amounts: readonly number[]): Allocation[] {
  return ids.map((id, index) => ({ organizationMemberId: id, amount: amounts[index]! }));
}

export function distributeExpense(input: DistributionInput): DistributionResult {
  const { method, amount, participants } = input;

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new BusinessRuleError("expense amount must be a positive integer amount");
  }

  switch (method) {
    case DISTRIBUTION_METHOD.EQUAL: {
      const memberIds = input.memberIds;
      if (!memberIds || memberIds.length === 0) {
        throw new BusinessRuleError(
          "equal distribution requires at least one active member on the expense date"
        );
      }
      return {
        method,
        total: amount,
        allocations: toAllocations(memberIds, allocateEqual(amount, memberIds.length)),
      };
    }

    case DISTRIBUTION_METHOD.MEAL_BASED: {
      const memberIds = input.memberIds;
      const unitsByMember = input.mealUnitsByMember ?? {};
      if (!memberIds || memberIds.length === 0) {
        throw new BusinessRuleError(
          "meal-based distribution requires at least one active member on the expense date"
        );
      }
      const weights = memberIds.map((id) => unitsByMember[id] ?? 0);
      if (weights.reduce((sum, weight) => sum + weight, 0) <= 0) {
        throw new BusinessRuleError(
          "meal-based distribution requires positive meal units for the period"
        );
      }
      return {
        method,
        total: amount,
        allocations: toAllocations(memberIds, allocateByWeights(amount, weights)),
      };
    }

    case DISTRIBUTION_METHOD.SELECTED_MEMBERS: {
      if (participants.length < 2) {
        throw new BusinessRuleError(
          "selected members distribution requires at least 2 participants"
        );
      }
      const ids = participants.map((participant) => participant.organizationMemberId);
      return {
        method,
        total: amount,
        allocations: toAllocations(ids, allocateEqual(amount, ids.length)),
      };
    }

    case DISTRIBUTION_METHOD.PERCENTAGE: {
      const ids = participants.map((participant) => participant.organizationMemberId);
      const percents = participants.map((participant) => participant.percent ?? 0);
      const percentSum = percents.reduce((sum, percent) => sum + percent, 0);
      if (percentSum !== 100) {
        throw new BusinessRuleError(
          `percentages must total exactly 100; got ${percentSum}`
        );
      }
      const amounts = allocateByWeights(amount, percents);
      return { method, total: amount, allocations: toAllocations(ids, amounts) };
    }

    case DISTRIBUTION_METHOD.FIXED_AMOUNT:
    case DISTRIBUTION_METHOD.INDIVIDUAL: {
      if (participants.length === 0) {
        throw new BusinessRuleError(
          `${method === DISTRIBUTION_METHOD.INDIVIDUAL ? "individual" : "fixed amount"} ` +
            "distribution requires at least 1 participant"
        );
      }
      const amounts = participants.map((participant) => participant.amount ?? 0);
      const total = amounts.reduce((sum, value) => sum + value, 0);
      if (total !== amount) {
        throw new BusinessRuleError(
          `participant amounts must total the expense amount (${amount}); got ${total}`
        );
      }
      return {
        method,
        total: amount,
        allocations: toAllocations(
          participants.map((participant) => participant.organizationMemberId),
          amounts
        ),
      };
    }

    default: {
      const exhaustive: never = method;
      throw new BusinessRuleError(`unsupported distribution method: ${String(exhaustive)}`);
    }
  }
}
