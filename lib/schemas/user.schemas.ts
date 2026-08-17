import { z } from "zod";
import { USER_STATUS } from "@/lib/constants/enums";

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, "name is required").max(120),
    email: z.email("a valid email is required").max(254),
    phone: z.string().trim().max(30).optional(),
    password: z
      .string()
      .min(8, "password must be at least 8 characters")
      .max(128, "password must be at most 128 characters"),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.email("a valid email is required"),
    password: z.string().min(1, "password is required").max(128),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({ email: z.email("a valid email is required") })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "token is required"),
    password: z
      .string()
      .min(8, "password must be at least 8 characters")
      .max(128, "password must be at most 128 characters"),
  })
  .strict();

export const updateUserProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().max(30).nullish(),
    avatarUrl: z.string().url().max(2000).nullish(),
  })
  .strict();

export const updateUserStatusSchema = z
  .object({ status: z.enum(Object.values(USER_STATUS) as [string, ...string[]]) })
  .strict();

export const verifyEmailSchema = z.object({ token: z.string().min(1) }).strict();
