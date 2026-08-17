import { created, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withAuthHandler } from "@/lib/api/with-handler";
import { createOrganization, getUserOrganizations } from "@/lib/services/organization.service";
import { createOrganizationSchema } from "@/lib/schemas";

export const GET = withAuthHandler(async (_request, { user }) => {
  return ok(await getUserOrganizations(user));
});

export const POST = withAuthHandler(async (request, { user }) => {
  const input = await parseBody(request, createOrganizationSchema);
  return created(await createOrganization(user, input));
});
