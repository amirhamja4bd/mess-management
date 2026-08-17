import { describe, expect, it } from "vitest";
import { generateSettlementPlan } from "@/lib/core/settlement";
import { BusinessRuleError } from "@/lib/errors";

const M1 = "member-1";
const M2 = "member-2";
const M3 = "member-3";

describe("generateSettlementPlan", () => {
  it("produces a single transfer for a two-member imbalance", () => {
    const plan = generateSettlementPlan([
      { memberId: M1, netBalance: 1500 },
      { memberId: M2, netBalance: -1500 },
    ]);
    expect(plan.totalAmount).toBe(1500);
    expect(plan.transactions).toEqual([{ fromMemberId: M1, toMemberId: M2, amount: 1500 }]);
  });

  it("produces a minimal set of transfers across multiple members", () => {
    const plan = generateSettlementPlan([
      { memberId: M1, netBalance: 2500 },
      { memberId: M2, netBalance: 1500 },
      { memberId: M3, netBalance: -4000 },
    ]);
    expect(plan.totalAmount).toBe(4000);
    const paidByM1 = plan.transactions.filter((t) => t.fromMemberId === M1).reduce((s, t) => s + t.amount, 0);
    const paidByM2 = plan.transactions.filter((t) => t.fromMemberId === M2).reduce((s, t) => s + t.amount, 0);
    const receivedByM3 = plan.transactions.filter((t) => t.toMemberId === M3).reduce((s, t) => s + t.amount, 0);
    expect(paidByM1).toBe(2500);
    expect(paidByM2).toBe(1500);
    expect(receivedByM3).toBe(4000);
  });

  it("settles debts exactly when amounts are uneven", () => {
    const plan = generateSettlementPlan([
      { memberId: M1, netBalance: 100 },
      { memberId: M2, netBalance: 200 },
      { memberId: M3, netBalance: -300 },
    ]);
    expect(plan.totalAmount).toBe(300);
    // Greedy largest-first: M2(200) -> M3(300, leaving 100), then M1(100) -> M3.
    expect(plan.transactions).toEqual([
      { fromMemberId: M2, toMemberId: M3, amount: 200 },
      { fromMemberId: M1, toMemberId: M3, amount: 100 },
    ]);
  });

  it("handles already-settled members", () => {
    const plan = generateSettlementPlan([
      { memberId: M1, netBalance: 0 },
      { memberId: M2, netBalance: 500 },
      { memberId: M3, netBalance: -500 },
    ]);
    expect(plan.transactions).toEqual([{ fromMemberId: M2, toMemberId: M3, amount: 500 }]);
  });

  it("returns no transactions when all balances are zero", () => {
    const plan = generateSettlementPlan([
      { memberId: M1, netBalance: 0 },
      { memberId: M2, netBalance: 0 },
    ]);
    expect(plan.transactions).toEqual([]);
    expect(plan.totalAmount).toBe(0);
  });

  it("throws when the books are unbalanced", () => {
    expect(() =>
      generateSettlementPlan([
        { memberId: M1, netBalance: 1000 },
        { memberId: M2, netBalance: -500 },
      ])
    ).toThrow(BusinessRuleError);
  });

  it("produces a fully settled plan for a larger group", () => {
    const plan = generateSettlementPlan([
      { memberId: "a", netBalance: 120 },
      { memberId: "b", netBalance: -80 },
      { memberId: "c", netBalance: -10 },
      { memberId: "d", netBalance: -30 },
    ]);
    const from = new Map<string, number>();
    const to = new Map<string, number>();
    for (const t of plan.transactions) {
      from.set(t.fromMemberId, (from.get(t.fromMemberId) ?? 0) + t.amount);
      to.set(t.toMemberId, (to.get(t.toMemberId) ?? 0) + t.amount);
    }
    expect((from.get("a") ?? 0) - (to.get("a") ?? 0)).toBe(120);
    expect((from.get("b") ?? 0) - (to.get("b") ?? 0)).toBe(-80);
    expect((from.get("c") ?? 0) - (to.get("c") ?? 0)).toBe(-10);
    expect((from.get("d") ?? 0) - (to.get("d") ?? 0)).toBe(-30);
    expect(plan.totalAmount).toBe(120);
  });
});
