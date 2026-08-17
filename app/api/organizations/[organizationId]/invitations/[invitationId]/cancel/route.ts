import { ok } from "@/lib/api-response";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { cancelInvitation } from "@/lib/services/invitation.service";

export const POST = withOrgHandler(async (_request, { params, context }) => {
  requirePermission(context, PERMISSION.MEMBERS_INVITE);
  return ok(await cancelInvitation(context, params.invitationId));
});
