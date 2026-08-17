import { ok } from "@/lib/api-response";
import { parseBody, parseQuery } from "@/lib/api/helpers";
import { listMealDayStatusesQuerySchema } from "@/lib/api/schemas";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import type { MealDayStatus } from "@/lib/constants/enums";
import { listDayStatuses, setDayStatus } from "@/lib/services/meal-day-status.service";
import { setMealDayStatusSchema } from "@/lib/schemas";

export const GET = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.MEALS_VIEW);
  const query = await parseQuery(request, listMealDayStatusesQuerySchema);
  return ok(await listDayStatuses(context, query));
});

export const POST = withOrgHandler(async (request, { context, user }) => {
  requirePermission(context, PERMISSION.MEALS_MANAGE);
  const input = await parseBody(request, setMealDayStatusSchema);
  return ok(
    await setDayStatus(context, user, {
      ...input,
      status: input.status as MealDayStatus,
    })
  );
});
