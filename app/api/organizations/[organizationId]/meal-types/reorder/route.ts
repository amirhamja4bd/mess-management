import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { reorderMealTypes } from "@/lib/services/meal-type.service";
import { reorderMealTypesSchema } from "@/lib/schemas";

export const POST = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  const input = await parseBody(request, reorderMealTypesSchema);
  return ok(await reorderMealTypes(context, input.items));
});
