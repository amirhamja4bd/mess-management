import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { getPayment, updatePayment, voidPayment } from "@/lib/services/payment.service";
import { updatePaymentSchema, voidPaymentSchema } from "@/lib/schemas";

export const GET = withOrgHandler(async (_request, { params, context }) => {
  requirePermission(context, PERMISSION.PAYMENTS_VIEW);
  return ok(await getPayment(context, params.paymentId));
});

export const PATCH = withOrgHandler(async (request, { params, context, user }) => {
  requirePermission(context, PERMISSION.PAYMENTS_EDIT);
  const input = await parseBody(request, updatePaymentSchema);
  return ok(await updatePayment(context, user, params.paymentId, input));
});

export const DELETE = withOrgHandler(async (request, { params, context, user }) => {
  requirePermission(context, PERMISSION.PAYMENTS_EDIT);
  const input = await parseBody(request, voidPaymentSchema);
  return ok(await voidPayment(context, user, params.paymentId, input.reason));
});
