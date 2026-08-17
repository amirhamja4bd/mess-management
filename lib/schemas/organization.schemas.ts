import { z } from "zod";
import { ORGANIZATION_STATUS } from "@/lib/constants/enums";
import { DEFAULT_MEAL_WEIGHT_MODE } from "@/lib/constants";
import { optionalObjectIdSchema } from "@/lib/schemas/common";

export const organizationSmtpSchema = z
  .object({
    host: z.string().max(200).optional(),
    port: z.number().int().min(1).max(65535).optional(),
    user: z.string().max(200).optional(),
    pass: z.string().max(200).optional(),
    from: z.string().max(200).optional(),
  })
  .partial()
  .strict();

export const organizationSettingsSchema = z
  .object({
    currency: z.string().length(3).toUpperCase().default("BDT"),
    mealWeightMode: z.enum([DEFAULT_MEAL_WEIGHT_MODE]).default(DEFAULT_MEAL_WEIGHT_MODE),
    accountingPeriodStartDay: z.number().int().min(1).max(28).default(1),
    timezone: z.string().min(1).max(60).default("Asia/Dhaka"),
    defaultPaymentMethodId: optionalObjectIdSchema,
    allowMealOverrides: z.boolean().default(true),
    smtp: organizationSmtpSchema.optional(),
  })
  .partial()
  .passthrough();

export const createOrganizationSchema = z
  .object({
    name: z.string().trim().min(1, "name is required").max(200),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case")
      .max(100)
      .optional(),
    description: z.string().trim().max(2000).optional(),
    logoUrl: z.string().url().max(2000).optional(),
    settings: organizationSettingsSchema.optional(),
  })
  .strict();

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullish(),
    logoUrl: z.string().url().max(2000).nullish(),
    settings: organizationSettingsSchema.optional(),
  })
  .strict();

export const archiveOrganizationSchema = z.object({ reason: z.string().max(500).optional() }).strict();
export const restoreOrganizationSchema = z.object({}).strict();

export const getOrganizationParamsSchema = z.object({
  organizationId: z.string().min(1),
});

export const organizationParamsSchema = z.object({
  organizationId: z.string().regex(/^[0-9a-fA-F]{24}$/, "invalid organization id"),
});

export const switchOrganizationSchema = organizationParamsSchema.strict();

export const organizationStatusSchema = z.enum(
  Object.values(ORGANIZATION_STATUS) as [string, ...string[]]
);
