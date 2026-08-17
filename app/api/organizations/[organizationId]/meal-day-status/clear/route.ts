import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { clearDayStatus } from "@/lib/services/meal-day-status.service";
import { clearMealDayStatusSchema } from "@/lib/schemas";

export const POST = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.MEALS_MANAGE);
  const input = await parseBody(request, clearMealDayStatusSchema);
  return ok(await clearDayStatus(context, input.date, input.mealTypeId));
});
