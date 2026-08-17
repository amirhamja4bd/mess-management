import { ok } from "@/lib/api-response";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { restoreOrganization } from "@/lib/services/organization.service";

export const POST = withOrgHandler(async (_request, { context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  await restoreOrganization(context);
  return ok({ message: "Organization restored" });
});
