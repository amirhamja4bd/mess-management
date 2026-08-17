import { ADJUSTMENT_STATUS, ADJUSTMENT_TYPE } from "@/lib/constants/enums";
import type { AdjustmentType } from "@/lib/constants/enums";
import { connectToDatabase } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import type { QueryFilter } from "mongoose";
import { AdjustmentModel, OrganizationMemberModel } from "@/lib/models";
import type { IAdjustment } from "@/lib/models";
import { assertPeriodWritable } from "@/lib/services/period-guard";
import { paginationResult, sortClause } from "@/lib/utils/pagination";
import type { CurrentUser } from "@/lib/auth/session";
import type { OrgContext } from "@/lib/authorization";

export interface CreateAdjustmentInput {
  organizationMemberId: string;
  adjustmentDate: Date;
  type: string;
  amount: number;
  reason: string;
}

export interface UpdateAdjustmentInput {
  adjustmentDate?: Date;
  type?: string;
  amount?: number;
  reason?: string;
}

export interface ListAdjustmentsOptions {
  page?: number;
  limit?: number;
  organizationMemberId?: string;
  from?: Date | null;
  to?: Date | null;
  type?: string;
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

export async function createAdjustment(
  context: OrgContext,
  actor: CurrentUser,
  input: CreateAdjustmentInput
) {
  await connectToDatabase();
  await assertMemberInOrg(context, input.organizationMemberId);
  await assertPeriodWritable(context.organizationId, input.adjustmentDate);

  return AdjustmentModel.create({
    organizationId: context.organizationId,
    organizationMemberId: input.organizationMemberId,
    adjustmentDate: input.adjustmentDate,
    type: input.type as AdjustmentType,
    amount: input.amount,
    reason: input.reason,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
  });
}

export async function listAdjustments(context: OrgContext, options: ListAdjustmentsOptions = {}) {
  await connectToDatabase();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;

  const filter: Record<string, unknown> = {
    organizationId: context.organizationId,
    deletedAt: null,
  };
  if (options.organizationMemberId) {
    filter.organizationMemberId = options.organizationMemberId;
  }
  if (options.type) {
    filter.type = options.type;
  }
  if (options.from || options.to) {
    const dateFilter: { $gte?: Date; $lte?: Date } = {};
    if (options.from) {
      dateFilter.$gte = options.from;
    }
    if (options.to) {
      dateFilter.$lte = options.to;
    }
    filter.adjustmentDate = dateFilter;
  }

  const total = await AdjustmentModel.countDocuments(filter);
  const items = await AdjustmentModel.find(
    filter as QueryFilter<IAdjustment>
  )
    .sort(sortClause(options.sortBy, options.sortOrder))
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({ path: "organizationMemberId", populate: { path: "userId" } });

  return { items, pagination: paginationResult(total, page, limit) };
}

export async function getAdjustment(context: OrgContext, adjustmentId: string) {
  await connectToDatabase();
  const adjustment = await AdjustmentModel.findOne({
    _id: adjustmentId,
    organizationId: context.organizationId,
    deletedAt: null,
  }).populate({ path: "organizationMemberId", populate: { path: "userId" } });
  if (!adjustment) {
    throw new NotFoundError("Adjustment not found");
  }
  return adjustment;
}

export async function updateAdjustment(
  context: OrgContext,
  actor: CurrentUser,
  adjustmentId: string,
  input: UpdateAdjustmentInput
) {
  await connectToDatabase();
  const adjustment = await AdjustmentModel.findOne({
    _id: adjustmentId,
    organizationId: context.organizationId,
    deletedAt: null,
  });
  if (!adjustment) {
    throw new NotFoundError("Adjustment not found");
  }
  const date = input.adjustmentDate ?? adjustment.adjustmentDate;
  await assertPeriodWritable(context.organizationId, date);

  if (input.adjustmentDate !== undefined) {
    adjustment.adjustmentDate = input.adjustmentDate;
  }
  if (input.type !== undefined) {
    adjustment.type = input.type as typeof ADJUSTMENT_TYPE[keyof typeof ADJUSTMENT_TYPE];
  }
  if (input.amount !== undefined) {
    adjustment.amount = input.amount;
  }
  if (input.reason !== undefined) {
    adjustment.reason = input.reason;
  }
  adjustment.updatedByUserId = actor.id as never;
  await adjustment.save();
  return adjustment;
}

export async function voidAdjustment(
  context: OrgContext,
  actor: CurrentUser,
  adjustmentId: string
) {
  await connectToDatabase();
  const adjustment = await AdjustmentModel.findOne({
    _id: adjustmentId,
    organizationId: context.organizationId,
    deletedAt: null,
  });
  if (!adjustment) {
    throw new NotFoundError("Adjustment not found");
  }
  if (adjustment.status === ADJUSTMENT_STATUS.VOIDED) {
    throw new BusinessRuleError("Adjustment is already voided");
  }
  await assertPeriodWritable(context.organizationId, adjustment.adjustmentDate);

  adjustment.status = ADJUSTMENT_STATUS.VOIDED;
  adjustment.voidedAt = new Date();
  adjustment.voidedById = context.memberId as never;
  adjustment.deletedAt = new Date();
  adjustment.updatedByUserId = actor.id as never;
  await adjustment.save();
  return adjustment;
}
