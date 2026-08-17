import { ok } from "@/lib/api-response";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { markSettlementTransactionPaid } from "@/lib/services/settlement.service";

export const POST = withOrgHandler(async (_request, { params, context, user }) => {
  requirePermission(context, PERMISSION.SETTLEMENT_MANAGE);
  return ok(await markSettlementTransactionPaid(context, user, params.transactionId));
});
