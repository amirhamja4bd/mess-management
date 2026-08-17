import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withPublicHandler } from "@/lib/api/with-handler";
import { rejectInvitation } from "@/lib/services/invitation.service";
import { rejectInvitationSchema } from "@/lib/schemas";

export const POST = withPublicHandler(async (request) => {
  const input = await parseBody(request, rejectInvitationSchema);
  await rejectInvitation(input.token);
  return ok({ message: "Invitation rejected" });
});
