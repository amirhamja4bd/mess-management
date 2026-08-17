import { describe, expect, it } from "vitest";
import { calculateMonthlyAccounting } from "@/lib/core/accounting";
import type { AccountingInput, AccountingPayment } from "@/lib/core/accounting";
import {
  ADJUSTMENT_TYPE,
  DISTRIBUTION_METHOD,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
} from "@/lib/constants/enums";
import type { PaymentType } from "@/lib/constants/enums";
import type { MealWeightSlice } from "@/lib/core/meal-units";
import { BusinessRuleError } from "@/lib/errors";

const START = new Date("2026-08-01T00:00:00.000Z");
const END = new Date("2026-09-01T00:00:00.000Z");

const M1 = "member-1";
const M2 = "member-2";

const mealSlices: MealWeightSlice[] = [
  { mealTypeId: "mt-breakfast", weight: 1, effectiveFrom: START, effectiveTo: null },
  { mealTypeId: "mt-lunch", weight: 1, effectiveFrom: START, effectiveTo: null },
];

function baseInput(): AccountingInput {
  return {
    periodKey: "2026-08",
    startDate: START,
    endDate: END,
    members: [
      { id: M1, joinedAt: new Date("2026-01-01T00:00:00.000Z"), leftAt: null },
      { id: M2, joinedAt: new Date("2026-01-01T00:00:00.000Z"), leftAt: null },
    ],
    mealConfigSlices: mealSlices,
    mealEntries: [],
    expenses: [],
    payments: [],
    adjustments: [],
  };
}

function payment(
  memberId: string,
  amount: number,
  type: PaymentType = PAYMENT_TYPE.CONTRIBUTION
): AccountingPayment {
  return { memberId, amount, type, status: PAYMENT_STATUS.COMPLETED };
}

describe("calculateMonthlyAccounting", () => {
  it("throws when no members are active", () => {
    const input = baseInput();
    input.members = [];
    expect(() => calculateMonthlyAccounting(input)).toThrow(BusinessRuleError);
  });

  it("computes equal-split liabilities and net balances", () => {
    const input = baseInput();
    input.mealEntries = [
      { organizationMemberId: M1, mealTypeId: "mt-breakfast", date: new Date("2026-08-01T00:00:00.000Z"), status: "CONSUMED" },
      { organizationMemberId: M2, mealTypeId: "mt-breakfast", date: new Date("2026-08-01T00:00:00.000Z"), status: "CONSUMED" },
    ];
    input.expenses = [
      {
        id: "exp-1",
        amount: 2000,
        expenseDate: new Date("2026-08-02T00:00:00.000Z"),
        paidByMemberId: M1,
        method: DISTRIBUTION_METHOD.EQUAL,
        participants: [],
      },
    ];
    input.payments = [payment(M1, 1000), payment(M2, 1000)];
    const result = calculateMonthlyAccounting(input);

    expect(result.totals.totalExpense).toBe(2000);
    expect(result.totals.commonExpense).toBe(2000);
    // Each member owes 1000 and paid exactly that.
    const byId = new Map(result.members.map((m) => [m.memberId, m]));
    expect(byId.get(M1)!.totalLiability).toBe(1000);
    expect(byId.get(M2)!.totalLiability).toBe(1000);
    expect(byId.get(M1)!.netBalance).toBe(0);
    expect(byId.get(M2)!.netBalance).toBe(0);
    expect(result.balanceCheck.sumOfBalances).toBe(0);
  });

  it("classifies meal-based, equal and individual shares", () => {
    const input = baseInput();
    input.mealEntries = [
      { organizationMemberId: M1, mealTypeId: "mt-breakfast", date: new Date("2026-08-01T00:00:00.000Z"), status: "CONSUMED" },
      { organizationMemberId: M2, mealTypeId: "mt-breakfast", date: new Date("2026-08-01T00:00:00.000Z"), status: "CONSUMED" },
    ];
    input.expenses = [
      {
        id: "exp-meal",
        amount: 3000,
        expenseDate: new Date("2026-08-02T00:00:00.000Z"),
        paidByMemberId: M1,
        method: DISTRIBUTION_METHOD.MEAL_BASED,
        participants: [],
      },
      {
        id: "exp-common",
        amount: 1000,
        expenseDate: new Date("2026-08-02T00:00:00.000Z"),
        paidByMemberId: M1,
        method: DISTRIBUTION_METHOD.EQUAL,
        participants: [],
      },
      {
        id: "exp-individual",
        amount: 500,
        expenseDate: new Date("2026-08-02T00:00:00.000Z"),
        paidByMemberId: M2,
        method: DISTRIBUTION_METHOD.INDIVIDUAL,
        participants: [{ organizationMemberId: M2, amount: 500 }],
      },
    ];
    const result = calculateMonthlyAccounting(input);
    expect(result.totals.foodExpense).toBe(3000);
    expect(result.totals.commonExpense).toBe(1000);
    expect(result.totals.individualExpense).toBe(500);

    const byId = new Map(result.members.map((m) => [m.memberId, m]));
    const m1 = byId.get(M1)!;
    const m2 = byId.get(M2)!;
    expect(m1.foodShare).toBe(1500);
    expect(m1.commonShare).toBe(500);
    expect(m1.individualShare).toBe(0);
    expect(m1.totalLiability).toBe(2000);
    expect(m2.foodShare).toBe(1500);
    expect(m2.commonShare).toBe(500);
    expect(m2.individualShare).toBe(500);
    expect(m2.totalLiability).toBe(2500);
  });

  it("applies contributions and advances toward balances", () => {
    const input = baseInput();
    input.expenses = [
      {
        id: "exp-1",
        amount: 2000,
        expenseDate: new Date("2026-08-02T00:00:00.000Z"),
        paidByMemberId: M1,
        method: DISTRIBUTION_METHOD.EQUAL,
        participants: [],
      },
    ];
    input.payments = [
      payment(M1, 1000),
      payment(M2, 500, PAYMENT_TYPE.ADVANCE),
      payment(M2, 500),
    ];
    const result = calculateMonthlyAccounting(input);
    const byId = new Map(result.members.map((m) => [m.memberId, m]));
    const m1 = byId.get(M1)!;
    const m2 = byId.get(M2)!;

    expect(m1.totalPaid).toBe(1000);
    expect(m1.applicableAdvance).toBe(0);
    expect(m1.netBalance).toBe(0);
    expect(m2.totalPaid).toBe(1000);
    expect(m2.applicableAdvance).toBe(500);
    expect(m2.netBalance).toBe(0);
    expect(result.totals.totalPayments).toBe(2000);
    expect(result.balanceCheck.sumOfBalances).toBe(0);
  });

  it("ignores non-completed payments and settlement payments for balances", () => {
    const input = baseInput();
    input.expenses = [
      {
        id: "exp-1",
        amount: 2000,
        expenseDate: new Date("2026-08-02T00:00:00.000Z"),
        paidByMemberId: M1,
        method: DISTRIBUTION_METHOD.EQUAL,
        participants: [],
      },
    ];
    input.payments = [
      { ...payment(M1, 1000), status: PAYMENT_STATUS.PENDING },
      payment(M1, 500, PAYMENT_TYPE.SETTLEMENT_PAYMENT),
    ];
    const result = calculateMonthlyAccounting(input);
    expect(result.totals.totalPayments).toBe(0);
    expect(result.totals.totalSettlement).toBe(500);
    const m1 = result.members.find((m) => m.memberId === M1)!;
    const m2 = result.members.find((m) => m.memberId === M2)!;
    expect(m1.totalPaid).toBe(0);
    expect(m2.totalPaid).toBe(0);
    // Liability stands at 1000 each since no valid payment was applied.
    expect(m2.netBalance).toBe(1000);
  });

  it("applies refunds as negative payments and credits as reductions", () => {
    const input = baseInput();
    input.expenses = [
      {
        id: "exp-1",
        amount: 2000,
        expenseDate: new Date("2026-08-02T00:00:00.000Z"),
        paidByMemberId: M1,
        method: DISTRIBUTION_METHOD.EQUAL,
        participants: [],
      },
    ];
    input.payments = [
      payment(M1, 700),
      payment(M1, 200, PAYMENT_TYPE.REFUND),
      payment(M2, 1000),
    ];
    input.adjustments = [
      { memberId: M1, amount: 300, type: ADJUSTMENT_TYPE.CREDIT },
      { memberId: M2, amount: 200, type: ADJUSTMENT_TYPE.CREDIT },
    ];
    const result = calculateMonthlyAccounting(input);
    const byId = new Map(result.members.map((m) => [m.memberId, m]));
    const m1 = byId.get(M1)!;
    const m2 = byId.get(M2)!;
    expect(m1.totalPaid).toBe(500);
    expect(m1.totalCredit).toBe(300);
    // liability 1000 - paid 500 - credit 300 = +200 (still owes)
    expect(m1.netBalance).toBe(200);
    // liability 1000 - paid 1000 - credit 200 = -200 (receives)
    expect(m2.netBalance).toBe(-200);
    expect(result.totals.totalPayments).toBe(1500);
    expect(result.balanceCheck.sumOfBalances).toBe(0);
  });

  it("applies debit adjustments into liability", () => {
    const input = baseInput();
    input.adjustments = [{ memberId: M2, amount: 250, type: ADJUSTMENT_TYPE.DEBIT }];
    input.payments = [payment(M2, 250)];
    const result = calculateMonthlyAccounting(input);
    const m2 = result.members.find((m) => m.memberId === M2)!;
    expect(m2.totalLiability).toBe(250);
    expect(m2.netBalance).toBe(0);
    expect(result.totals.totalAdjustments).toBe(250);
    expect(result.balanceCheck.sumOfBalances).toBe(0);
  });

  it("carries opening balances forward", () => {
    const input = baseInput();
    // Balanced carry-over from the previous finalized period.
    input.openingBalances = { [M1]: 100, [M2]: -100 };
    const result = calculateMonthlyAccounting(input);
    const byId = new Map(result.members.map((m) => [m.memberId, m]));
    expect(byId.get(M1)!.netBalance).toBe(100);
    expect(byId.get(M2)!.netBalance).toBe(-100);
    expect(result.balanceCheck.sumOfBalances).toBe(0);
  });

  it("absorbs rounding residuals into the largest |balance|", () => {
    const input = baseInput();
    // A 1-paisa imbalance carried in from the previous period.
    input.openingBalances = { [M1]: 1 };
    const result = calculateMonthlyAccounting(input);
    const m1 = result.members.find((m) => m.memberId === M1)!;
    // Residual correction -1 is applied to the largest |balance|.
    expect(m1.netBalance).toBe(0);
    expect(m1.roundingAdjustment).toBe(-1);
    expect(result.totals.roundingAdjustment).toBe(1);
    expect(result.balanceCheck.sumOfBalances).toBe(1);
  });

  it("handles mid-period joins and leaves", () => {
    const input = baseInput();
    input.members = [
      { id: M1, joinedAt: new Date("2026-08-10T00:00:00.000Z"), leftAt: null },
      { id: M2, joinedAt: new Date("2026-01-01T00:00:00.000Z"), leftAt: new Date("2026-08-20T00:00:00.000Z") },
    ];
    input.expenses = [
      {
        id: "exp-1",
        amount: 2000,
        expenseDate: new Date("2026-08-12T00:00:00.000Z"),
        paidByMemberId: M1,
        method: DISTRIBUTION_METHOD.EQUAL,
        participants: [],
      },
      {
        id: "exp-2",
        amount: 1000,
        expenseDate: new Date("2026-08-25T00:00:00.000Z"),
        paidByMemberId: M1,
        method: DISTRIBUTION_METHOD.EQUAL,
        participants: [],
      },
    ];
    const result = calculateMonthlyAccounting(input);
    const byId = new Map(result.members.map((m) => [m.memberId, m]));
    // exp-1 on the 12th: both active -> 1000 each.
    // exp-2 on the 25th: only M1 active (M2 left on the 20th) -> M1 bears all 1000.
    expect(byId.get(M1)!.totalLiability).toBe(2000);
    expect(byId.get(M2)!.totalLiability).toBe(1000);
  });

  it("throws when an expense has no active members on its date", () => {
    const input = baseInput();
    input.members = [
      { id: M1, joinedAt: new Date("2026-08-15T00:00:00.000Z"), leftAt: null },
    ];
    input.expenses = [
      {
        id: "exp-1",
        amount: 1000,
        expenseDate: new Date("2026-08-01T00:00:00.000Z"),
        paidByMemberId: M1,
        method: DISTRIBUTION_METHOD.EQUAL,
        participants: [],
      },
    ];
    expect(() => calculateMonthlyAccounting(input)).toThrow(BusinessRuleError);
  });
});
