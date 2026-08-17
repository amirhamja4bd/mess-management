import { ok } from "@/lib/api-response";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { restoreMealType } from "@/lib/services/meal-type.service";

export const POST = withOrgHandler(async (_request, { params, context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  return ok(await restoreMealType(context, params.mealTypeId));
});
