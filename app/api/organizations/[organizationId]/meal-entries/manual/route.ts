import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { manualMealAdjustment } from "@/lib/services/meal-entry.service";
import { manualMealAdjustmentSchema } from "@/lib/schemas";

export const POST = withOrgHandler(async (request, { context, user }) => {
  requirePermission(context, PERMISSION.MEALS_EDIT);
  const input = await parseBody(request, manualMealAdjustmentSchema);
  return ok(await manualMealAdjustment(context, user, input));
});
