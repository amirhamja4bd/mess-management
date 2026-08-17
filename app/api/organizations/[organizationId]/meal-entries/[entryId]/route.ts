import { ok } from "@/lib/api-response";
import { parseBody, parseOptionalBody } from "@/lib/api/helpers";
import { voidBodySchema } from "@/lib/api/schemas";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import {
  getMealEntry,
  updateMealEntry,
  voidMealEntry,
} from "@/lib/services/meal-entry.service";
import { updateMealEntrySchema } from "@/lib/schemas";

export const GET = withOrgHandler(async (_request, { params, context }) => {
  requirePermission(context, PERMISSION.MEALS_VIEW);
  return ok(await getMealEntry(context, params.entryId));
});

export const PATCH = withOrgHandler(async (request, { params, context, user }) => {
  requirePermission(context, PERMISSION.MEALS_EDIT);
  const input = await parseBody(request, updateMealEntrySchema);
  return ok(await updateMealEntry(context, user, params.entryId, input));
});

export const DELETE = withOrgHandler(async (request, { params, context, user }) => {
  requirePermission(context, PERMISSION.MEALS_EDIT);
  const input = await parseOptionalBody(request, voidBodySchema, {
    reason: "Voided",
  });
  return ok(await voidMealEntry(context, user, params.entryId, input.reason));
});
