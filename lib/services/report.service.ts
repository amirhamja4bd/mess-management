import { Types } from "mongoose";
import {
  DISTRIBUTION_METHOD,
  EXPENSE_STATUS,
  MEAL_ENTRY_STATUS,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
} from "@/lib/constants/enums";
import { connectToDatabase } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import {
  AdjustmentModel,
  ExpenseCategoryModel,
  ExpenseModel,
  MealEntryModel,
  MonthlyCycleModel,
  MemberMonthlySummaryModel,
  OrganizationModel,
  OrganizationMemberModel,
  PaymentModel,
  SettlementModel,
  SettlementTransactionModel,
} from "@/lib/models";
import { periodKeyOf, periodKeyToRange, previousPeriodKey } from "@/lib/core/period";
import { distributeExpense } from "@/lib/core/distribution";
import { loadMealUnitsForRange } from "@/lib/services/meal-units-loader";
import { paginationResult } from "@/lib/utils/pagination";
import type { OrgContext } from "@/lib/authorization";

/** id of a Mongoose document even when the path is populated (`.populate(...)`). */
function toIdString(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "object" && "_id" in (value as Record<string, unknown>)) {
    return (value as { _id: { toString(): string } })._id.toString();
  }
  return String(value);
}

async function getOrganization(context: OrgContext) {
  const organization = await OrganizationModel.findById(context.organizationId);
  if (!organization) {
    throw new NotFoundError("Organization not found");
  }
  return organization;
}

export interface DashboardOptions {
  periodKey?: string;
}

export async function getDashboard(context: OrgContext, options: DashboardOptions = {}) {
  await connectToDatabase();
  const organization = await getOrganization(context);
  const startDay = organization.settings.accountingPeriodStartDay ?? 1;
  const periodKey = options.periodKey ?? currentPeriod(startDay);
  const range = periodKeyToRange(periodKey, startDay);

  const cycle = await MonthlyCycleModel.findOne({
    organizationId: context.organizationId,
    periodKey,
  });

  const [summary, totals, recent] = await Promise.all([
    MemberMonthlySummaryModel.find({
      organizationId: context.organizationId,
      cycleId: cycle?._id,
    }).sort({ "totals.netBalance": -1 }),
    aggregateTotals(context, periodKey),
    ExpenseModel.find({
      organizationId: context.organizationId,
      deletedAt: null,
      status: { $ne: EXPENSE_STATUS.VOIDED },
      expenseDate: { $gte: range.startDate, $lt: range.endDate },
    })
      .sort({ expenseDate: -1 })
      .limit(5)
      .populate("categoryId"),
  ]);

  return {
    periodKey,
    cycleStatus: cycle?.status ?? null,
    totals,
    topBalances: summary.map((row) => ({
      organizationMemberId: row.organizationMemberId,
      netBalance: row.totals.netBalance,
    })),
    recentExpenses: recent,
  };
}

export interface MonthlySummaryOptions {
  periodKey?: string;
}

export async function getMonthlySummary(context: OrgContext, options: MonthlySummaryOptions = {}) {
  await connectToDatabase();
  const organization = await getOrganization(context);
  const startDay = organization.settings.accountingPeriodStartDay ?? 1;
  const periodKey = options.periodKey ?? currentPeriod(startDay);

  const cycle = await MonthlyCycleModel.findOne({
    organizationId: context.organizationId,
    periodKey,
  });
  if (!cycle) {
    return {
      periodKey,
      cycle: null,
      members: [],
      totals: await aggregateTotals(context, periodKey),
    };
  }

  const summaries = await MemberMonthlySummaryModel.find({
    organizationId: context.organizationId,
    cycleId: cycle._id,
  })
    .populate({ path: "organizationMemberId", populate: { path: "userId" } })
    .sort({ "totals.netBalance": -1 });

  return {
    periodKey,
    cycle,
    members: summaries,
    totals: await aggregateTotals(context, periodKey),
  };
}

export interface CategoryTotalsOptions {
  periodKey?: string;
}

export async function getExpenseCategoryTotals(
  context: OrgContext,
  options: CategoryTotalsOptions = {}
) {
  await connectToDatabase();
  const organization = await getOrganization(context);
  const startDay = organization.settings.accountingPeriodStartDay ?? 1;
  const periodKey = options.periodKey ?? currentPeriod(startDay);
  const range = periodKeyToRange(periodKey, startDay);

  const rows = await ExpenseModel.aggregate([
    {
      $match: {
        organizationId: new Types.ObjectId(context.organizationId),
        deletedAt: null,
        status: { $ne: EXPENSE_STATUS.VOIDED },
        expenseDate: { $gte: range.startDate, $lt: range.endDate },
      },
    },
    {
      $group: {
        _id: "$categoryId",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

  const categories = await ExpenseCategoryModel.find({
    _id: { $in: rows.map((row) => row._id) },
    organizationId: context.organizationId,
  });
  const categoryById = new Map(categories.map((category) => [category._id.toString(), category]));

  const items = rows.map((row) => ({
    categoryId: row._id.toString(),
    name: categoryById.get(row._id.toString())?.name ?? "Unknown",
    isFood: categoryById.get(row._id.toString())?.isFood ?? false,
    total: row.total,
    count: row.count,
  }));
  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);
  return {
    periodKey,
    items,
    grandTotal,
    breakdown: items.map((item) => ({
      ...item,
      percent: grandTotal === 0 ? 0 : Math.round((item.total / grandTotal) * 1000) / 10,
    })),
  };
}

export interface MealAnalyticsOptions {
  periodKey?: string;
}

export async function getMealAnalytics(context: OrgContext, options: MealAnalyticsOptions = {}) {
  await connectToDatabase();
  const organization = await getOrganization(context);
  const startDay = organization.settings.accountingPeriodStartDay ?? 1;
  const periodKey = options.periodKey ?? currentPeriod(startDay);
  const range = periodKeyToRange(periodKey, startDay);

  const entries = await MealEntryModel.find({
    organizationId: context.organizationId,
    date: { $gte: range.startDate, $lt: range.endDate },
  })
    .populate("mealTypeId")
    .populate({ path: "organizationMemberId", populate: { path: "userId" } });

  const byMealType = new Map<
    string,
    { mealTypeId: string; name: string; count: number; cancelled: number; consumed: number }
  >();
  const byMember = new Map<
    string,
    { organizationMemberId: string; name: string; count: number }
  >();
  let consumed = 0;
  let notConsumed = 0;

  for (const entry of entries) {
    const mealTypeId = toIdString(entry.mealTypeId);
    const mealName = (entry.mealTypeId as unknown as { name?: string })?.name ?? mealTypeId;
    const memberId = toIdString(entry.organizationMemberId);
    const memberName =
      (entry.organizationMemberId as unknown as { userId?: { name?: string } })?.userId?.name ??
      "Unknown";

    const mealStat = byMealType.get(mealTypeId) ?? {
      mealTypeId,
      name: mealName,
      count: 0,
      cancelled: 0,
      consumed: 0,
    };
    mealStat.count += 1;
    if (entry.status === MEAL_ENTRY_STATUS.CANCELLED) {
      mealStat.cancelled += 1;
    } else if (entry.status === MEAL_ENTRY_STATUS.CONSUMED || entry.status === MEAL_ENTRY_STATUS.ADJUSTED) {
      mealStat.consumed += 1;
      consumed += 1;
    } else {
      notConsumed += 1;
    }
    byMealType.set(mealTypeId, mealStat);

    const memberStat = byMember.get(memberId) ?? {
      organizationMemberId: memberId,
      name: memberName,
      count: 0,
    };
    memberStat.count += 1;
    byMember.set(memberId, memberStat);
  }

  return {
    periodKey,
    totals: {
      entries: entries.length,
      consumed,
      notConsumed,
    },
    byMealType: Array.from(byMealType.values()).sort((a, b) => b.count - a.count),
    byMember: Array.from(byMember.values()).sort((a, b) => b.count - a.count),
  };
}

export interface PaymentSummaryOptions {
  periodKey?: string;
}

export async function getPaymentSummary(context: OrgContext, options: PaymentSummaryOptions = {}) {
  await connectToDatabase();
  const organization = await getOrganization(context);
  const startDay = organization.settings.accountingPeriodStartDay ?? 1;
  const periodKey = options.periodKey ?? currentPeriod(startDay);
  const range = periodKeyToRange(periodKey, startDay);

  const payments = await PaymentModel.find({
    organizationId: context.organizationId,
    deletedAt: null,
    status: PAYMENT_STATUS.COMPLETED,
    paymentDate: { $gte: range.startDate, $lt: range.endDate },
  }).populate({ path: "organizationMemberId", populate: { path: "userId" } });

  const totals: Record<string, number> = {
    total: 0,
    contribution: 0,
    advance: 0,
    settlement: 0,
    refund: 0,
  };
  const byMember = new Map<string, { organizationMemberId: string; name: string; total: number; count: number }>();

  for (const payment of payments) {
    totals.total += payment.amount;
    const key =
      payment.type === PAYMENT_TYPE.REFUND
        ? "refund"
        : payment.type === PAYMENT_TYPE.SETTLEMENT_PAYMENT
          ? "settlement"
          : payment.type === PAYMENT_TYPE.ADVANCE
            ? "advance"
            : "contribution";
    totals[key] = (totals[key] ?? 0) + payment.amount;

    const memberId = toIdString(payment.organizationMemberId);
    const stat = byMember.get(memberId) ?? {
      organizationMemberId: memberId,
      name:
        (payment.organizationMemberId as unknown as { userId?: { name?: string } })?.userId?.name ??
        "Unknown",
      total: 0,
      count: 0,
    };
    stat.total += payment.amount;
    stat.count += 1;
    byMember.set(memberId, stat);
  }

  return {
    periodKey,
    totals,
    byMember: Array.from(byMember.values()).sort((a, b) => b.total - a.total),
  };
}

export interface SettlementSummaryOptions {
  periodKey?: string;
}

export async function getSettlementSummary(
  context: OrgContext,
  options: SettlementSummaryOptions = {}
) {
  await connectToDatabase();
  const organization = await getOrganization(context);
  const startDay = organization.settings.accountingPeriodStartDay ?? 1;
  const periodKey = options.periodKey ?? currentPeriod(startDay);

  const cycle = await MonthlyCycleModel.findOne({
    organizationId: context.organizationId,
    periodKey,
  });
  if (!cycle) {
    return { periodKey, settlement: null, transactions: [] };
  }
  const settlement = await SettlementModel.findOne({
    organizationId: context.organizationId,
    cycleId: cycle._id,
  });
  if (!settlement) {
    return { periodKey, settlement: null, transactions: [] };
  }
  const transactions = await SettlementTransactionModel.find({
    organizationId: context.organizationId,
    settlementId: settlement._id,
  })
    .populate({ path: "fromMemberId", populate: { path: "userId" } })
    .populate({ path: "toMemberId", populate: { path: "userId" } });

  return {
    periodKey,
    settlement,
    transactions,
  };
}

async function aggregateTotals(context: OrgContext, periodKey: string) {
  const organization = await getOrganization(context);
  const startDay = organization.settings.accountingPeriodStartDay ?? 1;
  const range = periodKeyToRange(periodKey, startDay);

  const [expenseTotals, paymentTotals, adjustmentTotals] = await Promise.all([
    ExpenseModel.aggregate([
      {
        $match: {
          organizationId: new Types.ObjectId(context.organizationId),
          deletedAt: null,
          status: { $ne: EXPENSE_STATUS.VOIDED },
          expenseDate: { $gte: range.startDate, $lt: range.endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalExpense: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    PaymentModel.aggregate([
      {
        $match: {
          organizationId: new Types.ObjectId(context.organizationId),
          deletedAt: null,
          status: PAYMENT_STATUS.COMPLETED,
          paymentDate: { $gte: range.startDate, $lt: range.endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    AdjustmentModel.aggregate([
      {
        $match: {
          organizationId: new Types.ObjectId(context.organizationId),
          deletedAt: null,
          status: { $ne: "VOIDED" },
          adjustmentDate: { $gte: range.startDate, $lt: range.endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalAdjustments: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  return {
    totalExpense: expenseTotals[0]?.totalExpense ?? 0,
    expenseCount: expenseTotals[0]?.count ?? 0,
    totalPayments: paymentTotals[0]?.totalPayments ?? 0,
    paymentCount: paymentTotals[0]?.count ?? 0,
    totalAdjustments: adjustmentTotals[0]?.totalAdjustments ?? 0,
    adjustmentCount: adjustmentTotals[0]?.count ?? 0,
  };
}

function currentPeriod(startDay: number): string {
  return periodKeyOf(new Date(), startDay);
}

export interface ExpenseBreakdownOptions {
  periodKey?: string;
  page?: number;
  limit?: number;
  categoryId?: string;
}

/** Per-expense list for a period (used by the Expense breakdown report). */
export async function getExpenseBreakdown(
  context: OrgContext,
  options: ExpenseBreakdownOptions = {}
) {
  await connectToDatabase();
  const organization = await getOrganization(context);
  const startDay = organization.settings.accountingPeriodStartDay ?? 1;
  const periodKey = options.periodKey ?? currentPeriod(startDay);
  const range = periodKeyToRange(periodKey, startDay);
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;

  const match = {
    organizationId: new Types.ObjectId(context.organizationId),
    deletedAt: null,
    status: { $ne: EXPENSE_STATUS.VOIDED },
    expenseDate: { $gte: range.startDate, $lt: range.endDate },
  };
  const filter: Record<string, unknown> = { ...match };
  if (options.categoryId) {
    filter.categoryId = options.categoryId;
  }

  const [totalsRow, total, items] = await Promise.all([
    ExpenseModel.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    ExpenseModel.countDocuments(filter),
    ExpenseModel.find(filter as never)
      .sort({ expenseDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("categoryId")
      .populate({ path: "paidByMemberId", populate: { path: "userId" } }),
  ]);

  return {
    periodKey,
    totals: { totalExpense: totalsRow[0]?.total ?? 0, count: totalsRow[0]?.count ?? 0 },
    items: items.map((expense) => ({
      _id: expense._id,
      categoryId: toIdString(expense.categoryId),
      categoryName: (expense.categoryId as unknown as { name?: string })?.name ?? "Unknown",
      isFood: (expense.categoryId as unknown as { isFood?: boolean })?.isFood ?? false,
      description: expense.description,
      amount: expense.amount,
      expenseDate: expense.expenseDate,
      paidByMemberId: toIdString(expense.paidByMemberId),
      paidByName:
        (expense.paidByMemberId as unknown as { userId?: { name?: string } })?.userId?.name ??
        "Unknown",
      distributionMethod: expense.distribution.method,
      status: expense.status,
    })),
    pagination: paginationResult(total, page, limit),
  };
}

export interface MemberTotalsOptions {
  periodKey?: string;
}

/**
 * Live per-member totals for a period: how much each member was charged
 * (by distribution method) vs how much they paid. Independent of whether
 * the monthly cycle has been calculated/finalized.
 */
export async function getMemberTotals(context: OrgContext, options: MemberTotalsOptions = {}) {
  await connectToDatabase();
  const organization = await getOrganization(context);
  const startDay = organization.settings.accountingPeriodStartDay ?? 1;
  const periodKey = options.periodKey ?? currentPeriod(startDay);
  const range = periodKeyToRange(periodKey, startDay);

  const [members, expenses, payments, mealUnits] = await Promise.all([
    OrganizationMemberModel.find({ organizationId: context.organizationId }).populate("userId"),
    ExpenseModel.find({
      organizationId: context.organizationId,
      deletedAt: null,
      status: { $ne: EXPENSE_STATUS.VOIDED },
      expenseDate: { $gte: range.startDate, $lt: range.endDate },
    }),
    PaymentModel.find({
      organizationId: context.organizationId,
      deletedAt: null,
      status: PAYMENT_STATUS.COMPLETED,
      paymentDate: { $gte: range.startDate, $lt: range.endDate },
    }),
    loadMealUnitsForRange(context.organizationId, range.startDate, range.endDate),
  ]);

  // Same active-members rule as the accounting engine.
  const activeMembers = members.filter(
    (member) =>
      member.joinedAt.getTime() < range.endDate.getTime() &&
      (member.leftAt == null || member.leftAt.getTime() > range.startDate.getTime())
  );

  const nameById = new Map(
    activeMembers.map((member) => [
      member._id.toString(),
      (member.userId as unknown as { name?: string })?.name ?? "Unknown",
    ])
  );

  const totals = new Map(
    activeMembers.map((member) => [
      member._id.toString(),
      { foodShare: 0, commonShare: 0, individualShare: 0, totalCharged: 0, expenseCount: 0, totalPaid: 0, paymentCount: 0 },
    ])
  );

  for (const expense of expenses) {
    const eligible = activeMembers.filter(
      (member) =>
        expense.expenseDate.getTime() >= member.joinedAt.getTime() &&
        (member.leftAt == null || expense.expenseDate.getTime() < member.leftAt.getTime())
    );
    if (eligible.length === 0) {
      continue;
    }
    if (
      expense.distribution.method === DISTRIBUTION_METHOD.MEAL_BASED &&
      eligible.every(
        (member) => (mealUnits.result.unitsByMember[member._id.toString()] ?? 0) === 0
      )
    ) {
      continue;
    }
    const result = distributeExpense({
      method: expense.distribution.method,
      amount: expense.amount,
      participants: expense.distribution.participants.map((participant) => ({
        organizationMemberId: participant.organizationMemberId.toString(),
        percent: participant.percent,
        amount: participant.amount,
      })),
      memberIds: eligible.map((member) => member._id.toString()),
      mealUnitsByMember: mealUnits.result.unitsByMember,
    });
    for (const allocation of result.allocations) {
      const row = totals.get(allocation.organizationMemberId);
      if (!row) {
        continue;
      }
      row.expenseCount += 1;
      if (expense.distribution.method === DISTRIBUTION_METHOD.MEAL_BASED) {
        row.foodShare += allocation.amount;
      } else if (expense.distribution.method === DISTRIBUTION_METHOD.INDIVIDUAL) {
        row.individualShare += allocation.amount;
      } else {
        row.commonShare += allocation.amount;
      }
      row.totalCharged += allocation.amount;
    }
  }

  for (const payment of payments) {
    if (payment.type === PAYMENT_TYPE.SETTLEMENT_PAYMENT) {
      continue;
    }
    const row = totals.get(payment.organizationMemberId.toString());
    if (!row) {
      continue;
    }
    row.totalPaid += payment.amount;
    row.paymentCount += 1;
  }

  return {
    periodKey,
    members: Array.from(totals.entries())
      .map(([organizationMemberId, row]) => ({
        organizationMemberId,
        name: nameById.get(organizationMemberId) ?? "Unknown",
        ...row,
        balance: row.totalCharged - row.totalPaid,
      }))
      .sort((a, b) => b.balance - a.balance),
  };
}

export interface HistoricalComparisonOptions {
  periodKey?: string;
}

/** Current vs previous period headline totals and member balances. */
export async function getHistoricalComparison(
  context: OrgContext,
  options: HistoricalComparisonOptions = {}
) {
  await connectToDatabase();
  const organization = await getOrganization(context);
  const startDay = organization.settings.accountingPeriodStartDay ?? 1;
  const periodKey = options.periodKey ?? currentPeriod(startDay);
  const previousKey = previousPeriodKey(periodKey);

  const [current, previous] = await Promise.all([
    periodComparison(context, periodKey),
    periodComparison(context, previousKey),
  ]);

  const delta = (key: keyof typeof current.totals) => current.totals[key] - previous.totals[key];

  return {
    current: { periodKey: current.periodKey, ...current.totals, memberCount: current.memberCount },
    previous: {
      periodKey: previous.periodKey,
      ...previous.totals,
      memberCount: previous.memberCount,
    },
    deltas: {
      totalExpense: delta("totalExpense"),
      foodExpense: delta("foodExpense"),
      commonExpense: delta("commonExpense"),
      individualExpense: delta("individualExpense"),
      totalPayments: delta("totalPayments"),
      totalAdjustments: delta("totalAdjustments"),
      mealEntries: delta("mealEntries"),
      mealUnits: delta("mealUnits"),
    },
  };
}

async function periodComparison(context: OrgContext, periodKey: string) {
  const organization = await getOrganization(context);
  const startDay = organization.settings.accountingPeriodStartDay ?? 1;
  const range = periodKeyToRange(periodKey, startDay);

  const cycle = await MonthlyCycleModel.findOne({
    organizationId: context.organizationId,
    periodKey,
  });

  const [expenseTotals, paymentTotals, adjustmentTotals, mealUnits, mealEntryCount, summaries] =
    await Promise.all([
      ExpenseModel.aggregate([
        {
          $match: {
            organizationId: new Types.ObjectId(context.organizationId),
            deletedAt: null,
            status: { $ne: EXPENSE_STATUS.VOIDED },
            expenseDate: { $gte: range.startDate, $lt: range.endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalExpense: { $sum: "$amount" },
            foodExpense: {
              $sum: { $cond: [{ $eq: ["$distribution.method", DISTRIBUTION_METHOD.MEAL_BASED] }, "$amount", 0] },
            },
            individualExpense: {
              $sum: { $cond: [{ $eq: ["$distribution.method", DISTRIBUTION_METHOD.INDIVIDUAL] }, "$amount", 0] },
            },
          },
        },
      ]),
      PaymentModel.aggregate([
        {
          $match: {
            organizationId: new Types.ObjectId(context.organizationId),
            deletedAt: null,
            status: PAYMENT_STATUS.COMPLETED,
            paymentDate: { $gte: range.startDate, $lt: range.endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: "$amount" },
            settlementPayments: {
              $sum: { $cond: [{ $eq: ["$type", PAYMENT_TYPE.SETTLEMENT_PAYMENT] }, "$amount", 0] },
            },
          },
        },
      ]),
      AdjustmentModel.aggregate([
        {
          $match: {
            organizationId: new Types.ObjectId(context.organizationId),
            deletedAt: null,
            status: { $ne: "VOIDED" },
            adjustmentDate: { $gte: range.startDate, $lt: range.endDate },
          },
        },
        { $group: { _id: null, totalAdjustments: { $sum: "$amount" } } },
      ]),
      loadMealUnitsForRange(context.organizationId, range.startDate, range.endDate),
      MealEntryModel.countDocuments({
        organizationId: context.organizationId,
        date: { $gte: range.startDate, $lt: range.endDate },
      }),
      cycle
        ? MemberMonthlySummaryModel.find({
            organizationId: context.organizationId,
            cycleId: cycle._id,
          }).sort({ "totals.netBalance": -1 })
        : Promise.resolve([]),
    ]);

  const expense = expenseTotals[0] ?? { totalExpense: 0, foodExpense: 0, individualExpense: 0 };
  const payment = paymentTotals[0] ?? { totalPayments: 0, settlementPayments: 0 };
  const adjustment = adjustmentTotals[0] ?? { totalAdjustments: 0 };

  return {
    periodKey,
    totals: {
      totalExpense: expense.totalExpense,
      foodExpense: expense.foodExpense,
      commonExpense: expense.totalExpense - expense.foodExpense - expense.individualExpense,
      individualExpense: expense.individualExpense,
      totalPayments: payment.totalPayments,
      settlementPayments: payment.settlementPayments,
      totalAdjustments: adjustment.totalAdjustments,
      mealEntries: mealEntryCount,
      mealUnits: mealUnits.result.totalUnits,
    },
    memberCount: summaries.length,
    cycle: cycle ?? null,
    balances: summaries.map((row) => ({
      organizationMemberId: row.organizationMemberId,
      netBalance: row.totals.netBalance,
    })),
  };
}
