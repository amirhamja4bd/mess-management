import { ok } from "@/lib/api-response";
import { parseBody, parseOptionalBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import {
  archiveOrganization,
  getOrganization,
  updateOrganization,
} from "@/lib/services/organization.service";
import {
  archiveOrganizationSchema,
  updateOrganizationSchema,
} from "@/lib/schemas";

export const GET = withOrgHandler(async (_request, { context }) => {
  requirePermission(context, PERMISSION.SETTINGS_VIEW);
  return ok(await getOrganization(context));
});

export const PATCH = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  const input = await parseBody(request, updateOrganizationSchema);
  return ok(await updateOrganization(context, input));
});

export const DELETE = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  const input = await parseOptionalBody(request, archiveOrganizationSchema, {});
  await archiveOrganization(context, input.reason);
  return ok({ message: "Organization archived" });
});
