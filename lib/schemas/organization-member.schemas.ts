import { z } from "zod";
import { MEMBERSHIP_STATUS, ROLE_KEY } from "@/lib/constants/enums";
import { ALL_PERMISSIONS } from "@/lib/constants/permissions";
import { objectIdSchema, dateSchema } from "@/lib/schemas/common";

const permissionValueSchema = z.enum(ALL_PERMISSIONS as [string, ...string[]]);

export const createOrganizationMemberSchema = z
  .object({
    userId: objectIdSchema,
    roleKey: z.enum(Object.values(ROLE_KEY) as [string, ...string[]]).default(ROLE_KEY.MEMBER),
    roleId: objectIdSchema.optional(),
    permissions: z.array(permissionValueSchema).default([]),
    joinedAt: dateSchema.default(() => new Date()),
  })
  .strict();

export const updateOrganizationMemberSchema = z
  .object({
    roleKey: z.enum(Object.values(ROLE_KEY) as [string, ...string[]]).optional(),
    roleId: objectIdSchema.nullish(),
    permissions: z.array(permissionValueSchema).optional(),
    status: z.enum(Object.values(MEMBERSHIP_STATUS) as [string, ...string[]]).optional(),
    joinedAt: dateSchema.optional(),
    leftAt: dateSchema.nullish(),
  })
  .strict();

export const changeMemberRoleSchema = z
  .object({
    roleKey: z.enum(Object.values(ROLE_KEY) as [string, ...string[]]),
    roleId: objectIdSchema.nullish(),
  })
  .strict();

export const updateMemberPermissionsSchema = z
  .object({
    permissions: z.array(permissionValueSchema),
  })
  .strict();

export const suspendMemberSchema = z.object({}).strict();
export const removeMemberSchema = z.object({ leftAt: dateSchema.optional() }).strict();
export const restoreMemberSchema = z.object({}).strict();

export const organizationMemberParamsSchema = z
  .object({
    organizationId: objectIdSchema,
    memberId: objectIdSchema,
  })
  .strict();
