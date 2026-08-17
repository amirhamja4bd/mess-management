import { created, okList } from "@/lib/api-response";
import { parseBody, parseQuery } from "@/lib/api/helpers";
import { generateSettlementSchema, listSettlementsQuerySchema } from "@/lib/api/schemas";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { generateSettlements, listSettlements } from "@/lib/services/settlement.service";

export const GET = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.SETTLEMENT_MANAGE);
  const query = await parseQuery(request, listSettlementsQuerySchema);
  const result = await listSettlements(context, query);
  return okList(result.items, result.pagination);
});

export const POST = withOrgHandler(async (request, { context, user }) => {
  requirePermission(context, PERMISSION.SETTLEMENT_MANAGE);
  const input = await parseBody(request, generateSettlementSchema);
  return created(await generateSettlements(context, user, input.cycleId));
});
