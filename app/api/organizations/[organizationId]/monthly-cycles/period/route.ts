import { ok } from "@/lib/api-response";
import { parseQuery } from "@/lib/api/helpers";
import { periodQuerySchema } from "@/lib/api/schemas";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import {
  getCycleByPeriod,
  getOrCreateCurrentCycle,
} from "@/lib/services/monthly-cycle.service";

export const GET = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.REPORTS_VIEW);
  const query = await parseQuery(request, periodQuerySchema);
  if (!query.periodKey) {
    return ok(await getOrCreateCurrentCycle(context));
  }
  return ok(await getCycleByPeriod(context, query.periodKey));
});
