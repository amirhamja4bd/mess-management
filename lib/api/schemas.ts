import { z } from "zod";
import { objectIdSchema, optionalDateSchema, paginationSchema } from "@/lib/schemas/common";
import { monthlyCyclePeriodSchema } from "@/lib/schemas";

/** Query params shared by list endpoints. */
export const listQuerySchema = paginationSchema.strict();

export const listAuditLogsQuerySchema = paginationSchema
  .extend({
    entityType: z.string().trim().max(120).optional(),
    entityId: objectIdSchema.optional(),
    action: z.string().trim().max(120).optional(),
    actorUserId: objectIdSchema.optional(),
    from: optionalDateSchema,
    to: optionalDateSchema,
  })
  .strict();

export const contributionSummaryQuerySchema = z
  .object({ organizationMemberId: objectIdSchema.optional() })
  .strict();

export const listMembersQuerySchema = paginationSchema
  .extend({
    status: z.string().max(30).optional(),
    roleKey: z.string().max(60).optional(),
    q: z.string().trim().max(100).optional(),
  })
  .strict();

export const listMealDayStatusesQuerySchema = z
  .object({
    from: optionalDateSchema,
    to: optionalDateSchema,
  })
  .strict();

export const listCyclesQuerySchema = paginationSchema
  .extend({
    status: z.string().max(30).optional(),
  })
  .strict();

export const listSettlementsQuerySchema = paginationSchema
  .extend({
    cycleId: objectIdSchema.optional(),
    status: z.string().max(30).optional(),
  })
  .strict();

export const generateSettlementSchema = z
  .object({ cycleId: objectIdSchema })
  .strict();

/** Optional periodKey filter used by report endpoints. */
export const periodQuerySchema = z
  .object({ periodKey: monthlyCyclePeriodSchema.optional() })
  .strict();

/** periodKey + pagination for paginated report endpoints. */
export const paginatedReportQuerySchema = paginationSchema
  .extend({
    periodKey: monthlyCyclePeriodSchema.optional(),
    categoryId: objectIdSchema.optional(),
  })
  .strict();

/** Optional reason body for destructive soft-delete actions. */
export const reasonBodySchema = z
  .object({ reason: z.string().trim().min(1).max(500).optional() })
  .strict();

export const voidBodySchema = z
  .object({ reason: z.string().trim().min(1).max(500) })
  .strict();
