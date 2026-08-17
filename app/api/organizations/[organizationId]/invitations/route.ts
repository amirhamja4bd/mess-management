import { created, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { createInvitation, listInvitations } from "@/lib/services/invitation.service";
import { createInvitationSchema } from "@/lib/schemas";

export const GET = withOrgHandler(async (_request, { context }) => {
  requirePermission(context, PERMISSION.MEMBERS_VIEW);
  return ok(await listInvitations(context));
});

export const POST = withOrgHandler(async (request, { context, user }) => {
  requirePermission(context, PERMISSION.MEMBERS_INVITE);
  const input = await parseBody(request, createInvitationSchema);
  return created(await createInvitation(context, user, input));
});
