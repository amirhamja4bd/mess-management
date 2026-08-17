import { created, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { createPaymentMethod, listPaymentMethods } from "@/lib/services/payment-method.service";
import { createPaymentMethodSchema } from "@/lib/schemas";

export const GET = withOrgHandler(async (_request, { context }) => {
  requirePermission(context, PERMISSION.PAYMENTS_VIEW);
  return ok(await listPaymentMethods(context));
});

export const POST = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  const input = await parseBody(request, createPaymentMethodSchema);
  return created(await createPaymentMethod(context, input));
});
