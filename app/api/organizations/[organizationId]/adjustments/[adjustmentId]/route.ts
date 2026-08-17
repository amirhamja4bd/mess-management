import { ok } from "@/lib/api-response";
import { parseBody, parseOptionalBody } from "@/lib/api/helpers";
import { voidBodySchema } from "@/lib/api/schemas";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import {
  getAdjustment,
  updateAdjustment,
  voidAdjustment,
} from "@/lib/services/adjustment.service";
import { updateAdjustmentSchema } from "@/lib/schemas";

export const GET = withOrgHandler(async (_request, { params, context }) => {
  requirePermission(context, PERMISSION.REPORTS_VIEW);
  return ok(await getAdjustment(context, params.adjustmentId));
});

export const PATCH = withOrgHandler(async (request, { params, context, user }) => {
  requirePermission(context, PERMISSION.ACCOUNTING_FINALIZE);
  const input = await parseBody(request, updateAdjustmentSchema);
  return ok(await updateAdjustment(context, user, params.adjustmentId, input));
});

export const DELETE = withOrgHandler(async (request, { params, context, user }) => {
  requirePermission(context, PERMISSION.ACCOUNTING_FINALIZE);
  await parseOptionalBody(request, voidBodySchema, { reason: "Voided" });
  return ok(await voidAdjustment(context, user, params.adjustmentId));
});
