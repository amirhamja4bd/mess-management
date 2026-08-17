import { ok } from "@/lib/api-response";
import { parseQuery } from "@/lib/api/helpers";
import { paginatedReportQuerySchema } from "@/lib/api/schemas";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { getExpenseBreakdown } from "@/lib/services/report.service";

export const GET = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.REPORTS_VIEW);
  const query = await parseQuery(request, paginatedReportQuerySchema);
  return ok(await getExpenseBreakdown(context, query));
});
