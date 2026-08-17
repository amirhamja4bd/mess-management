import { ok } from "@/lib/api-response";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { restoreMember } from "@/lib/services/member.service";

export const POST = withOrgHandler(async (_request, { params, context }) => {
  requirePermission(context, PERMISSION.MEMBERS_MANAGE);
  return ok(await restoreMember(context, params.memberId));
});
