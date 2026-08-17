import { ok } from "@/lib/api-response";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { finalizeCycle } from "@/lib/services/monthly-cycle.service";

export const POST = withOrgHandler(async (_request, { params, context, user }) => {
  requirePermission(context, PERMISSION.ACCOUNTING_FINALIZE);
  return ok(await finalizeCycle(context, user, params.cycleId));
});
