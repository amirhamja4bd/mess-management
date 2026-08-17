import { ok } from "@/lib/api-response";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { getOrCreateCurrentCycle } from "@/lib/services/monthly-cycle.service";

export const GET = withOrgHandler(async (_request, { context }) => {
  requirePermission(context, PERMISSION.REPORTS_VIEW);
  return ok(await getOrCreateCurrentCycle(context));
});
