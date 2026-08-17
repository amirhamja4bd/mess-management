import { okList } from "@/lib/api-response";
import { parseQuery } from "@/lib/api/helpers";
import { listCyclesQuerySchema } from "@/lib/api/schemas";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { listCycles } from "@/lib/services/monthly-cycle.service";

export const GET = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.REPORTS_VIEW);
  const query = await parseQuery(request, listCyclesQuerySchema);
  const result = await listCycles(context, query);
  return okList(result.items, result.pagination);
});
