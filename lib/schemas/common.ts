import { z } from "zod";

/**
 * Shared validation primitives.
 * Money is validated as non-negative integer minor units (paisa).
 */

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "must be a valid 24-character ObjectId");

export const optionalObjectIdSchema = objectIdSchema.nullish();

export const requiredRefSchema = objectIdSchema.describe("MongoDB ObjectId reference");

export const optionalRefSchema = optionalObjectIdSchema.describe(
  "Optional MongoDB ObjectId reference"
);

/** Non-negative money amount in paisa (integer minor units). */
export const moneySchema = z
  .number()
  .int("amount must be an integer (minor units / paisa)")
  .min(0, "amount must not be negative");

/** Strictly positive money amount in paisa. */
export const positiveMoneySchema = moneySchema.positive("amount must be greater than zero");

/** Integer percentage between 0 and 100. */
export const percentSchema = z
  .number()
  .int("percent must be an integer")
  .min(0, "percent must be between 0 and 100")
  .max(100, "percent must be between 0 and 100");

/** Accepts a Date object or an ISO date/datetime string. Output is a Date. */
export const dateSchema = z.coerce.date();

export const optionalDateSchema = dateSchema.nullish();

export const sortOrderSchema = z.number().int().min(0).default(0);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const noteSchema = z.string().max(500).optional();

export const reasonSchema = z.string().min(1, "reason is required").max(500);
