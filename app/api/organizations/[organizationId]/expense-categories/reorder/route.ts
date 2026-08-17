import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { reorderCategories } from "@/lib/services/expense-category.service";
import { reorderExpenseCategoriesSchema } from "@/lib/schemas";

export const POST = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  const input = await parseBody(request, reorderExpenseCategoriesSchema);
  return ok(await reorderCategories(context, input.items));
});
