import { okList } from "@/lib/api-response";
import { parseQuery } from "@/lib/api/helpers";
import { listMembersQuerySchema } from "@/lib/api/schemas";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { listMembers } from "@/lib/services/member.service";

export const GET = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.MEMBERS_VIEW);
  const query = await parseQuery(request, listMembersQuerySchema);
  const result = await listMembers(context, query);
  return okList(result.items, result.pagination);
});
