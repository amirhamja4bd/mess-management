import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { archiveCategory, updateCategory } from "@/lib/services/expense-category.service";
import { updateExpenseCategorySchema } from "@/lib/schemas";

export const PATCH = withOrgHandler(async (request, { params, context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  const input = await parseBody(request, updateExpenseCategorySchema);
  return ok(await updateCategory(context, params.categoryId, input));
});

export const DELETE = withOrgHandler(async (_request, { params, context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  return ok(await archiveCategory(context, params.categoryId));
});
