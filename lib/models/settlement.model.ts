import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { SETTLEMENT_STATUS } from "@/lib/constants/enums";
import type { SettlementStatus } from "@/lib/constants/enums";

export interface ISettlement {
  organizationId: Types.ObjectId;
  cycleId: Types.ObjectId;
  status: SettlementStatus;
  /** Sum owed by payers. Must equal totalReceivable. */
  totalOwed: number;
  totalReceivable: number;
  generatedByUserId: Types.ObjectId;
  generatedAt: Date;
  completedAt?: Date | null;
  completedByUserId?: Types.ObjectId | null;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const settlementSchema = new Schema<ISettlement>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    cycleId: { type: Schema.Types.ObjectId, ref: "MonthlyCycle", required: true },
    status: {
      type: String,
      enum: Object.values(SETTLEMENT_STATUS),
      required: true,
      default: SETTLEMENT_STATUS.PENDING,
    },
    totalOwed: { type: Number, required: true, default: 0 },
    totalReceivable: { type: Number, required: true, default: 0 },
    generatedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    generatedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date, default: null },
    completedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    notes: { type: String, maxlength: 2000 },
  },
  {
    timestamps: true,
    collection: "settlements",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

settlementSchema.index({ organizationId: 1, cycleId: 1 }, { unique: true });
settlementSchema.index({ organizationId: 1, status: 1 });

export const SettlementModel: Model<ISettlement> =
  (models.Settlement as Model<ISettlement>) ||
  model<ISettlement>("Settlement", settlementSchema);

export default SettlementModel;
