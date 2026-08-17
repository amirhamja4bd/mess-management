import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { archivePaymentMethod, updatePaymentMethod } from "@/lib/services/payment-method.service";
import { updatePaymentMethodSchema } from "@/lib/schemas";

export const PATCH = withOrgHandler(async (request, { params, context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  const input = await parseBody(request, updatePaymentMethodSchema);
  return ok(await updatePaymentMethod(context, params.methodId, input));
});

export const DELETE = withOrgHandler(async (_request, { params, context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  return ok(await archivePaymentMethod(context, params.methodId));
});
