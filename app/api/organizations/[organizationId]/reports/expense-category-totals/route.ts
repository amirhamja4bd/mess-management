import { ok } from "@/lib/api-response";
import { parseQuery } from "@/lib/api/helpers";
import { periodQuerySchema } from "@/lib/api/schemas";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { getExpenseCategoryTotals } from "@/lib/services/report.service";

export const GET = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.REPORTS_VIEW);
  const query = await parseQuery(request, periodQuerySchema);
  return ok(await getExpenseCategoryTotals(context, query));
});
