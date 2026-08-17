import { z } from "zod";
import { ROLE_KEY } from "@/lib/constants/enums";
import { objectIdSchema } from "@/lib/schemas/common";

export const createInvitationSchema = z
  .object({
    email: z.email("a valid email is required").max(254),
    roleKey: z.enum(Object.values(ROLE_KEY) as [string, ...string[]]).default(ROLE_KEY.MEMBER),
    message: z.string().trim().max(2000).optional(),
    expiresAt: z.coerce.date().optional(),
  })
  .strict();

export const resendInvitationSchema = z.object({ invitationId: objectIdSchema }).strict();
export const cancelInvitationSchema = z.object({ invitationId: objectIdSchema }).strict();

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(1, "token is required"),
    name: z.string().trim().min(1).max(120).optional(),
    password: z.string().min(8).max(128).optional(),
  })
  .strict();

export const rejectInvitationSchema = z.object({ token: z.string().min(1) }).strict();

export const invitationParamsSchema = z
  .object({ organizationId: objectIdSchema, invitationId: objectIdSchema })
  .strict();
