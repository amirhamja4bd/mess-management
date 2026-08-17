import { MEAL_DAY_STATUS } from "@/lib/constants/enums";
import type { MealDayStatus } from "@/lib/constants/enums";
import { connectToDatabase } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import type { QueryFilter } from "mongoose";
import { MealDayStatusModel } from "@/lib/models";
import type { IMealDayStatus } from "@/lib/models";
import type { CurrentUser } from "@/lib/auth/session";
import type { OrgContext } from "@/lib/authorization";

export interface SetDayStatusInput {
  date: Date;
  mealTypeId: string;
  status: MealDayStatus;
  reason?: string;
}

export async function setDayStatus(
  context: OrgContext,
  actor: CurrentUser,
  input: SetDayStatusInput
) {
  await connectToDatabase();
  return MealDayStatusModel.findOneAndUpdate(
    {
      organizationId: context.organizationId,
      date: input.date,
      mealTypeId: input.mealTypeId,
    },
    {
      $set: {
        status: input.status,
        reason: input.reason ?? null,
        setByUserId: actor.id,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function clearDayStatus(context: OrgContext, date: Date, mealTypeId: string) {
  await connectToDatabase();
  const result = await MealDayStatusModel.findOneAndDelete({
    organizationId: context.organizationId,
    date,
    mealTypeId,
  });
  if (!result) {
    throw new NotFoundError("No day status set for this meal");
  }
  return result;
}

export interface ListDayStatusOptions {
  from?: Date | null;
  to?: Date | null;
}

export async function listDayStatuses(context: OrgContext, options: ListDayStatusOptions = {}) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { organizationId: context.organizationId };
  if (options.from || options.to) {
    const dateFilter: { $gte?: Date; $lte?: Date } = {};
    if (options.from) {
      dateFilter.$gte = options.from;
    }
    if (options.to) {
      dateFilter.$lte = options.to;
    }
    filter.date = dateFilter;
  }
  return MealDayStatusModel.find(filter as QueryFilter<IMealDayStatus>)
    .populate("mealTypeId")
    .sort({ date: 1, mealTypeId: 1 });
}

export { MEAL_DAY_STATUS };
