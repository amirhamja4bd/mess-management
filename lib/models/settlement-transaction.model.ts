import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { SETTLEMENT_TRANSACTION_STATUS } from "@/lib/constants/enums";
import type { SettlementTransactionStatus } from "@/lib/constants/enums";

export interface ISettlementTransaction {
  organizationId: Types.ObjectId;
  settlementId: Types.ObjectId;
  cycleId: Types.ObjectId;
  fromMemberId: Types.ObjectId;
  toMemberId: Types.ObjectId;
  amount: number;
  status: SettlementTransactionStatus;
  paidAt?: Date | null;
  paidByUserId?: Types.ObjectId | null;
  confirmedByUserId?: Types.ObjectId | null;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const settlementTransactionSchema = new Schema<ISettlementTransaction>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    settlementId: { type: Schema.Types.ObjectId, ref: "Settlement", required: true },
    cycleId: { type: Schema.Types.ObjectId, ref: "MonthlyCycle", required: true },
    fromMemberId: {
      type: Schema.Types.ObjectId,
      ref: "OrganizationMember",
      required: true,
    },
    toMemberId: {
      type: Schema.Types.ObjectId,
      ref: "OrganizationMember",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: "amount must be an integer (minor units / paisa)",
      },
    },
    status: {
      type: String,
      enum: Object.values(SETTLEMENT_TRANSACTION_STATUS),
      required: true,
      default: SETTLEMENT_TRANSACTION_STATUS.PENDING,
    },
    paidAt: { type: Date, default: null },
    paidByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    confirmedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    notes: { type: String, maxlength: 500 },
  },
  {
    timestamps: true,
    collection: "settlement_transactions",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

settlementTransactionSchema.index({ settlementId: 1, fromMemberId: 1, toMemberId: 1 });
settlementTransactionSchema.index({ organizationId: 1, status: 1 });
settlementTransactionSchema.index({ cycleId: 1 });

export const SettlementTransactionModel: Model<ISettlementTransaction> =
  (models.SettlementTransaction as Model<ISettlementTransaction>) ||
  model<ISettlementTransaction>("SettlementTransaction", settlementTransactionSchema);

export default SettlementTransactionModel;
