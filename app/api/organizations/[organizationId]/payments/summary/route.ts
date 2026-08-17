import { ok } from "@/lib/api-response";
import { parseQuery } from "@/lib/api/helpers";
import { contributionSummaryQuerySchema } from "@/lib/api/schemas";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { memberContributionSummary } from "@/lib/services/payment.service";

export const GET = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.PAYMENTS_VIEW);
  const query = await parseQuery(request, contributionSummaryQuerySchema);
  return ok(await memberContributionSummary(context, query.organizationMemberId));
});
