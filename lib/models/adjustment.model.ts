import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { ADJUSTMENT_STATUS, ADJUSTMENT_TYPE } from "@/lib/constants/enums";
import type { AdjustmentStatus, AdjustmentType } from "@/lib/constants/enums";

export interface IAdjustment {
  organizationId: Types.ObjectId;
  organizationMemberId: Types.ObjectId;
  type: AdjustmentType;
  amount: number;
  reason: string;
  adjustmentDate: Date;
  status: AdjustmentStatus;
  createdByUserId: Types.ObjectId;
  updatedByUserId?: Types.ObjectId | null;
  voidedAt?: Date | null;
  voidedById?: Types.ObjectId | null;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const adjustmentSchema = new Schema<IAdjustment>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    organizationMemberId: {
      type: Schema.Types.ObjectId,
      ref: "OrganizationMember",
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(ADJUSTMENT_TYPE),
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
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    adjustmentDate: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(ADJUSTMENT_STATUS),
      required: true,
      default: ADJUSTMENT_STATUS.ACTIVE,
    },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    voidedAt: { type: Date, default: null },
    voidedById: { type: Schema.Types.ObjectId, ref: "OrganizationMember", default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "adjustments",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

adjustmentSchema.index({ organizationId: 1, adjustmentDate: -1 });
adjustmentSchema.index({ organizationId: 1, organizationMemberId: 1 });

export const AdjustmentModel: Model<IAdjustment> =
  (models.Adjustment as Model<IAdjustment>) ||
  model<IAdjustment>("Adjustment", adjustmentSchema);

export default AdjustmentModel;
