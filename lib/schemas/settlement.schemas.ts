import { z } from "zod";
import { SETTLEMENT_STATUS, SETTLEMENT_TRANSACTION_STATUS } from "@/lib/constants/enums";
import { objectIdSchema, noteSchema } from "@/lib/schemas/common";

export const generateSettlementSchema = z.object({ notes: noteSchema }).strict();

export const markSettlementTransactionPaidSchema = z
  .object({ transactionId: objectIdSchema, notes: noteSchema })
  .strict();

export const markSettlementTransactionUnpaidSchema = z
  .object({ transactionId: objectIdSchema, notes: noteSchema })
  .strict();

export const settlementStatusSchema = z.enum(
  Object.values(SETTLEMENT_STATUS) as [string, ...string[]]
);

export const settlementTransactionStatusSchema = z.enum(
  Object.values(SETTLEMENT_TRANSACTION_STATUS) as [string, ...string[]]
);

export const settlementParamsSchema = z
  .object({ organizationId: objectIdSchema, cycleId: objectIdSchema })
  .strict();

export const settlementTransactionParamsSchema = z
  .object({ organizationId: objectIdSchema, transactionId: objectIdSchema })
  .strict();
