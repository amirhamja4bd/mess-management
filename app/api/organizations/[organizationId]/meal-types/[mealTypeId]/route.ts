import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { archiveMealType, updateMealType } from "@/lib/services/meal-type.service";
import { updateMealTypeSchema } from "@/lib/schemas";

export const PATCH = withOrgHandler(async (request, { params, context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  const input = await parseBody(request, updateMealTypeSchema);
  return ok(await updateMealType(context, params.mealTypeId, input));
});

export const DELETE = withOrgHandler(async (_request, { params, context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  return ok(await archiveMealType(context, params.mealTypeId));
});
