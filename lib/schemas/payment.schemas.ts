import { z } from "zod";
import { PAYMENT_STATUS, PAYMENT_TYPE } from "@/lib/constants/enums";
import {
  objectIdSchema,
  positiveMoneySchema,
  dateSchema,
  optionalDateSchema,
  paginationSchema,
} from "@/lib/schemas/common";

export const paymentTypeSchema = z.enum(Object.values(PAYMENT_TYPE) as [string, ...string[]]);

export const createPaymentSchema = z
  .object({
    organizationMemberId: objectIdSchema,
    amount: positiveMoneySchema,
    paymentDate: dateSchema,
    methodId: objectIdSchema.nullish(),
    methodName: z.string().trim().max(60).optional(),
    type: paymentTypeSchema.default(PAYMENT_TYPE.CONTRIBUTION),
    reference: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const updatePaymentSchema = z
  .object({
    amount: positiveMoneySchema.optional(),
    paymentDate: dateSchema.optional(),
    methodId: objectIdSchema.nullish(),
    methodName: z.string().trim().max(60).optional(),
    reference: z.string().trim().max(200).nullish(),
    notes: z.string().trim().max(500).nullish(),
    status: z.enum(Object.values(PAYMENT_STATUS) as [string, ...string[]]).optional(),
  })
  .strict();

export const voidPaymentSchema = z
  .object({ reason: z.string().trim().min(1).max(500) })
  .strict();

export const listPaymentsQuerySchema = paginationSchema
  .extend({
    organizationMemberId: objectIdSchema.optional(),
    from: optionalDateSchema,
    to: optionalDateSchema,
    type: paymentTypeSchema.optional(),
    status: z.enum(Object.values(PAYMENT_STATUS) as [string, ...string[]]).optional(),
    sortBy: z.enum(["paymentDate", "amount", "createdAt"]).default("paymentDate"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export const paymentParamsSchema = z
  .object({ organizationId: objectIdSchema, paymentId: objectIdSchema })
  .strict();
