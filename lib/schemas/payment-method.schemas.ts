import { z } from "zod";
import { objectIdSchema, sortOrderSchema } from "@/lib/schemas/common";

export const createPaymentMethodSchema = z
  .object({
    name: z.string().trim().min(1, "name is required").max(60),
    sortOrder: sortOrderSchema,
  })
  .strict();

export const updatePaymentMethodSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    sortOrder: sortOrderSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const paymentMethodParamsSchema = z
  .object({
    organizationId: objectIdSchema,
    paymentMethodId: objectIdSchema,
  })
  .strict();
