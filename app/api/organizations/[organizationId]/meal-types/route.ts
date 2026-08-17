import { created, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { createMealType, listMealTypes } from "@/lib/services/meal-type.service";
import { createMealTypeSchema } from "@/lib/schemas";

export const GET = withOrgHandler(async (_request, { context }) => {
  requirePermission(context, PERMISSION.MEALS_VIEW);
  return ok(await listMealTypes(context));
});

export const POST = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  const input = await parseBody(request, createMealTypeSchema);
  return created(await createMealType(context, input));
});
