import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withAuthHandler } from "@/lib/api/with-handler";
import { getProfile, updateUserProfile } from "@/lib/services/user.service";
import { updateUserProfileSchema } from "@/lib/schemas";

export const GET = withAuthHandler(async (_request, { user }) => {
  return ok(await getProfile(user));
});

export const PATCH = withAuthHandler(async (request, { user }) => {
  const input = await parseBody(request, updateUserProfileSchema);
  return ok(await updateUserProfile(user, input));
});
