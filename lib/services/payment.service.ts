import { PAYMENT_STATUS, PAYMENT_TYPE } from "@/lib/constants/enums";
import type { PaymentType } from "@/lib/constants/enums";
import { connectToDatabase } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { Types } from "mongoose";
import type { QueryFilter } from "mongoose";
import { OrganizationMemberModel, PaymentMethodModel, PaymentModel } from "@/lib/models";
import type { IPayment } from "@/lib/models";
import { assertPeriodWritable } from "@/lib/services/period-guard";
import { recordAudit } from "@/lib/services/audit.service";
import { paginationResult, sortClause } from "@/lib/utils/pagination";
import type { CurrentUser } from "@/lib/auth/session";
import type { OrgContext } from "@/lib/authorization";

export interface CreatePaymentInput {
  organizationMemberId: string;
  amount: number;
  paymentDate: Date;
  methodId?: string | null;
  methodName?: string;
  type: string;
  reference?: string;
  notes?: string;
}

export interface UpdatePaymentInput {
  amount?: number;
  paymentDate?: Date;
  methodId?: string | null;
  methodName?: string;
  reference?: string | null;
  notes?: string | null;
  status?: string;
}

export interface ListPaymentsOptions {
  page?: number;
  limit?: number;
  organizationMemberId?: string;
  from?: Date | null;
  to?: Date | null;
  type?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

async function assertMemberInOrg(context: OrgContext, memberId: string) {
  const member = await OrganizationMemberModel.findOne({
    _id: memberId,
    organizationId: context.organizationId,
  });
  if (!member) {
    throw new NotFoundError("Member not found in this organization");
  }
  return member;
}

async function resolveMethod(context: OrgContext, methodId?: string | null, methodName?: string) {
  if (methodId) {
    const method = await PaymentMethodModel.findOne({
      _id: methodId,
      organizationId: context.organizationId,
    });
    if (!method) {
      throw new NotFoundError("Payment method not found");
    }
    return { methodId: method._id.toString(), methodName: method.name };
  }
  return { methodId: null, methodName: methodName ?? "Other" };
}

export async function createPayment(
  context: OrgContext,
  actor: CurrentUser,
  input: CreatePaymentInput
) {
  await connectToDatabase();
  await assertMemberInOrg(context, input.organizationMemberId);
  await assertPeriodWritable(context.organizationId, input.paymentDate);

  const { methodId, methodName } = await resolveMethod(context, input.methodId, input.methodName);

  const payment = await PaymentModel.create({
    organizationId: context.organizationId,
    organizationMemberId: input.organizationMemberId,
    amount: input.amount,
    paymentDate: input.paymentDate,
    methodId,
    methodName,
    type: input.type as PaymentType,
    status: PAYMENT_STATUS.COMPLETED,
    reference: input.reference ?? undefined,
    notes: input.notes ?? undefined,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
  });

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actor.id,
    action: "payment.create",
    entityType: "Payment",
    entityId: payment._id.toString(),
    changes: {
      organizationMemberId: input.organizationMemberId,
      amount: input.amount,
      paymentDate: input.paymentDate.toISOString(),
      type: input.type,
      methodId,
    },
  });

  return payment;
}

export async function listPayments(context: OrgContext, options: ListPaymentsOptions = {}) {
  await connectToDatabase();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;

  const filter: Record<string, unknown> = {
    organizationId: context.organizationId,
    deletedAt: null,
    status: { $ne: PAYMENT_STATUS.VOIDED },
  };
  if (options.organizationMemberId) {
    filter.organizationMemberId = options.organizationMemberId;
  }
  if (options.type) {
    filter.type = options.type;
  }
  if (options.status) {
    filter.status = options.status;
  }
  if (options.from || options.to) {
    const dateFilter: { $gte?: Date; $lte?: Date } = {};
    if (options.from) {
      dateFilter.$gte = options.from;
    }
    if (options.to) {
      dateFilter.$lte = options.to;
    }
    filter.paymentDate = dateFilter;
  }

  const total = await PaymentModel.countDocuments(filter);
  const items = await PaymentModel.find(    filter as QueryFilter<IPayment>)
    .sort(sortClause(options.sortBy, options.sortOrder))
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({ path: "organizationMemberId", populate: { path: "userId" } });

  return { items, pagination: paginationResult(total, page, limit) };
}

export async function getPayment(context: OrgContext, paymentId: string) {
  await connectToDatabase();
  const payment = await PaymentModel.findOne({
    _id: paymentId,
    organizationId: context.organizationId,
    deletedAt: null,
  }).populate({ path: "organizationMemberId", populate: { path: "userId" } });
  if (!payment) {
    throw new NotFoundError("Payment not found");
  }
  return payment;
}

export async function updatePayment(
  context: OrgContext,
  actor: CurrentUser,
  paymentId: string,
  input: UpdatePaymentInput
) {
  await connectToDatabase();
  const payment = await PaymentModel.findOne({
    _id: paymentId,
    organizationId: context.organizationId,
    deletedAt: null,
  });
  if (!payment) {
    throw new NotFoundError("Payment not found");
  }
  if (payment.status === PAYMENT_STATUS.VOIDED) {
    throw new BusinessRuleError("Voided payments cannot be edited");
  }
  if (payment.type === PAYMENT_TYPE.SETTLEMENT_PAYMENT) {
    throw new BusinessRuleError("Settlement payments are managed through the settlement flow");
  }
  const date = input.paymentDate ?? payment.paymentDate;
  await assertPeriodWritable(context.organizationId, date);

  if (input.amount !== undefined) {
    payment.amount = input.amount;
  }
  if (input.paymentDate !== undefined) {
    payment.paymentDate = input.paymentDate;
  }
  const resolvedMethod: { methodId: string | null; methodName: string } = {
    methodId: payment.methodId?.toString() ?? null,
    methodName: payment.methodName ?? "Other",
  };
  if (input.methodId !== undefined || input.methodName !== undefined) {
    const resolved = await resolveMethod(context, input.methodId, input.methodName);
    resolvedMethod.methodId = resolved.methodId;
    resolvedMethod.methodName = resolved.methodName;
    payment.methodId = resolved.methodId as never;
    payment.methodName = resolved.methodName;
  }
  if (input.reference !== undefined) {
    payment.reference = input.reference ?? undefined;
  }
  if (input.notes !== undefined) {
    payment.notes = input.notes ?? undefined;
  }
  if (input.status !== undefined) {
    payment.status = input.status as typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
  }
  payment.updatedByUserId = actor.id as never;
  await payment.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actor.id,
    action: "payment.update",
    entityType: "Payment",
    entityId: payment._id.toString(),
    changes: {
      amount: input.amount,
      paymentDate: input.paymentDate?.toISOString(),
      methodId: resolvedMethod.methodId,
      methodName: resolvedMethod.methodName,
      reference: input.reference,
    },
  });

  return payment;
}

export async function voidPayment(
  context: OrgContext,
  actor: CurrentUser,
  paymentId: string,
  reason: string
) {
  await connectToDatabase();
  const payment = await PaymentModel.findOne({
    _id: paymentId,
    organizationId: context.organizationId,
    deletedAt: null,
  });
  if (!payment) {
    throw new NotFoundError("Payment not found");
  }
  if (payment.status === PAYMENT_STATUS.VOIDED) {
    throw new BusinessRuleError("Payment is already voided");
  }
  if (payment.type === PAYMENT_TYPE.SETTLEMENT_PAYMENT) {
    throw new BusinessRuleError("Settlement payments are managed through the settlement flow");
  }
  await assertPeriodWritable(context.organizationId, payment.paymentDate);

  payment.status = PAYMENT_STATUS.VOIDED;
  payment.voidedAt = new Date();
  payment.voidedById = context.memberId as never;
  payment.voidReason = reason;
  payment.updatedByUserId = actor.id as never;
  await payment.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actor.id,
    action: "payment.void",
    entityType: "Payment",
    entityId: payment._id.toString(),
    changes: { reason },
  });

  return payment;
}

export interface ContributionSummaryRow {
  organizationMemberId: string;
  name: string;
  totalContribution: number;
  totalAdvance: number;
  totalSettlementPaid: number;
  totalRefund: number;
  paymentCount: number;
}

export async function memberContributionSummary(
  context: OrgContext,
  memberId?: string
): Promise<ContributionSummaryRow[]> {
  await connectToDatabase();
  const match: Record<string, unknown> = {
    organizationId: new Types.ObjectId(context.organizationId),
    status: PAYMENT_STATUS.COMPLETED,
    deletedAt: null,
  };
  if (memberId) {
    match.organizationMemberId = memberId;
  }

  const rows = await PaymentModel.aggregate<{
    _id: string;
    totalContribution: number;
    totalAdvance: number;
    totalSettlementPaid: number;
    totalRefund: number;
    paymentCount: number;
  }>([
    { $match: match },
    {
      $group: {
        _id: "$organizationMemberId",
        totalContribution: {
          $sum: { $cond: [{ $in: ["$type", ["CONTRIBUTION", "CREDIT"]] }, "$amount", 0] },
        },
        totalAdvance: { $sum: { $cond: [{ $eq: ["$type", "ADVANCE"] }, "$amount", 0] } },
        totalSettlementPaid: {
          $sum: { $cond: [{ $eq: ["$type", "SETTLEMENT_PAYMENT"] }, "$amount", 0] },
        },
        totalRefund: { $sum: { $cond: [{ $eq: ["$type", "REFUND"] }, "$amount", 0] } },
        paymentCount: { $sum: 1 },
      },
    },
  ]);

  const members = await OrganizationMemberModel.find({
    _id: { $in: rows.map((row) => row._id) },
    organizationId: context.organizationId,
  }).populate("userId");

  const nameById = new Map(
    members.map((member) => [
      member._id.toString(),
      (member.userId as unknown as { name?: string })?.name ?? "Unknown",
    ])
  );

  return rows.map((row) => ({
    organizationMemberId: row._id.toString(),
    name: nameById.get(row._id.toString()) ?? "Unknown",
    totalContribution: row.totalContribution,
    totalAdvance: row.totalAdvance,
    totalSettlementPaid: row.totalSettlementPaid,
    totalRefund: row.totalRefund,
    paymentCount: row.paymentCount,
  }));
}
