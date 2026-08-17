import {
  EXPENSE_STATUS,
  MEAL_DAY_STATUS,
  MONTHLY_CYCLE_STATUS,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
} from "@/lib/constants/enums";
import { connectToDatabase } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import {
  AdjustmentModel,
  ExpenseCategoryModel,
  ExpenseModel,
  MealConfigModel,
  MealDayStatusModel,
  MealEntryModel,
  MealTypeModel,
  MemberMonthlySummaryModel,
  MonthlyCycleModel,
  OrganizationMemberModel,
  OrganizationModel,
  PaymentMethodModel,
  PaymentModel,
} from "@/lib/models";
import { currentPeriodKey, periodKeyToRange } from "@/lib/core/period";
import { calculateMonthlyAccounting } from "@/lib/core/accounting";
import type {
  AccountingInput,
  AccountingMember,
  AccountingMemberResult,
} from "@/lib/core/accounting";
import type { CancelledMealDayInput, MealEntryInput, MealWeightSlice } from "@/lib/core/meal-units";
import { recordAudit } from "@/lib/services/audit.service";
import { paginationResult, sortClause } from "@/lib/utils/pagination";
import type { CurrentUser } from "@/lib/auth/session";
import type { OrgContext } from "@/lib/authorization";

export interface ListCyclesOptions {
  page?: number;
  limit?: number;
  status?: string;
  sortOrder?: "asc" | "desc";
}

async function getOrganization(context: OrgContext) {
  const organization = await OrganizationModel.findById(context.organizationId);
  if (!organization) {
    throw new NotFoundError("Organization not found");
  }
  return organization;
}

export async function getOrCreateCurrentCycle(context: OrgContext) {
  await connectToDatabase();
  const organization = await getOrganization(context);
  const startDay = organization.settings.accountingPeriodStartDay ?? 1;
  const periodKey = currentPeriodKey(new Date(), startDay);

  let cycle = await MonthlyCycleModel.findOne({
    organizationId: context.organizationId,
    periodKey,
  });
  if (!cycle) {
    const range = periodKeyToRange(periodKey, startDay);
    cycle = await MonthlyCycleModel.create({
      organizationId: context.organizationId,
      periodKey,
      startDate: range.startDate,
      endDate: new Date(range.endDate.getTime() - 1),
      status: MONTHLY_CYCLE_STATUS.OPEN,
    });
  }
  return cycle;
}

export async function listCycles(context: OrgContext, options: ListCyclesOptions = {}) {
  await connectToDatabase();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const filter: Record<string, unknown> = { organizationId: context.organizationId };
  if (options.status) {
    filter.status = options.status;
  }
  const total = await MonthlyCycleModel.countDocuments(filter);
  const items = await MonthlyCycleModel.find(filter)
    .sort(sortClause("periodKey", options.sortOrder))
    .skip((page - 1) * limit)
    .limit(limit);
  return { items, pagination: paginationResult(total, page, limit) };
}

export async function getCycle(context: OrgContext, cycleId: string) {
  await connectToDatabase();
  const cycle = await MonthlyCycleModel.findOne({
    _id: cycleId,
    organizationId: context.organizationId,
  });
  if (!cycle) {
    throw new NotFoundError("Monthly cycle not found");
  }
  return cycle;
}

export async function getCycleByPeriod(context: OrgContext, periodKey: string) {
  await connectToDatabase();
  const cycle = await MonthlyCycleModel.findOne({
    organizationId: context.organizationId,
    periodKey,
  });
  if (!cycle) {
    throw new NotFoundError("Monthly cycle not found");
  }
  return cycle;
}

interface CycleDocuments {
  members: AccountingMember[];
  configSlices: MealWeightSlice[];
  entries: MealEntryInput[];
  cancelledDays: CancelledMealDayInput[];
  expenses: AccountingInput["expenses"];
  payments: AccountingInput["payments"];
  adjustments: AccountingInput["adjustments"];
}

async function loadCycleDocuments(
  context: OrgContext,
  startDate: Date,
  endDate: Date
): Promise<CycleDocuments> {
  const orgMembers = await OrganizationMemberModel.find({
    organizationId: context.organizationId,
  });
  const members: AccountingMember[] = orgMembers.map((member) => ({
    id: member._id.toString(),
    joinedAt: member.joinedAt,
    leftAt: member.leftAt ?? null,
  }));

  const configSlices = await MealConfigModel.find({
    organizationId: context.organizationId,
    effectiveFrom: { $lt: endDate },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gt: startDate } }],
  });
  const slices: MealWeightSlice[] = configSlices.map((slice) => ({
    mealTypeId: slice.mealTypeId.toString(),
    weight: slice.weight,
    effectiveFrom: slice.effectiveFrom,
    effectiveTo: slice.effectiveTo ?? null,
  }));

  const rawEntries = await MealEntryModel.find({
    organizationId: context.organizationId,
    date: { $gte: startDate, $lt: endDate },
  });
  const entries: MealEntryInput[] = rawEntries.map((entry) => ({
    organizationMemberId: entry.organizationMemberId.toString(),
    mealTypeId: entry.mealTypeId.toString(),
    date: entry.date,
    status: entry.status,
  }));

  const rawDayStatuses = await MealDayStatusModel.find({
    organizationId: context.organizationId,
    date: { $gte: startDate, $lt: endDate },
  });
  const cancelledDays: CancelledMealDayInput[] = rawDayStatuses
    .filter(
      (dayStatus) =>
        dayStatus.status === MEAL_DAY_STATUS.CANCELLED ||
        dayStatus.status === MEAL_DAY_STATUS.UNAVAILABLE
    )
    .map((dayStatus) => ({
      date: dayStatus.date,
      mealTypeId: dayStatus.mealTypeId.toString(),
    }));

  const expenses = await ExpenseModel.find({
    organizationId: context.organizationId,
    deletedAt: null,
    status: { $ne: EXPENSE_STATUS.VOIDED },
    expenseDate: { $gte: startDate, $lt: endDate },
  });
  const expenseRows: AccountingInput["expenses"] = expenses.map((expense) => ({
    id: expense._id.toString(),
    amount: expense.amount,
    expenseDate: expense.expenseDate,
    paidByMemberId: expense.paidByMemberId.toString(),
    method: expense.distribution.method,
    participants: expense.distribution.participants.map((participant) => ({
      organizationMemberId: participant.organizationMemberId.toString(),
      percent: participant.percent,
      amount: participant.amount,
    })),
  }));

  const payments = await PaymentModel.find({
    organizationId: context.organizationId,
    deletedAt: null,
    status: PAYMENT_STATUS.COMPLETED,
    paymentDate: { $gte: startDate, $lt: endDate },
  });
  const paymentRows: AccountingInput["payments"] = payments.map((payment) => ({
    memberId: payment.organizationMemberId.toString(),
    amount: payment.amount,
    type: payment.type,
    status: payment.status,
  }));

  const adjustments = await AdjustmentModel.find({
    organizationId: context.organizationId,
    deletedAt: null,
    status: { $ne: "VOIDED" },
    adjustmentDate: { $gte: startDate, $lt: endDate },
  });
  const adjustmentRows: AccountingInput["adjustments"] = adjustments.map((adjustment) => ({
    memberId: adjustment.organizationMemberId.toString(),
    amount: adjustment.amount,
    type: adjustment.type,
  }));

  return {
    members,
    configSlices: slices,
    entries,
    cancelledDays,
    expenses: expenseRows,
    payments: paymentRows,
    adjustments: adjustmentRows,
  };
}

/** Opening balances = previous FINALIZED/CLOSED cycle's per-member net balance. */
async function loadOpeningBalances(context: OrgContext, periodKey: string) {
  const previousCycles = await MonthlyCycleModel.find({
    organizationId: context.organizationId,
    periodKey: { $lt: periodKey },
    status: { $in: [MONTHLY_CYCLE_STATUS.FINALIZED, MONTHLY_CYCLE_STATUS.CLOSED] },
  })
    .sort({ periodKey: -1 })
    .limit(1);
  const previousCycle = previousCycles[0];
  if (!previousCycle) {
    return undefined;
  }
  const summaries = await MemberMonthlySummaryModel.find({
    organizationId: context.organizationId,
    cycleId: previousCycle._id,
  });
  const openingBalances: Record<string, number> = {};
  for (const summary of summaries) {
    openingBalances[summary.organizationMemberId.toString()] = summary.totals.netBalance;
  }
  return openingBalances;
}

export async function calculateCycle(context: OrgContext, cycleId: string) {
  await connectToDatabase();
  const cycle = await getCycle(context, cycleId);
  if (cycle.status === MONTHLY_CYCLE_STATUS.CLOSED) {
    throw new BusinessRuleError("Closed cycles cannot be recalculated");
  }

  const organization = await getOrganization(context);
  const startDay = organization.settings.accountingPeriodStartDay ?? 1;
  const range = periodKeyToRange(cycle.periodKey, startDay);
  const startDate = range.startDate;
  const endDate = new Date(range.endDate.getTime() - 1);

  cycle.status = MONTHLY_CYCLE_STATUS.CALCULATING;
  cycle.startDate = startDate;
  cycle.endDate = endDate;
  await cycle.save();

  const documents = await loadCycleDocuments(context, startDate, endDate);
  const openingBalances = await loadOpeningBalances(context, cycle.periodKey);

  const result = calculateMonthlyAccounting({
    periodKey: cycle.periodKey,
    startDate,
    endDate,
    members: documents.members,
    mealConfigSlices: documents.configSlices,
    mealEntries: documents.entries,
    cancelledMealDays: documents.cancelledDays,
    expenses: documents.expenses,
    payments: documents.payments,
    adjustments: documents.adjustments,
    openingBalances,
  });

  // --- persist per-member summaries --------------------------------------
  const mealTypes = await MealTypeModel.find({ organizationId: context.organizationId });
  const mealTypeNames = new Map(
    mealTypes.map((mealType) => [mealType._id.toString(), mealType.name])
  );

  await MemberMonthlySummaryModel.deleteMany({
    organizationId: context.organizationId,
    cycleId: cycle._id,
  });

  const paymentStatsByMember = buildPaymentStats(result.members, documents.payments);

  const summaryDocs = result.members.map((member) => {
    const mealStats =
      result.meals.byMember[member.memberId] === undefined
        ? []
        : Object.values(result.meals.byMember[member.memberId]!).map((stat) => ({
            mealTypeId: stat.mealTypeId,
            name: mealTypeNames.get(stat.mealTypeId) ?? stat.mealTypeId,
            weight: stat.units > 0 && stat.count > 0 ? Math.round(stat.units / stat.count) : 0,
            count: stat.count,
            units: stat.units,
          }));
    const paymentStats = paymentStatsByMember.get(member.memberId) ?? {
      totalContribution: 0,
      totalAdvance: 0,
      totalSettlementPaid: 0,
      totalRefund: 0,
    };
    return {
      organizationId: context.organizationId,
      cycleId: cycle._id,
      organizationMemberId: member.memberId,
      totals: {
        foodShare: member.foodShare,
        commonShare: member.commonShare,
        individualShare: member.individualShare,
        otherLiability: 0,
        totalLiability: member.totalLiability,
        totalPaid: member.totalPaid,
        totalCredit: member.totalCredit,
        applicableAdvance: member.applicableAdvance,
        netBalance: member.netBalance,
        roundingAdjustment: member.roundingAdjustment,
      },
      mealStats,
      paymentStats,
      snapshot: {
        mealWeightMode: "PERCENTAGE_OF_100",
        capturedAt: new Date(),
      },
      status: cycle.status,
    };
  });
  if (summaryDocs.length > 0) {
    await MemberMonthlySummaryModel.insertMany(summaryDocs);
  }

  // --- persist cycle totals + snapshot -----------------------------------
  cycle.totals = {
    totalExpense: result.totals.totalExpense,
    foodExpense: result.totals.foodExpense,
    commonExpense: result.totals.commonExpense,
    individualExpense: result.totals.individualExpense,
    totalPayments: result.totals.totalPayments,
    totalAdjustments: result.totals.totalAdjustments,
    totalSettlement: result.totals.totalSettlement,
    roundingAdjustment: result.totals.roundingAdjustment,
  };
  cycle.snapshot = await buildCycleSnapshot(
    context,
    documents,
    mealTypeNames,
    organization.settings as unknown as Record<string, unknown>
  );
  cycle.calculatedAt = new Date();
  cycle.status = MONTHLY_CYCLE_STATUS.OPEN;
  await cycle.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: context.member.userId.toString(),
    action: "cycle.calculated",
    entityType: "MonthlyCycle",
    entityId: cycle._id.toString(),
    changes: { totals: cycle.totals },
  });

  return {
    cycle,
    result: {
      periodKey: cycle.periodKey,
      members: result.members,
      totals: { ...result.totals, totalMealUnits: result.meals.totalUnits },
      balanceCheck: result.balanceCheck,
      unresolved: result.meals.unresolved,
    },
  };
}

function buildPaymentStats(
  members: AccountingMemberResult[],
  payments: AccountingInput["payments"]
) {
  const stats = new Map<
    string,
    { totalContribution: number; totalAdvance: number; totalSettlementPaid: number; totalRefund: number }
  >();
  for (const member of members) {
    stats.set(member.memberId, {
      totalContribution: 0,
      totalAdvance: 0,
      totalSettlementPaid: 0,
      totalRefund: 0,
    });
  }
  for (const payment of payments) {
    const stat = stats.get(payment.memberId);
    if (!stat) {
      continue;
    }
    if (payment.type === PAYMENT_TYPE.SETTLEMENT_PAYMENT) {
      stat.totalSettlementPaid += payment.amount;
    } else if (payment.type === PAYMENT_TYPE.REFUND) {
      stat.totalRefund += payment.amount;
    } else if (payment.type === PAYMENT_TYPE.ADVANCE) {
      stat.totalAdvance += payment.amount;
      stat.totalContribution += payment.amount;
    } else {
      stat.totalContribution += payment.amount;
    }
  }
  return stats;
}

async function buildCycleSnapshot(
  context: OrgContext,
  documents: CycleDocuments,
  mealTypeNames: Map<string, string>,
  organizationSettings: Record<string, unknown>
) {
  const [categories, paymentMethods, orgMembers] = await Promise.all([
    ExpenseCategoryModel.find({ organizationId: context.organizationId }),
    PaymentMethodModel.find({ organizationId: context.organizationId }),
    OrganizationMemberModel.find({ organizationId: context.organizationId }).populate("userId"),
  ]);

  return {
    organizationSettings,
    mealConfig: documents.configSlices.map((slice) => ({
      mealTypeId: slice.mealTypeId,
      name: mealTypeNames.get(slice.mealTypeId) ?? slice.mealTypeId,
      weight: slice.weight,
      effectiveFrom: slice.effectiveFrom,
      effectiveTo: slice.effectiveTo,
    })),
    categories: categories.map((category) => ({
      categoryId: category._id.toString(),
      name: category.name,
      isFood: category.isFood,
    })),
    paymentMethods: paymentMethods.map((method) => ({
      methodId: method._id.toString(),
      name: method.name,
    })),
    members: orgMembers.map((member) => ({
      memberId: member._id.toString(),
      userId: (member.userId as unknown as { _id?: string })?._id?.toString?.() ?? "",
      name: (member.userId as unknown as { name?: string })?.name ?? "Unknown",
      joinedAt: member.joinedAt,
      leftAt: member.leftAt ?? null,
    })),
    capturedAt: new Date(),
  };
}

export async function finalizeCycle(
  context: OrgContext,
  actor: CurrentUser,
  cycleId: string
) {
  await connectToDatabase();
  const cycle = await getCycle(context, cycleId);
  if (cycle.status === MONTHLY_CYCLE_STATUS.CLOSED) {
    throw new BusinessRuleError("Closed cycles cannot be finalized");
  }
  cycle.status = MONTHLY_CYCLE_STATUS.FINALIZED;
  cycle.finalizedAt = new Date();
  cycle.finalizedByUserId = actor.id as never;
  await cycle.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actor.id,
    action: "cycle.finalized",
    entityType: "MonthlyCycle",
    entityId: cycle._id.toString(),
    changes: { periodKey: cycle.periodKey, status: cycle.status },
  });

  return cycle;
}

export async function closeCycle(
  context: OrgContext,
  actor: CurrentUser,
  cycleId: string
) {
  await connectToDatabase();
  const cycle = await getCycle(context, cycleId);
  if (cycle.status === MONTHLY_CYCLE_STATUS.CLOSED) {
    throw new BusinessRuleError("Cycle is already closed");
  }
  if (cycle.status !== MONTHLY_CYCLE_STATUS.FINALIZED) {
    throw new BusinessRuleError("Only finalized cycles can be closed");
  }
  cycle.status = MONTHLY_CYCLE_STATUS.CLOSED;
  cycle.closedAt = new Date();
  cycle.closedByUserId = actor.id as never;
  await cycle.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actor.id,
    action: "cycle.closed",
    entityType: "MonthlyCycle",
    entityId: cycle._id.toString(),
    changes: { periodKey: cycle.periodKey, status: cycle.status },
  });

  return cycle;
}
