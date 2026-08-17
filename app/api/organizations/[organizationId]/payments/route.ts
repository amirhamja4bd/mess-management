import { created, okList } from "@/lib/api-response";
import { parseBody, parseQuery } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { createPayment, listPayments } from "@/lib/services/payment.service";
import { createPaymentSchema, listPaymentsQuerySchema } from "@/lib/schemas";

export const GET = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.PAYMENTS_VIEW);
  const query = await parseQuery(request, listPaymentsQuerySchema);
  const result = await listPayments(context, query);
  return okList(result.items, result.pagination);
});

export const POST = withOrgHandler(async (request, { context, user }) => {
  requirePermission(context, PERMISSION.PAYMENTS_CREATE);
  const input = await parseBody(request, createPaymentSchema);
  return created(await createPayment(context, user, input));
});
