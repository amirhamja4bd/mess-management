import { DISTRIBUTION_METHOD, EXPENSE_STATUS } from "@/lib/constants/enums";
import type { DistributionMethod, ExpenseStatus } from "@/lib/constants/enums";
import { connectToDatabase } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import type { QueryFilter } from "mongoose";
import {
  ExpenseCategoryModel,
  ExpenseModel,
  OrganizationMemberModel,
  OrganizationModel,
} from "@/lib/models";
import type { IExpense } from "@/lib/models";
import { periodKeyOf, periodKeyToRange } from "@/lib/core/period";
import { distributeExpense } from "@/lib/core/distribution";
import { loadMealUnitsForRange } from "@/lib/services/meal-units-loader";
import { assertPeriodWritable } from "@/lib/services/period-guard";
import { recordAudit } from "@/lib/services/audit.service";
import { paginationResult, sortClause } from "@/lib/utils/pagination";
import type { CurrentUser } from "@/lib/auth/session";
import type { OrgContext } from "@/lib/authorization";

export interface CreateExpenseInput {
  categoryId: string;
  description: string;
  amount: number;
  expenseDate: Date;
  paidByMemberId: string;
  distribution: {
    method: string;
    participants: Array<{
      organizationMemberId: string;
      percent?: number;
      amount?: number;
    }>;
    details?: string;
  };
  items?: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    total?: number;
    category?: string;
    notes?: string;
  }>;
  status?: string;
  notes?: string;
}

export interface UpdateExpenseInput {
  categoryId?: string;
  description?: string;
  amount?: number;
  expenseDate?: Date;
  paidByMemberId?: string;
  distribution?: CreateExpenseInput["distribution"];
  items?: CreateExpenseInput["items"];
  notes?: string;
}

export interface ListExpensesOptions {
  page?: number;
  limit?: number;
  categoryId?: string;
  paidByMemberId?: string;
  from?: Date | null;
  to?: Date | null;
  status?: string;
  q?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

async function assertCategoryInOrg(context: OrgContext, categoryId: string) {
  const category = await ExpenseCategoryModel.findOne({
    _id: categoryId,
    organizationId: context.organizationId,
    deletedAt: null,
  });
  if (!category) {
    throw new NotFoundError("Expense category not found");
  }
  return category;
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

async function assertParticipantsInOrg(
  context: OrgContext,
  participants: CreateExpenseInput["distribution"]["participants"]
) {
  if (participants.length === 0) {
    return;
  }
  const ids = [...new Set(participants.map((participant) => participant.organizationMemberId))];
  const count = await OrganizationMemberModel.countDocuments({
    _id: { $in: ids },
    organizationId: context.organizationId,
  });
  if (count !== ids.length) {
    throw new NotFoundError("One or more distribution participants are not members of this organization");
  }
}

export async function createExpense(
  context: OrgContext,
  actor: CurrentUser,
  input: CreateExpenseInput
) {
  await connectToDatabase();
  await assertCategoryInOrg(context, input.categoryId);
  await assertMemberInOrg(context, input.paidByMemberId);
  await assertParticipantsInOrg(context, input.distribution.participants);
  await assertPeriodWritable(context.organizationId, input.expenseDate);

  const wantsApproved = input.status === EXPENSE_STATUS.APPROVED || input.status === undefined;
  const canApprove = context.permissions.has("expenses.approve");
  const status = wantsApproved && canApprove ? EXPENSE_STATUS.APPROVED : EXPENSE_STATUS.PENDING;

  const expense = await ExpenseModel.create({
    organizationId: context.organizationId,
    categoryId: input.categoryId,
    description: input.description,
    amount: input.amount,
    expenseDate: input.expenseDate,
    paidByMemberId: input.paidByMemberId,
    distribution: {
      method: input.distribution.method as DistributionMethod,
      participants: input.distribution.participants,
      details: input.distribution.details ?? undefined,
    },
    items: input.items ?? [],
    status: status as ExpenseStatus,
    approvedById: status === EXPENSE_STATUS.APPROVED ? context.memberId : null,
    approvedAt: status === EXPENSE_STATUS.APPROVED ? new Date() : null,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
  });

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actor.id,
    action: "expense.create",
    entityType: "Expense",
    entityId: expense._id.toString(),
    changes: {
      categoryId: input.categoryId,
      description: input.description,
      amount: input.amount,
      expenseDate: input.expenseDate.toISOString(),
      paidByMemberId: input.paidByMemberId,
      distributionMethod: input.distribution.method,
    },
  });

  return getExpense(context, expense._id.toString());
}

export async function listExpenses(context: OrgContext, options: ListExpensesOptions = {}) {
  await connectToDatabase();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;

  const filter: Record<string, unknown> = {
    organizationId: context.organizationId,
    deletedAt: null,
  };
  if (options.categoryId) {
    filter.categoryId = options.categoryId;
  }
  if (options.paidByMemberId) {
    filter.paidByMemberId = options.paidByMemberId;
  }
  if (options.status) {
    filter.status = options.status;
  } else {
    filter.status = { $ne: EXPENSE_STATUS.VOIDED };
  }
  if (options.from || options.to) {
    const dateFilter: { $gte?: Date; $lte?: Date } = {};
    if (options.from) {
      dateFilter.$gte = options.from;
    }
    if (options.to) {
      dateFilter.$lte = options.to;
    }
    filter.expenseDate = dateFilter;
  }
  if (options.q) {
    filter.description = { $regex: options.q, $options: "i" };
  }

  const total = await ExpenseModel.countDocuments(filter);
  const items = await ExpenseModel.find(
    filter as QueryFilter<IExpense>
  )
    .sort(sortClause(options.sortBy, options.sortOrder))
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("categoryId")
    .populate({ path: "paidByMemberId", populate: { path: "userId" } });

  return { items, pagination: paginationResult(total, page, limit) };
}

export async function getExpense(context: OrgContext, expenseId: string) {
  await connectToDatabase();
  const expense = await ExpenseModel.findOne({
    _id: expenseId,
    organizationId: context.organizationId,
    deletedAt: null,
  })
    .populate("categoryId")
    .populate({ path: "paidByMemberId", populate: { path: "userId" } });
  if (!expense) {
    throw new NotFoundError("Expense not found");
  }
  return expense;
}

export async function updateExpense(
  context: OrgContext,
  actor: CurrentUser,
  expenseId: string,
  input: UpdateExpenseInput
) {
  await connectToDatabase();
  const expense = await ExpenseModel.findOne({
    _id: expenseId,
    organizationId: context.organizationId,
    deletedAt: null,
  });
  if (!expense) {
    throw new NotFoundError("Expense not found");
  }
  if (expense.status === EXPENSE_STATUS.VOIDED) {
    throw new BusinessRuleError("Voided expenses cannot be edited");
  }
  if (input.expenseDate) {
    await assertPeriodWritable(context.organizationId, input.expenseDate);
  } else {
    await assertPeriodWritable(context.organizationId, expense.expenseDate);
  }

  if (input.categoryId !== undefined) {
    await assertCategoryInOrg(context, input.categoryId);
    expense.categoryId = input.categoryId as never;
  }
  if (input.description !== undefined) {
    expense.description = input.description;
  }
  if (input.amount !== undefined) {
    expense.amount = input.amount;
  }
  if (input.expenseDate !== undefined) {
    expense.expenseDate = input.expenseDate;
  }
  if (input.paidByMemberId !== undefined) {
    await assertMemberInOrg(context, input.paidByMemberId);
    expense.paidByMemberId = input.paidByMemberId as never;
  }
  if (input.distribution !== undefined) {
    await assertParticipantsInOrg(context, input.distribution.participants);
    expense.distribution = {
      method: input.distribution.method as never,
      participants: input.distribution.participants as never,
      details: input.distribution.details ?? undefined,
    };
  }
  if (input.items !== undefined) {
    expense.items = input.items as never;
  }
  expense.updatedByUserId = actor.id as never;
  await expense.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actor.id,
    action: "expense.update",
    entityType: "Expense",
    entityId: expense._id.toString(),
    changes: {
      categoryId: input.categoryId,
      description: input.description,
      amount: input.amount,
      expenseDate: input.expenseDate?.toISOString(),
      paidByMemberId: input.paidByMemberId,
    },
  });

  return expense.populate("categoryId");
}

export async function voidExpense(
  context: OrgContext,
  actor: CurrentUser,
  expenseId: string,
  reason: string
) {
  await connectToDatabase();
  const expense = await ExpenseModel.findOne({
    _id: expenseId,
    organizationId: context.organizationId,
    deletedAt: null,
  });
  if (!expense) {
    throw new NotFoundError("Expense not found");
  }
  if (expense.status === EXPENSE_STATUS.VOIDED) {
    throw new BusinessRuleError("Expense is already voided");
  }
  await assertPeriodWritable(context.organizationId, expense.expenseDate);

  expense.status = EXPENSE_STATUS.VOIDED;
  expense.voidedAt = new Date();
  expense.voidedById = context.memberId as never;
  expense.voidReason = reason;
  expense.updatedByUserId = actor.id as never;
  await expense.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actor.id,
    action: "expense.void",
    entityType: "Expense",
    entityId: expense._id.toString(),
    changes: { reason },
  });

  return expense;
}

export async function approveExpense(context: OrgContext, actor: CurrentUser, expenseId: string) {
  await connectToDatabase();
  const expense = await ExpenseModel.findOne({
    _id: expenseId,
    organizationId: context.organizationId,
    deletedAt: null,
  });
  if (!expense) {
    throw new NotFoundError("Expense not found");
  }
  if (expense.status === EXPENSE_STATUS.VOIDED) {
    throw new BusinessRuleError("Voided expenses cannot be approved");
  }
  expense.status = EXPENSE_STATUS.APPROVED;
  expense.approvedById = context.memberId as never;
  expense.approvedAt = new Date();
  expense.updatedByUserId = actor.id as never;
  await expense.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actor.id,
    action: "expense.approve",
    entityType: "Expense",
    entityId: expense._id.toString(),
  });

  return expense;
}

/** Preview distribution for an expense without saving anything. */
export async function previewDistribution(
  context: OrgContext,
  input: CreateExpenseInput
) {
  await connectToDatabase();
  await assertCategoryInOrg(context, input.categoryId);
  await assertMemberInOrg(context, input.paidByMemberId);
  await assertParticipantsInOrg(context, input.distribution.participants);

  const organization = await OrganizationModel.findById(context.organizationId);
  if (!organization) {
    throw new NotFoundError("Organization not found");
  }
  const startDay = organization.settings.accountingPeriodStartDay ?? 1;
  const periodKey = periodKeyOf(input.expenseDate, startDay);
  const range = periodKeyToRange(periodKey, startDay);

  const eligible = await OrganizationMemberModel.find({
    organizationId: context.organizationId,
    status: "ACTIVE",
    joinedAt: { $lte: input.expenseDate },
    $or: [{ leftAt: null }, { leftAt: { $gt: input.expenseDate } }],
  });

  let mealUnitsByMember: Record<string, number> | undefined;
  if (input.distribution.method === DISTRIBUTION_METHOD.MEAL_BASED) {
    const { result } = await loadMealUnitsForRange(context.organizationId, range.startDate, range.endDate);
    mealUnitsByMember = result.unitsByMember;
  }

  return distributeExpense({
    method: input.distribution.method as never,
    amount: input.amount,
    participants: input.distribution.participants,
    memberIds: eligible.map((member) => member._id.toString()),
    mealUnitsByMember,
  });
}
