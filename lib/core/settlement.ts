import { BusinessRuleError } from "@/lib/errors";

/**
 * Settlement plan generation (pure).
 *
 * Given the finalized net balances of an accounting period (positive =
 * owes, negative = receives), produce a minimal list of transfers using a
 * greedy two-pointer match. The invariant:
 *
 *   sum(amount owed) === sum(amount receivable)
 *
 * is guaranteed after the accounting engine's rounding correction; this
 * module re-verifies it and throws if the books are unbalanced.
 */

export interface SettlementBalance {
  memberId: string;
  /** Positive = owes money; negative = should receive money. */
  netBalance: number;
}

export interface SettlementTransactionPlan {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

export interface SettlementPlan {
  transactions: SettlementTransactionPlan[];
  totalAmount: number;
}

export function generateSettlementPlan(balances: readonly SettlementBalance[]): SettlementPlan {
  const debtors = balances
    .filter((balance) => balance.netBalance > 0)
    .map((balance) => ({ memberId: balance.memberId, amount: balance.netBalance }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = balances
    .filter((balance) => balance.netBalance < 0)
    .map((balance) => ({ memberId: balance.memberId, amount: -balance.netBalance }))
    .sort((a, b) => b.amount - a.amount);

  const totalOwed = debtors.reduce((sum, d) => sum + d.amount, 0);
  const totalReceivable = creditors.reduce((sum, c) => sum + c.amount, 0);

  if (totalOwed !== totalReceivable) {
    throw new BusinessRuleError(
      `settlement books are unbalanced: owed ${totalOwed}, receivable ${totalReceivable}`
    );
  }

  const transactions: SettlementTransactionPlan[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      transactions.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amount,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) {
      i += 1;
    }
    if (creditor.amount === 0) {
      j += 1;
    }
  }

  return { transactions, totalAmount: totalOwed };
}
