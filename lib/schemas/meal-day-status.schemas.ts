import { z } from "zod";
import { MEAL_DAY_STATUS } from "@/lib/constants/enums";
import { objectIdSchema, dateSchema } from "@/lib/schemas/common";

export const setMealDayStatusSchema = z
  .object({
    date: dateSchema,
    mealTypeId: objectIdSchema,
    status: z.enum(Object.values(MEAL_DAY_STATUS) as [string, ...string[]]),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const clearMealDayStatusSchema = z
  .object({ date: dateSchema, mealTypeId: objectIdSchema })
  .strict();

export const mealDayStatusParamsSchema = z
  .object({ organizationId: objectIdSchema })
  .strict();
