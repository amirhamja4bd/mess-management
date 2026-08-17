import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { getExpense, updateExpense, voidExpense } from "@/lib/services/expense.service";
import type { UpdateExpenseInput } from "@/lib/services/expense.service";
import { updateExpenseSchema, voidExpenseSchema } from "@/lib/schemas";

export const GET = withOrgHandler(async (_request, { params, context }) => {
  requirePermission(context, PERMISSION.EXPENSES_VIEW);
  return ok(await getExpense(context, params.expenseId));
});

export const PATCH = withOrgHandler(async (request, { params, context, user }) => {
  requirePermission(context, PERMISSION.EXPENSES_EDIT);
  const input = await parseBody(request, updateExpenseSchema);
  const updateInput: UpdateExpenseInput = {
    ...input,
    distribution:
      input.distribution === undefined
        ? undefined
        : {
            method: input.distribution.method,
            participants: input.distribution.participants ?? [],
            details: input.distribution.details,
          },
  };
  return ok(await updateExpense(context, user, params.expenseId, updateInput));
});

export const DELETE = withOrgHandler(async (request, { params, context, user }) => {
  requirePermission(context, PERMISSION.EXPENSES_DELETE);
  const input = await parseBody(request, voidExpenseSchema);
  return ok(await voidExpense(context, user, params.expenseId, input.reason));
});
