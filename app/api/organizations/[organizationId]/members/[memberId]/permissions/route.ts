import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { updateMemberPermissions } from "@/lib/services/member.service";
import { updateMemberPermissionsSchema } from "@/lib/schemas";

export const PATCH = withOrgHandler(async (request, { params, context }) => {
  requirePermission(context, PERMISSION.MEMBERS_MANAGE);
  const input = await parseBody(request, updateMemberPermissionsSchema);
  return ok(await updateMemberPermissions(context, params.memberId, input.permissions));
});
