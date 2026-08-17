import { created, okList } from "@/lib/api-response";
import { parseBody, parseQuery } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { createAdjustment, listAdjustments } from "@/lib/services/adjustment.service";
import { createAdjustmentSchema, listAdjustmentsQuerySchema } from "@/lib/schemas";

export const GET = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.REPORTS_VIEW);
  const query = await parseQuery(request, listAdjustmentsQuerySchema);
  const result = await listAdjustments(context, query);
  return okList(result.items, result.pagination);
});

export const POST = withOrgHandler(async (request, { context, user }) => {
  requirePermission(context, PERMISSION.ACCOUNTING_FINALIZE);
  const input = await parseBody(request, createAdjustmentSchema);
  return created(await createAdjustment(context, user, input));
});
