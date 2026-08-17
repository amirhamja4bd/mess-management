import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { PAYMENT_STATUS, PAYMENT_TYPE } from "@/lib/constants/enums";
import type { PaymentStatus, PaymentType } from "@/lib/constants/enums";

export interface IPayment {
  organizationId: Types.ObjectId;
  organizationMemberId: Types.ObjectId;
  amount: number;
  paymentDate: Date;
  /** Snapshot-friendly: methodId + methodName preserves history if a method is later archived. */
  methodId?: Types.ObjectId | null;
  methodName?: string;
  type: PaymentType;
  status: PaymentStatus;
  reference?: string;
  notes?: string;
  settlementTransactionId?: Types.ObjectId | null;
  createdByUserId: Types.ObjectId;
  updatedByUserId?: Types.ObjectId | null;
  voidedAt?: Date | null;
  voidedById?: Types.ObjectId | null;
  voidReason?: string;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const paymentSchema = new Schema<IPayment>(
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
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: "amount must be an integer (minor units / paisa)",
      },
    },
    paymentDate: { type: Date, required: true },
    methodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod", default: null },
    methodName: { type: String, trim: true, maxlength: 60 },
    type: {
      type: String,
      enum: Object.values(PAYMENT_TYPE),
      required: true,
      default: PAYMENT_TYPE.CONTRIBUTION,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      required: true,
      default: PAYMENT_STATUS.COMPLETED,
    },
    reference: { type: String, maxlength: 200 },
    notes: { type: String, maxlength: 500 },
    settlementTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "SettlementTransaction",
      default: null,
    },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    voidedAt: { type: Date, default: null },
    voidedById: { type: Schema.Types.ObjectId, ref: "OrganizationMember", default: null },
    voidReason: { type: String, maxlength: 500 },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "payments",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

paymentSchema.index({ organizationId: 1, paymentDate: -1 });
paymentSchema.index({ organizationId: 1, organizationMemberId: 1 });
paymentSchema.index({ organizationId: 1, type: 1, status: 1 });
paymentSchema.index({ organizationId: 1, deletedAt: 1 });

export const PaymentModel: Model<IPayment> =
  (models.Payment as Model<IPayment>) || model<IPayment>("Payment", paymentSchema);

export default PaymentModel;
