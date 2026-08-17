import {
  ADJUSTMENT_TYPE,
  DISTRIBUTION_METHOD,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
} from "@/lib/constants/enums";
import type { DistributionMethod } from "@/lib/constants/enums";
import { BusinessRuleError } from "@/lib/errors";
import { distributeExpense } from "@/lib/core/distribution";
import type { DistributionParticipant } from "@/lib/core/distribution";
import {
  calculateMealUnits,
} from "@/lib/core/meal-units";
import type {
  CancelledMealDayInput,
  MealEntryInput,
  MealUnitsResult,
  MealWeightSlice,
} from "@/lib/core/meal-units";

/**
 * Monthly accounting engine (pure).
 *
 * Deterministically computes member balances for an accounting period from
 * plain, pre-fetched data. The service layer is responsible for loading
 * data, resolving references and persisting the result; this module only
 * does math and is fully unit-testable without a database.
 *
 * Balance sign convention (documented and mirrored in tests):
 *   netBalance > 0  => member owes money
 *   netBalance < 0  => member should receive money
 *   netBalance = 0  => settled
 *
 *   netBalance = openingBalance + liability + debits - contributions - credits
 *
 * Any residual from adjustments or rounding (sum of net balances != 0) is
 * absorbed deterministically by the member with the largest absolute
 * balance and recorded in `roundingAdjustment`.
 */

export interface AccountingMember {
  id: string;
  joinedAt: Date;
  leftAt: Date | null;
}

export interface AccountingExpense {
  id: string;
  amount: number;
  expenseDate: Date;
  paidByMemberId: string;
  method: DistributionMethod;
  participants: DistributionParticipant[];
}

export interface AccountingPayment {
  memberId: string;
  amount: number;
  type: string;
  status: string;
}

export interface AccountingAdjustment {
  memberId: string;
  amount: number;
  type: string;
}

export interface AccountingInput {
  periodKey: string;
  startDate: Date;
  endDate: Date;
  members: AccountingMember[];
  mealConfigSlices: MealWeightSlice[];
  mealEntries: MealEntryInput[];
  cancelledMealDays?: CancelledMealDayInput[];
  expenses: AccountingExpense[];
  payments: AccountingPayment[];
  adjustments: AccountingAdjustment[];
  /** memberId -> netBalance carried over from the previous period. */
  openingBalances?: Record<string, number>;
}

export interface AccountingMemberResult {
  memberId: string;
  foodShare: number;
  commonShare: number;
  individualShare: number;
  totalLiability: number;
  totalPaid: number;
  applicableAdvance: number;
  totalCredit: number;
  roundingAdjustment: number;
  netBalance: number;
}

export interface AccountingTotals {
  totalExpense: number;
  foodExpense: number;
  commonExpense: number;
  individualExpense: number;
  totalPayments: number;
  totalAdjustments: number;
  totalSettlement: number;
  roundingAdjustment: number;
}

export interface AccountingResult {
  periodKey: string;
  members: AccountingMemberResult[];
  totals: AccountingTotals;
  meals: MealUnitsResult;
  balanceCheck: { sumOfBalances: number };
}

function isActiveOn(date: Date, member: AccountingMember): boolean {
  if (date.getTime() < member.joinedAt.getTime()) {
    return false;
  }
  if (member.leftAt && date.getTime() >= member.leftAt.getTime()) {
    return false;
  }
  return true;
}

export function calculateMonthlyAccounting(input: AccountingInput): AccountingResult {
  const {
    periodKey,
    startDate,
    endDate,
    members,
    expenses,
    payments,
    adjustments,
    openingBalances = {},
  } = input;

  const activeMembers = members.filter(
    (member) =>
      member.joinedAt.getTime() < endDate.getTime() &&
      (member.leftAt === null || member.leftAt.getTime() > startDate.getTime())
  );
  if (activeMembers.length === 0) {
    throw new BusinessRuleError("no members are active in this accounting period");
  }

  const meals = calculateMealUnits(
    input.mealEntries,
    input.mealConfigSlices,
    input.cancelledMealDays ?? []
  );
  if (meals.unresolved.length > 0) {
    const first = meals.unresolved[0]!;
    throw new BusinessRuleError(
      `meal entry on ${first.date.toISOString().slice(0, 10)} (meal type ${first.mealTypeId}) ` +
        "has no applicable meal configuration; add a config before calculating",
      { unresolved: meals.unresolved.slice(0, 20) }
    );
  }

  const memberRows = new Map<string, AccountingMemberResult>();
  for (const member of activeMembers) {
    memberRows.set(member.id, {
      memberId: member.id,
      foodShare: 0,
      commonShare: 0,
      individualShare: 0,
      totalLiability: 0,
      totalPaid: 0,
      applicableAdvance: 0,
      totalCredit: 0,
      roundingAdjustment: 0,
      netBalance: 0,
    });
  }

  const totals: AccountingTotals = {
    totalExpense: 0,
    foodExpense: 0,
    commonExpense: 0,
    individualExpense: 0,
    totalPayments: 0,
    totalAdjustments: 0,
    totalSettlement: 0,
    roundingAdjustment: 0,
  };

  // --- expenses --------------------------------------------------------
  for (const expense of expenses) {
    const eligible = activeMembers.filter((member) => isActiveOn(expense.expenseDate, member));
    if (eligible.length === 0) {
      throw new BusinessRuleError(
        `expense ${expense.id} has no members active on its date; cannot distribute`
      );
    }

    const result = distributeExpense({
      method: expense.method,
      amount: expense.amount,
      participants: expense.participants,
      memberIds: eligible.map((member) => member.id),
      mealUnitsByMember: meals.unitsByMember,
    });

    for (const allocation of result.allocations) {
      const row = memberRows.get(allocation.organizationMemberId);
      if (!row) {
        throw new BusinessRuleError(
          `expense ${expense.id} allocated to a member not active in the period`
        );
      }
      if (expense.method === DISTRIBUTION_METHOD.MEAL_BASED) {
        row.foodShare += allocation.amount;
      } else if (expense.method === DISTRIBUTION_METHOD.INDIVIDUAL) {
        row.individualShare += allocation.amount;
      } else {
        row.commonShare += allocation.amount;
      }
    }

    if (expense.method === DISTRIBUTION_METHOD.MEAL_BASED) {
      totals.foodExpense += expense.amount;
    } else if (expense.method === DISTRIBUTION_METHOD.INDIVIDUAL) {
      totals.individualExpense += expense.amount;
    } else {
      totals.commonExpense += expense.amount;
    }
    totals.totalExpense += expense.amount;
  }

  // --- payments --------------------------------------------------------
  for (const payment of payments) {
    if (payment.status !== PAYMENT_STATUS.COMPLETED) {
      continue;
    }
    if (payment.type === PAYMENT_TYPE.SETTLEMENT_PAYMENT) {
      totals.totalSettlement += payment.amount;
      continue;
    }
    const row = memberRows.get(payment.memberId);
    if (!row) {
      continue;
    }
    if (payment.type === PAYMENT_TYPE.REFUND) {
      row.totalPaid -= payment.amount;
      totals.totalPayments -= payment.amount;
    } else {
      row.totalPaid += payment.amount;
      totals.totalPayments += payment.amount;
    }
    if (payment.type === PAYMENT_TYPE.ADVANCE) {
      row.applicableAdvance += payment.amount;
    }
  }

  // --- adjustments -----------------------------------------------------
  for (const adjustment of adjustments) {
    const row = memberRows.get(adjustment.memberId);
    if (!row) {
      continue;
    }
    totals.totalAdjustments += adjustment.amount;
    if (adjustment.type === ADJUSTMENT_TYPE.CREDIT) {
      row.totalCredit += adjustment.amount;
    }
  }

  // --- balances --------------------------------------------------------
  for (const row of memberRows.values()) {
    const debits = adjustments
      .filter((a) => a.memberId === row.memberId && a.type === ADJUSTMENT_TYPE.DEBIT)
      .reduce((sum, a) => sum + a.amount, 0);

    row.totalLiability = row.foodShare + row.commonShare + row.individualShare + debits;
    row.netBalance =
      (openingBalances[row.memberId] ?? 0) +
      row.totalLiability -
      row.totalPaid -
      row.totalCredit;
  }

  // --- rounding / balance correction ----------------------------------
  const sumOfBalances = Array.from(memberRows.values()).reduce(
    (sum, row) => sum + row.netBalance,
    0
  );
  if (sumOfBalances !== 0) {
    const sorted = Array.from(memberRows.values()).sort(
      (a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance)
    );
    const target = sorted[0]!;
    const correction = -sumOfBalances;
    target.netBalance += correction;
    target.roundingAdjustment += correction;
    totals.roundingAdjustment += sumOfBalances;
  }

  return {
    periodKey,
    members: Array.from(memberRows.values()),
    totals,
    meals,
    balanceCheck: { sumOfBalances },
  };
}
