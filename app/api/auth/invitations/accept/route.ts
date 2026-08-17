import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withPublicHandler } from "@/lib/api/with-handler";
import { acceptInvitation } from "@/lib/services/invitation.service";
import { acceptInvitationSchema } from "@/lib/schemas";

export const POST = withPublicHandler(async (request) => {
  const input = await parseBody(request, acceptInvitationSchema);
  const result = await acceptInvitation(input);
  return ok(result);
});
