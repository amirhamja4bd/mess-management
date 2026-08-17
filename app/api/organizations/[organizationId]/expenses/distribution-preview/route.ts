import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { previewDistribution } from "@/lib/services/expense.service";
import type { CreateExpenseInput } from "@/lib/services/expense.service";
import { createExpenseSchema } from "@/lib/schemas";

export const POST = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.EXPENSES_VIEW);
  const input = await parseBody(request, createExpenseSchema);
  const expenseInput: CreateExpenseInput = {
    ...input,
    distribution: {
      method: input.distribution.method,
      participants: input.distribution.participants ?? [],
      details: input.distribution.details,
    },
  };
  return ok(await previewDistribution(context, expenseInput));
});
