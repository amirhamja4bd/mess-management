import { ok } from "@/lib/api-response";
import { parseOptionalBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { closeCycle } from "@/lib/services/monthly-cycle.service";
import { closeMonthlyCycleSchema } from "@/lib/schemas";

export const POST = withOrgHandler(async (request, { params, context, user }) => {
  requirePermission(context, PERMISSION.ACCOUNTING_CLOSE);
  await parseOptionalBody(request, closeMonthlyCycleSchema, {});
  return ok(await closeCycle(context, user, params.cycleId));
});
