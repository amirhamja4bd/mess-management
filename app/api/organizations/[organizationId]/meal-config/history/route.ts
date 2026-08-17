import { ok } from "@/lib/api-response";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { getConfigHistory } from "@/lib/services/meal-config.service";

export const GET = withOrgHandler(async (_request, { context }) => {
  requirePermission(context, PERMISSION.MEALS_VIEW);
  return ok(await getConfigHistory(context));
});
