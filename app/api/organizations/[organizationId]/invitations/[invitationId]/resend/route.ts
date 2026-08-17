import { ok } from "@/lib/api-response";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { resendInvitation } from "@/lib/services/invitation.service";

export const POST = withOrgHandler(async (_request, { params, context, user }) => {
  requirePermission(context, PERMISSION.MEMBERS_INVITE);
  return ok(await resendInvitation(context, user, params.invitationId));
});
