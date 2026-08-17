import { created, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { createCategory, listCategories } from "@/lib/services/expense-category.service";
import { createExpenseCategorySchema } from "@/lib/schemas";

export const GET = withOrgHandler(async (_request, { context }) => {
  requirePermission(context, PERMISSION.EXPENSES_VIEW);
  return ok(await listCategories(context));
});

export const POST = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  const input = await parseBody(request, createExpenseCategorySchema);
  return created(await createCategory(context, input));
});
