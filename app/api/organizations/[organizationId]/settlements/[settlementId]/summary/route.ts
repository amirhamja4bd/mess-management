import { ok } from "@/lib/api-response";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { settlementSummary } from "@/lib/services/settlement.service";

export const GET = withOrgHandler(async (_request, { params, context }) => {
  requirePermission(context, PERMISSION.SETTLEMENT_MANAGE);
  return ok(await settlementSummary(context, params.settlementId));
});
