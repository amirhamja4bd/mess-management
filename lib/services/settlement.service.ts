import {
  PAYMENT_TYPE,
  SETTLEMENT_STATUS,
  SETTLEMENT_TRANSACTION_STATUS,
} from "@/lib/constants/enums";
import { connectToDatabase } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { Types } from "mongoose";
import {
  MemberMonthlySummaryModel,
  MonthlyCycleModel,
  PaymentModel,
  SettlementModel,
  SettlementTransactionModel,
} from "@/lib/models";
import { allocateByWeights } from "@/lib/core/rounding";
import { recordAudit } from "@/lib/services/audit.service";
import { paginationResult, sortClause } from "@/lib/utils/pagination";
import type { CurrentUser } from "@/lib/auth/session";
import type { OrgContext } from "@/lib/authorization";

export interface ListSettlementsOptions {
  page?: number;
  limit?: number;
  cycleId?: string;
  status?: string;
  sortOrder?: "asc" | "desc";
}

async function getSettlementForUpdate(context: OrgContext, settlementId: string) {
  const settlement = await SettlementModel.findOne({
    _id: settlementId,
    organizationId: context.organizationId,
  });
  if (!settlement) {
    throw new NotFoundError("Settlement not found");
  }
  return settlement;
}

/**
 * Generate (or regenerate) settlement transactions for a cycle.
 * Owing members (netBalance > 0) pay receiving members (netBalance < 0);
 * each owing member's debt is split across receivers proportionally to the
 * amounts they are owed. Existing transactions for the cycle are replaced.
 */
export async function generateSettlements(
  context: OrgContext,
  actor: CurrentUser,
  cycleId: string
) {
  await connectToDatabase();
  const cycle = await MonthlyCycleModel.findOne({
    _id: cycleId,
    organizationId: context.organizationId,
  });
  if (!cycle) {
    throw new NotFoundError("Monthly cycle not found");
  }
  if (cycle.status !== "FINALIZED" && cycle.status !== "CLOSED") {
    throw new BusinessRuleError("Settlements can only be generated for finalized or closed cycles");
  }

  const summaries = await MemberMonthlySummaryModel.find({
    organizationId: context.organizationId,
    cycleId: cycle._id,
  });

  const debtors = summaries
    .filter((summary) => summary.totals.netBalance > 0)
    .map((summary) => ({
      memberId: summary.organizationMemberId.toString(),
      amount: summary.totals.netBalance,
    }));
  const creditors = summaries
    .filter((summary) => summary.totals.netBalance < 0)
    .map((summary) => ({
      memberId: summary.organizationMemberId.toString(),
      amount: -summary.totals.netBalance,
    }));

  const totalOwed = debtors.reduce((sum, debtor) => sum + debtor.amount, 0);
  const totalReceivable = creditors.reduce((sum, creditor) => sum + creditor.amount, 0);

  let settlement = await SettlementModel.findOne({
    organizationId: context.organizationId,
    cycleId: cycle._id,
  });
  if (settlement) {
    if (settlement.status === SETTLEMENT_STATUS.COMPLETED) {
      throw new BusinessRuleError("Settlement is already completed and cannot be regenerated");
    }
    settlement.totalOwed = totalOwed;
    settlement.totalReceivable = totalReceivable;
    settlement.generatedByUserId = actor.id as never;
    settlement.generatedAt = new Date();
    await settlement.save();
  } else {
    settlement = await SettlementModel.create({
      organizationId: context.organizationId,
      cycleId: cycle._id,
      status: SETTLEMENT_STATUS.PENDING,
      totalOwed,
      totalReceivable,
      generatedByUserId: actor.id,
      generatedAt: new Date(),
    });
  }

  await SettlementTransactionModel.deleteMany({
    organizationId: context.organizationId,
    settlementId: settlement._id,
  });

  const transactions: Array<{
    organizationId: Types.ObjectId;
    settlementId: Types.ObjectId;
    cycleId: Types.ObjectId;
    fromMemberId: Types.ObjectId;
    toMemberId: Types.ObjectId;
    amount: number;
    status: string;
  }> = [];
  for (const debtor of debtors) {
    if (totalReceivable === 0) {
      continue;
    }
    const amounts = allocateByWeights(debtor.amount, creditors.map((c) => c.amount));
    creditors.forEach((creditor, index) => {
      const amount = amounts[index]!;
      if (amount <= 0) {
        return;
      }
      transactions.push({
        organizationId: new Types.ObjectId(context.organizationId),
        settlementId: new Types.ObjectId(settlement._id.toString()),
        cycleId: new Types.ObjectId(cycle._id.toString()),
        fromMemberId: new Types.ObjectId(debtor.memberId),
        toMemberId: new Types.ObjectId(creditor.memberId),
        amount,
        status: SETTLEMENT_TRANSACTION_STATUS.PENDING,
      });
    });
  }
  if (transactions.length > 0) {
    await SettlementTransactionModel.insertMany(transactions);
  }

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actor.id,
    action: "settlement.generated",
    entityType: "Settlement",
    entityId: settlement._id.toString(),
    changes: { cycleId: cycle._id.toString(), totalOwed, totalReceivable },
  });

  return settlement;
}

export async function listSettlements(context: OrgContext, options: ListSettlementsOptions = {}) {
  await connectToDatabase();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const filter: Record<string, unknown> = { organizationId: context.organizationId };
  if (options.cycleId) {
    filter.cycleId = options.cycleId;
  }
  if (options.status) {
    filter.status = options.status;
  }
  const total = await SettlementModel.countDocuments(filter);
  const items = await SettlementModel.find(filter)
    .sort(sortClause("generatedAt", options.sortOrder))
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("cycleId");
  return { items, pagination: paginationResult(total, page, limit) };
}

export async function getSettlement(context: OrgContext, settlementId: string) {
  await connectToDatabase();
  const settlement = await getSettlementForUpdate(context, settlementId);
  const transactions = await SettlementTransactionModel.find({
    organizationId: context.organizationId,
    settlementId: settlement._id,
  })
    .populate({ path: "fromMemberId", populate: { path: "userId" } })
    .populate({ path: "toMemberId", populate: { path: "userId" } });
  return { settlement: await settlement.populate("cycleId"), transactions };
}

export async function markSettlementTransactionPaid(
  context: OrgContext,
  actor: CurrentUser,
  transactionId: string
) {
  await connectToDatabase();
  const transaction = await SettlementTransactionModel.findOne({
    _id: transactionId,
    organizationId: context.organizationId,
  });
  if (!transaction) {
    throw new NotFoundError("Settlement transaction not found");
  }
  if (transaction.status === SETTLEMENT_TRANSACTION_STATUS.PAID) {
    throw new BusinessRuleError("Settlement transaction is already paid");
  }
  const settlement = await getSettlementForUpdate(context, transaction.settlementId.toString());

  await PaymentModel.create({
    organizationId: context.organizationId,
    organizationMemberId: transaction.fromMemberId,
    amount: transaction.amount,
    paymentDate: new Date(),
    methodId: null,
    methodName: "Settlement",
    type: PAYMENT_TYPE.SETTLEMENT_PAYMENT,
    status: "COMPLETED",
    reference: `Settlement ${settlement._id.toString()}`,
    notes: `Settlement transaction ${transaction._id.toString()}`,
    settlementTransactionId: transaction._id,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
  });

  transaction.status = SETTLEMENT_TRANSACTION_STATUS.PAID;
  transaction.paidAt = new Date();
  transaction.paidByUserId = actor.id as never;
  transaction.confirmedByUserId = actor.id as never;
  await transaction.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actor.id,
    action: "settlement_transaction.paid",
    entityType: "SettlementTransaction",
    entityId: transaction._id.toString(),
    changes: {
      settlementId: transaction.settlementId.toString(),
      fromMemberId: transaction.fromMemberId.toString(),
      toMemberId: transaction.toMemberId.toString(),
      amount: transaction.amount,
    },
  });

  await refreshSettlementStatus(context, settlement._id.toString());
  return transaction;
}

export async function markSettlementTransactionUnpaid(
  context: OrgContext,
  actor: CurrentUser,
  transactionId: string
) {
  await connectToDatabase();
  const transaction = await SettlementTransactionModel.findOne({
    _id: transactionId,
    organizationId: context.organizationId,
  });
  if (!transaction) {
    throw new NotFoundError("Settlement transaction not found");
  }
  if (transaction.status === SETTLEMENT_TRANSACTION_STATUS.PENDING) {
    throw new BusinessRuleError("Settlement transaction is not paid");
  }
  await PaymentModel.deleteMany({
    organizationId: context.organizationId,
    settlementTransactionId: transaction._id,
  });

  transaction.status = SETTLEMENT_TRANSACTION_STATUS.PENDING;
  transaction.paidAt = null;
  transaction.paidByUserId = null;
  transaction.confirmedByUserId = null;
  await transaction.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actor.id,
    action: "settlement_transaction.unpaid",
    entityType: "SettlementTransaction",
    entityId: transaction._id.toString(),
    changes: {
      settlementId: transaction.settlementId.toString(),
      fromMemberId: transaction.fromMemberId.toString(),
      toMemberId: transaction.toMemberId.toString(),
      amount: transaction.amount,
    },
  });

  await refreshSettlementStatus(context, transaction.settlementId.toString());
  return transaction;
}

async function refreshSettlementStatus(context: OrgContext, settlementId: string) {
  const settlement = await getSettlementForUpdate(context, settlementId);
  const [total, paid] = await Promise.all([
    SettlementTransactionModel.countDocuments({
      organizationId: context.organizationId,
      settlementId: settlement._id,
    }),
    SettlementTransactionModel.countDocuments({
      organizationId: context.organizationId,
      settlementId: settlement._id,
      status: SETTLEMENT_TRANSACTION_STATUS.PAID,
    }),
  ]);

  if (total > 0 && paid === total) {
    settlement.status = SETTLEMENT_STATUS.COMPLETED;
    settlement.completedAt = new Date();
  } else if (paid > 0) {
    settlement.status = SETTLEMENT_STATUS.PARTIALLY_PAID;
    settlement.completedAt = null;
  } else {
    settlement.status = SETTLEMENT_STATUS.PENDING;
    settlement.completedAt = null;
  }
  await settlement.save();
  return settlement;
}

export async function settlementSummary(context: OrgContext, settlementId: string) {
  await connectToDatabase();
  const settlement = await getSettlementForUpdate(context, settlementId);
  const transactions = await SettlementTransactionModel.find({
    organizationId: context.organizationId,
    settlementId: settlement._id,
  });

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalPaid = transactions
    .filter((t) => t.status === SETTLEMENT_TRANSACTION_STATUS.PAID)
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    settlement: settlement.populate("cycleId"),
    totals: {
      totalAmount,
      totalPaid,
      totalPending: totalAmount - totalPaid,
      transactionCount: transactions.length,
      paidCount: transactions.filter((t) => t.status === SETTLEMENT_TRANSACTION_STATUS.PAID).length,
    },
  };
}
