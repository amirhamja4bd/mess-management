import { ok } from "@/lib/api-response";
import { withAuthHandler } from "@/lib/api/with-handler";
import { getUserOrganizations } from "@/lib/services/organization.service";

export const GET = withAuthHandler(async (_request, { user }) => {
  return ok(await getUserOrganizations(user));
});
