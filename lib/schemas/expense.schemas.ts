import { z } from "zod";
import { DISTRIBUTION_METHOD, EXPENSE_STATUS } from "@/lib/constants/enums";
import {
  objectIdSchema,
  positiveMoneySchema,
  percentSchema,
  dateSchema,
  optionalDateSchema,
  paginationSchema,
  noteSchema,
} from "@/lib/schemas/common";

export const groceryItemSchema = z
  .object({
    name: z.string().trim().min(1, "item name is required").max(200),
    quantity: z.number().min(0).optional(),
    unit: z.string().trim().max(30).optional(),
    unitPrice: z.number().min(0).optional(),
    total: z.number().min(0).optional(),
    category: z.string().trim().max(100).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

const baseParticipantSchema = z.object({
  organizationMemberId: objectIdSchema,
  percent: percentSchema.optional(),
  amount: z.number().int().min(0).optional(),
});

const percentageParticipantSchema = baseParticipantSchema.extend({
  percent: percentSchema,
  amount: z.never().optional(),
});

const fixedAmountParticipantSchema = baseParticipantSchema.extend({
  amount: positiveMoneySchema,
  percent: z.never().optional(),
});

export const expenseDistributionSchema = z.discriminatedUnion("method", [
  z
    .object({
      method: z.literal(DISTRIBUTION_METHOD.EQUAL),
      participants: z.array(baseParticipantSchema).default([]).optional(),
      details: z.string().max(500).optional(),
    })
    .strict(),
  z
    .object({
      method: z.literal(DISTRIBUTION_METHOD.MEAL_BASED),
      participants: z.array(baseParticipantSchema).default([]).optional(),
      details: z.string().max(500).optional(),
    })
    .strict(),
  z
    .object({
      method: z.literal(DISTRIBUTION_METHOD.SELECTED_MEMBERS),
      participants: z
        .array(baseParticipantSchema)
        .min(2, "selected members distribution requires at least 2 participants"),
      details: z.string().max(500).optional(),
    })
    .strict(),
  z
    .object({
      method: z.literal(DISTRIBUTION_METHOD.PERCENTAGE),
      participants: z
        .array(percentageParticipantSchema)
        .min(1, "percentage distribution requires at least 1 participant")
        .refine(
          (participants) =>
            participants.reduce((sum, p) => sum + (p.percent ?? 0), 0) === 100,
          "percentages must total exactly 100"
        ),
      details: z.string().max(500).optional(),
    })
    .strict(),
  z
    .object({
      method: z.literal(DISTRIBUTION_METHOD.FIXED_AMOUNT),
      participants: z
        .array(fixedAmountParticipantSchema)
        .min(1, "fixed amount distribution requires at least 1 participant"),
      details: z.string().max(500).optional(),
    })
    .strict(),
  z
    .object({
      method: z.literal(DISTRIBUTION_METHOD.INDIVIDUAL),
      participants: z.array(baseParticipantSchema).length(1, "individual distribution needs exactly 1 participant"),
      details: z.string().max(500).optional(),
    })
    .strict(),
]);

export type ExpenseDistributionInput = z.infer<typeof expenseDistributionSchema>;

export const createExpenseSchema = z
  .object({
    categoryId: objectIdSchema,
    description: z.string().trim().min(1, "description is required").max(500),
    amount: positiveMoneySchema,
    expenseDate: dateSchema,
    paidByMemberId: objectIdSchema,
    distribution: expenseDistributionSchema,
    items: z.array(groceryItemSchema).max(200).default([]),
    status: z.enum([EXPENSE_STATUS.PENDING, EXPENSE_STATUS.APPROVED]).optional(),
    notes: noteSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.distribution.method === DISTRIBUTION_METHOD.FIXED_AMOUNT) {
      const sum = data.distribution.participants.reduce((acc, p) => acc + (p.amount ?? 0), 0);
      if (sum !== data.amount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["distribution", "participants"],
          message: `fixed amount participants must total the expense amount (${data.amount} paisa); got ${sum}`,
        });
      }
    }
  });

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = z
  .object({
    categoryId: objectIdSchema.optional(),
    description: z.string().trim().min(1).max(500).optional(),
    amount: positiveMoneySchema.optional(),
    expenseDate: dateSchema.optional(),
    paidByMemberId: objectIdSchema.optional(),
    distribution: expenseDistributionSchema.optional(),
    items: z.array(groceryItemSchema).max(200).optional(),
    notes: noteSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.distribution?.method === DISTRIBUTION_METHOD.FIXED_AMOUNT) {
      const sum = data.distribution.participants.reduce((acc, p) => acc + (p.amount ?? 0), 0);
      const total = data.amount ?? sum;
      if (sum !== total) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["distribution", "participants"],
          message: `fixed amount participants must total the expense amount (${total} paisa); got ${sum}`,
        });
      }
    }
  });

export const expenseStatusSchema = z.enum(
  Object.values(EXPENSE_STATUS) as [string, ...string[]]
);

export const listExpensesQuerySchema = paginationSchema
  .extend({
    categoryId: objectIdSchema.optional(),
    paidByMemberId: objectIdSchema.optional(),
    from: optionalDateSchema,
    to: optionalDateSchema,
    status: expenseStatusSchema.optional(),
    q: z.string().trim().max(100).optional(),
    sortBy: z.enum(["expenseDate", "amount", "createdAt"]).default("expenseDate"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export const expenseParamsSchema = z
  .object({ organizationId: objectIdSchema, expenseId: objectIdSchema })
  .strict();

export const voidExpenseSchema = z
  .object({ reason: z.string().trim().min(1).max(500) })
  .strict();
