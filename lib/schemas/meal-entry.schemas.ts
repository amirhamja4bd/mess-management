import { z } from "zod";
import { MEAL_ENTRY_STATUS } from "@/lib/constants/enums";
import { objectIdSchema, dateSchema, optionalDateSchema } from "@/lib/schemas/common";

export const mealEntryStatusSchema = z.enum(Object.values(MEAL_ENTRY_STATUS) as [string, ...string[]]);

export const singleMealEntrySchema = z
  .object({
    organizationMemberId: objectIdSchema,
    date: dateSchema,
    mealTypeId: objectIdSchema,
    status: mealEntryStatusSchema,
    overrideReason: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const bulkMealEntrySchema = z
  .object({
    date: dateSchema,
    mealTypeId: objectIdSchema,
    /** members whose entry should be set to CONSUMED (or the given status). */
    organizationMemberIds: z.array(objectIdSchema).min(1).max(500),
    status: mealEntryStatusSchema.default(MEAL_ENTRY_STATUS.CONSUMED),
    overrideReason: z.string().trim().max(500).optional(),
  })
  .strict();

export const bulkMarkAbsentSchema = z
  .object({
    date: dateSchema,
    mealTypeId: objectIdSchema,
    organizationMemberIds: z.array(objectIdSchema).min(1).max(500),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const manualMealAdjustmentSchema = z
  .object({
    organizationMemberId: objectIdSchema,
    date: dateSchema,
    mealTypeId: objectIdSchema,
    status: mealEntryStatusSchema,
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export const mealEntryParamsSchema = z
  .object({
    organizationId: objectIdSchema,
    mealEntryId: objectIdSchema,
  })
  .strict();

export const listMealEntriesQuerySchema = z
  .object({
    date: dateSchema.optional(),
    from: optionalDateSchema,
    to: optionalDateSchema,
    mealTypeId: objectIdSchema.optional(),
    organizationMemberId: objectIdSchema.optional(),
  })
  .strict();

export const updateMealEntrySchema = z
  .object({
    status: mealEntryStatusSchema.optional(),
    overrideReason: z.string().trim().max(500).nullish(),
    notes: z.string().trim().max(500).nullish(),
  })
  .strict();
