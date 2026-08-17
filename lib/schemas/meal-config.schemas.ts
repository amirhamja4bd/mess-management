import { z } from "zod";
import { DEFAULT_MEAL_WEIGHT_TOTAL } from "@/lib/constants";
import { objectIdSchema, dateSchema, optionalDateSchema } from "@/lib/schemas/common";

/**
 * A single meal weight for a meal type. The "weights must sum to 100"
 * invariant is cross-document and validated in the service layer across
 * all active configs of an organization (see validateMealConfigWeights).
 */
export const mealConfigItemSchema = z
  .object({
    mealTypeId: objectIdSchema,
    weight: z
      .number()
      .int("weight must be an integer")
      .min(1, "weight must be at least 1")
      .max(DEFAULT_MEAL_WEIGHT_TOTAL, `weight must be at most ${DEFAULT_MEAL_WEIGHT_TOTAL}`),
    effectiveFrom: dateSchema,
    effectiveTo: optionalDateSchema,
  })
  .strict();

export const createMealConfigSchema = z
  .object({
    mealTypeId: objectIdSchema,
    weight: mealConfigItemSchema.shape.weight,
    effectiveFrom: dateSchema,
  })
  .strict();

/** Replace the whole active weight set for an organization from a date. */
export const setMealConfigItemSchema = z
  .object({
    mealTypeId: objectIdSchema,
    weight: z
      .number()
      .int("weight must be an integer")
      .min(1, "weight must be at least 1")
      .max(DEFAULT_MEAL_WEIGHT_TOTAL, `weight must be at most ${DEFAULT_MEAL_WEIGHT_TOTAL}`),
  })
  .strict();

export const setMealConfigSchema = z
  .object({
    effectiveFrom: dateSchema,
    items: z
      .array(setMealConfigItemSchema)
      .min(1, "at least one meal config is required")
      .superRefine((items, ctx) => {
        const total = items.reduce((sum, item) => sum + item.weight, 0);
        if (total !== DEFAULT_MEAL_WEIGHT_TOTAL) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [],
            message: `meal weights must total ${DEFAULT_MEAL_WEIGHT_TOTAL}; got ${total}`,
          });
        }
      }),
  })
  .strict();

export const mealConfigParamsSchema = z
  .object({ organizationId: objectIdSchema, mealConfigId: objectIdSchema })
  .strict();
