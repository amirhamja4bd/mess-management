import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { getCurrentConfig, setMealWeights } from "@/lib/services/meal-config.service";
import { setMealConfigSchema } from "@/lib/schemas";

export const GET = withOrgHandler(async (_request, { context }) => {
  requirePermission(context, PERMISSION.MEALS_VIEW);
  return ok(await getCurrentConfig(context));
});

export const POST = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.MEALS_MANAGE);
  const input = await parseBody(request, setMealConfigSchema);
  return ok(await setMealWeights(context, input));
});
