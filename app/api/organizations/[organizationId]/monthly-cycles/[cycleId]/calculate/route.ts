import { ok } from "@/lib/api-response";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { calculateCycle } from "@/lib/services/monthly-cycle.service";

export const POST = withOrgHandler(async (_request, { params, context }) => {
  requirePermission(context, PERMISSION.ACCOUNTING_FINALIZE);
  return ok(await calculateCycle(context, params.cycleId));
});
