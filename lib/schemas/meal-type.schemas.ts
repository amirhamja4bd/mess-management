import { z } from "zod";
import { objectIdSchema, sortOrderSchema } from "@/lib/schemas/common";

export const createMealTypeSchema = z
  .object({
    name: z.string().trim().min(1, "name is required").max(100),
    sortOrder: sortOrderSchema,
  })
  .strict();

export const updateMealTypeSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    sortOrder: sortOrderSchema.optional(),
  })
  .strict();

export const reorderMealTypesSchema = z
  .object({
    items: z.array(z.object({ id: objectIdSchema, sortOrder: z.number().int().min(0) })).min(1),
  })
  .strict();

export const mealTypeParamsSchema = z
  .object({ organizationId: objectIdSchema, mealTypeId: objectIdSchema })
  .strict();
