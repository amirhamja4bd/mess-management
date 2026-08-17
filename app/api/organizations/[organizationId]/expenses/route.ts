import { created, okList } from "@/lib/api-response";
import { parseBody, parseQuery } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { createExpense, listExpenses } from "@/lib/services/expense.service";
import type { CreateExpenseInput } from "@/lib/services/expense.service";
import { createExpenseSchema, listExpensesQuerySchema } from "@/lib/schemas";

export const GET = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.EXPENSES_VIEW);
  const query = await parseQuery(request, listExpensesQuerySchema);
  const result = await listExpenses(context, query);
  return okList(result.items, result.pagination);
});

export const POST = withOrgHandler(async (request, { context, user }) => {
  requirePermission(context, PERMISSION.EXPENSES_CREATE);
  const input = await parseBody(request, createExpenseSchema);
  const expenseInput: CreateExpenseInput = {
    ...input,
    distribution: {
      method: input.distribution.method,
      participants: input.distribution.participants ?? [],
      details: input.distribution.details,
    },
  };
  return created(await createExpense(context, user, expenseInput));
});
