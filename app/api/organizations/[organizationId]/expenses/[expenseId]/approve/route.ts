import { ok } from "@/lib/api-response";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { approveExpense } from "@/lib/services/expense.service";

export const POST = withOrgHandler(async (_request, { params, context, user }) => {
  requirePermission(context, PERMISSION.EXPENSES_APPROVE);
  return ok(await approveExpense(context, user, params.expenseId));
});
