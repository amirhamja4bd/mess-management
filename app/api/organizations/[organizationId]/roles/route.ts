import { created, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { createRole, listRoles } from "@/lib/services/role.service";
import { createRoleSchema } from "@/lib/schemas";

export const GET = withOrgHandler(async (_request, { context }) => {
  requirePermission(context, PERMISSION.SETTINGS_VIEW);
  return ok(await listRoles(context));
});

export const POST = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  const input = await parseBody(request, createRoleSchema);
  return created(await createRole(context, input));
});
