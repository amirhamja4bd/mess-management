import { z } from "zod";
import { objectIdSchema, sortOrderSchema } from "@/lib/schemas/common";

export const createExpenseCategorySchema = z
  .object({
    name: z.string().trim().min(1, "name is required").max(100),
    isFood: z.boolean().default(false),
    color: z.string().max(20).optional(),
    icon: z.string().max(60).optional(),
    sortOrder: sortOrderSchema,
  })
  .strict();

export const updateExpenseCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    isFood: z.boolean().optional(),
    color: z.string().max(20).nullish(),
    icon: z.string().max(60).nullish(),
    sortOrder: sortOrderSchema.optional(),
  })
  .strict();

export const reorderExpenseCategoriesSchema = z
  .object({
    items: z.array(z.object({ id: objectIdSchema, sortOrder: z.number().int().min(0) })).min(1),
  })
  .strict();

export const expenseCategoryParamsSchema = z
  .object({ organizationId: objectIdSchema, categoryId: objectIdSchema })
  .strict();
