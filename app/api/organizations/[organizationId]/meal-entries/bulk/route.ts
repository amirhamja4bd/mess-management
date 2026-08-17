import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { bulkRecordMealEntries } from "@/lib/services/meal-entry.service";
import { bulkMealEntrySchema } from "@/lib/schemas";

export const POST = withOrgHandler(async (request, { context, user }) => {
  requirePermission(context, PERMISSION.MEALS_CREATE);
  const input = await parseBody(request, bulkMealEntrySchema);
  return ok(await bulkRecordMealEntries(context, user, input));
});
