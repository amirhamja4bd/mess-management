import { ok } from "@/lib/api-response";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { restoreCategory } from "@/lib/services/expense-category.service";

export const POST = withOrgHandler(async (_request, { params, context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  return ok(await restoreCategory(context, params.categoryId));
});
