import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { MEAL_ENTRY_STATUS } from "@/lib/constants/enums";
import { markAbsent } from "@/lib/services/meal-entry.service";
import { bulkMarkAbsentSchema } from "@/lib/schemas";

export const POST = withOrgHandler(async (request, { context, user }) => {
  requirePermission(context, PERMISSION.MEALS_CREATE);
  const input = await parseBody(request, bulkMarkAbsentSchema);
  return ok(
    await markAbsent(context, user, {
      date: input.date,
      mealTypeId: input.mealTypeId,
      organizationMemberIds: input.organizationMemberIds,
      status: MEAL_ENTRY_STATUS.NOT_CONSUMED,
      overrideReason: input.reason,
    })
  );
});
