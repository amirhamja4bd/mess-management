import { z } from "zod";
import { ALL_PERMISSIONS } from "@/lib/constants/permissions";
import { objectIdSchema } from "@/lib/schemas/common";

const permissionValueSchema = z.enum(ALL_PERMISSIONS as [string, ...string[]]);

export const createRoleSchema = z
  .object({
    name: z.string().trim().min(1, "name is required").max(120),
    key: z
      .string()
      .trim()
      .regex(/^[A-Z][A-Z0-9_]*$/, "key must be uppercase snake_case")
      .max(60),
    description: z.string().trim().max(500).optional(),
    permissions: z.array(permissionValueSchema).default([]),
  })
  .strict();

export const updateRoleSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullish(),
    permissions: z.array(permissionValueSchema).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const roleParamsSchema = z
  .object({
    organizationId: objectIdSchema,
    roleId: objectIdSchema,
  })
  .strict();
