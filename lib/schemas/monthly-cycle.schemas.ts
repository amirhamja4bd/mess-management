import { z } from "zod";
import { MONTHLY_CYCLE_STATUS } from "@/lib/constants/enums";
import { objectIdSchema } from "@/lib/schemas/common";

export const monthlyCyclePeriodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "period must be in YYYY-MM format");

export const createMonthlyCycleSchema = z
  .object({
    periodKey: monthlyCyclePeriodSchema,
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export const monthlyCycleStatusSchema = z.enum(
  Object.values(MONTHLY_CYCLE_STATUS) as [string, ...string[]]
);

export const finalizeMonthlyCycleSchema = z.object({}).strict();

export const closeMonthlyCycleSchema = z
  .object({ notes: z.string().trim().max(2000).optional() })
  .strict();

export const recalculateMonthlyCycleSchema = z.object({}).strict();

export const monthlyCycleParamsSchema = z
  .object({
    organizationId: objectIdSchema,
    periodKey: monthlyCyclePeriodSchema,
  })
  .strict();

export const monthlyCycleIdParamsSchema = z
  .object({ organizationId: objectIdSchema, cycleId: objectIdSchema })
  .strict();
