import { MEAL_ENTRY_STATUS } from "@/lib/constants/enums";
import type { MealEntryStatus } from "@/lib/constants/enums";
import { connectToDatabase } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { MealEntryModel, MealTypeModel, OrganizationMemberModel } from "@/lib/models";
import { assertPeriodWritable } from "@/lib/services/period-guard";
import type { CurrentUser } from "@/lib/auth/session";
import type { OrgContext } from "@/lib/authorization";

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

async function assertActiveMealType(context: OrgContext, mealTypeId: string) {
  const mealType = await MealTypeModel.findOne({
    _id: mealTypeId,
    organizationId: context.organizationId,
    deletedAt: null,
    status: "ACTIVE",
  });
  if (!mealType) {
    throw new NotFoundError("Meal type not found or not active");
  }
  return mealType;
}

export interface RecordMealEntryInput {
  organizationMemberId: string;
  date: Date;
  mealTypeId: string;
  status: string;
  overrideReason?: string;
  notes?: string;
}

export async function recordMealEntry(
  context: OrgContext,
  actor: CurrentUser,
  input: RecordMealEntryInput
) {
  await connectToDatabase();
  await assertMemberInOrg(context, input.organizationMemberId);
  await assertActiveMealType(context, input.mealTypeId);
  await assertPeriodWritable(context.organizationId, input.date);

  const entry = await MealEntryModel.findOneAndUpdate(
    {
      organizationId: context.organizationId,
      organizationMemberId: input.organizationMemberId,
      date: input.date,
      mealTypeId: input.mealTypeId,
    },
    {
      $set: {
        status: input.status,
        overrideReason: input.overrideReason ?? null,
        notes: input.notes ?? null,
        updatedByUserId: actor.id,
      },
      $setOnInsert: {
        organizationId: context.organizationId,
        organizationMemberId: input.organizationMemberId,
        date: input.date,
        mealTypeId: input.mealTypeId,
        createdByUserId: actor.id,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return entry;
}

export interface BulkRecordInput {
  date: Date;
  mealTypeId: string;
  organizationMemberIds: string[];
  status: string;
  overrideReason?: string;
}

export async function bulkRecordMealEntries(
  context: OrgContext,
  actor: CurrentUser,
  input: BulkRecordInput
) {
  await connectToDatabase();
  await assertActiveMealType(context, input.mealTypeId);
  await assertPeriodWritable(context.organizationId, input.date);

  const members = await OrganizationMemberModel.find({
    _id: { $in: input.organizationMemberIds },
    organizationId: context.organizationId,
  });
  if (members.length !== new Set(input.organizationMemberIds).size) {
    throw new NotFoundError("One or more members were not found in this organization");
  }

  const operations = input.organizationMemberIds.map((memberId) => ({
    updateOne: {
      filter: {
        organizationId: context.organizationId,
        organizationMemberId: memberId,
        date: input.date,
        mealTypeId: input.mealTypeId,
      },
      update: {
        $set: {
          status: input.status as MealEntryStatus,
          overrideReason: input.overrideReason ?? null,
          updatedByUserId: actor.id,
        },
        $setOnInsert: {
          organizationId: context.organizationId,
          organizationMemberId: memberId,
          date: input.date,
          mealTypeId: input.mealTypeId,
          createdByUserId: actor.id,
        },
      },
      upsert: true,
    },
  }));

  await MealEntryModel.bulkWrite(operations as never);
  return { updated: operations.length };
}

export async function markAbsent(
  context: OrgContext,
  actor: CurrentUser,
  input: BulkRecordInput
) {
  return bulkRecordMealEntries(context, actor, {
    ...input,
    status: MEAL_ENTRY_STATUS.NOT_CONSUMED,
  });
}

export interface ManualAdjustmentInput {
  organizationMemberId: string;
  date: Date;
  mealTypeId: string;
  status: string;
  reason: string;
}

export async function manualMealAdjustment(
  context: OrgContext,
  actor: CurrentUser,
  input: ManualAdjustmentInput
) {
  await connectToDatabase();
  await assertMemberInOrg(context, input.organizationMemberId);
  await assertActiveMealType(context, input.mealTypeId);
  await assertPeriodWritable(context.organizationId, input.date);

  const entry = await MealEntryModel.findOneAndUpdate(
    {
      organizationId: context.organizationId,
      organizationMemberId: input.organizationMemberId,
      date: input.date,
      mealTypeId: input.mealTypeId,
    },
    {
      $set: {
        status: input.status,
        isManualAdjustment: true,
        overrideReason: input.reason,
        updatedByUserId: actor.id,
      },
      $setOnInsert: {
        organizationId: context.organizationId,
        organizationMemberId: input.organizationMemberId,
        date: input.date,
        mealTypeId: input.mealTypeId,
        createdByUserId: actor.id,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return entry;
}

export interface UpdateMealEntryInput {
  status?: string;
  overrideReason?: string | null;
  notes?: string | null;
}

export async function updateMealEntry(
  context: OrgContext,
  actor: CurrentUser,
  entryId: string,
  input: UpdateMealEntryInput
) {
  await connectToDatabase();
  const entry = await MealEntryModel.findOne({
    _id: entryId,
    organizationId: context.organizationId,
  });
  if (!entry) {
    throw new NotFoundError("Meal entry not found");
  }
  await assertPeriodWritable(context.organizationId, entry.date);

  if (input.status !== undefined) {
    entry.status = input.status as MealEntryStatus;
  }
  if (input.overrideReason !== undefined) {
    entry.overrideReason = input.overrideReason ?? undefined;
  }
  if (input.notes !== undefined) {
    entry.notes = input.notes ?? undefined;
  }
  entry.updatedByUserId = actor.id as never;
  await entry.save();
  return entry;
}

export async function voidMealEntry(
  context: OrgContext,
  actor: CurrentUser,
  entryId: string,
  reason: string
) {
  await connectToDatabase();
  const entry = await MealEntryModel.findOne({
    _id: entryId,
    organizationId: context.organizationId,
  });
  if (!entry) {
    throw new NotFoundError("Meal entry not found");
  }
  await assertPeriodWritable(context.organizationId, entry.date);

  entry.status = MEAL_ENTRY_STATUS.CANCELLED;
  entry.overrideReason = reason;
  entry.updatedByUserId = actor.id as never;
  await entry.save();
  return entry;
}

export interface ListMealEntriesOptions {
  date?: Date;
  from?: Date | null;
  to?: Date | null;
  mealTypeId?: string;
  organizationMemberId?: string;
}

export async function listMealEntries(context: OrgContext, options: ListMealEntriesOptions = {}) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { organizationId: context.organizationId };
  if (options.date) {
    const start = new Date(Date.UTC(options.date.getUTCFullYear(), options.date.getUTCMonth(), options.date.getUTCDate()));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    filter.date = { $gte: start, $lt: end };
  } else if (options.from || options.to) {
    const dateFilter: { $gte?: Date; $lte?: Date } = {};
    if (options.from) {
      dateFilter.$gte = options.from;
    }
    if (options.to) {
      dateFilter.$lte = options.to;
    }
    filter.date = dateFilter;
  }
  if (options.mealTypeId) {
    filter.mealTypeId = options.mealTypeId;
  }
  if (options.organizationMemberId) {
    filter.organizationMemberId = options.organizationMemberId;
  }

  return MealEntryModel.find(filter)
    .populate({ path: "organizationMemberId", populate: { path: "userId" } })
    .populate("mealTypeId")
    .sort({ date: 1, mealTypeId: 1 });
}

export async function getMealEntry(context: OrgContext, entryId: string) {
  await connectToDatabase();
  const entry = await MealEntryModel.findOne({
    _id: entryId,
    organizationId: context.organizationId,
  })
    .populate({ path: "organizationMemberId", populate: { path: "userId" } })
    .populate("mealTypeId");
  if (!entry) {
    throw new NotFoundError("Meal entry not found");
  }
  return entry;
}

export function assertEntryStatus(value: string): void {
  if (!Object.values(MEAL_ENTRY_STATUS).includes(value as never)) {
    throw new ValidationError(`Invalid meal entry status: ${value}`);
  }
}
