import { created, okList } from "@/lib/api-response";
import { parseBody, parseQuery } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { listMealEntries, recordMealEntry } from "@/lib/services/meal-entry.service";
import { listMealEntriesQuerySchema, singleMealEntrySchema } from "@/lib/schemas";

export const GET = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.MEALS_VIEW);
  const query = await parseQuery(request, listMealEntriesQuerySchema);
  const items = await listMealEntries(context, query);
  return okList(items, {
    page: 1,
    limit: items.length,
    total: items.length,
    totalPages: 1,
  });
});

export const POST = withOrgHandler(async (request, { context, user }) => {
  requirePermission(context, PERMISSION.MEALS_CREATE);
  const input = await parseBody(request, singleMealEntrySchema);
  return created(await recordMealEntry(context, user, input));
});
