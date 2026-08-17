import { z } from "zod";
import { ADJUSTMENT_TYPE } from "@/lib/constants/enums";
import {
  objectIdSchema,
  positiveMoneySchema,
  dateSchema,
  paginationSchema,
} from "@/lib/schemas/common";

export const createAdjustmentSchema = z
  .object({
    organizationMemberId: objectIdSchema,
    type: z.enum(Object.values(ADJUSTMENT_TYPE) as [string, ...string[]]),
    amount: positiveMoneySchema,
    reason: z.string().trim().min(1, "reason is required").max(500),
    adjustmentDate: dateSchema,
  })
  .strict();

export const voidAdjustmentSchema = z
  .object({ reason: z.string().trim().min(1).max(500) })
  .strict();

export const updateAdjustmentSchema = z
  .object({
    organizationMemberId: objectIdSchema.optional(),
    adjustmentDate: dateSchema.optional(),
    type: z.enum(Object.values(ADJUSTMENT_TYPE) as [string, ...string[]]).optional(),
    amount: positiveMoneySchema.optional(),
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

export const listAdjustmentsQuerySchema = paginationSchema
  .extend({
    organizationMemberId: objectIdSchema.optional(),
    type: z.enum(Object.values(ADJUSTMENT_TYPE) as [string, ...string[]]).optional(),
  })
  .strict();

export const adjustmentParamsSchema = z
  .object({ organizationId: objectIdSchema, adjustmentId: objectIdSchema })
  .strict();
