import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";

export interface IPaymentMethod {
  organizationId: Types.ObjectId;
  name: string;
  sortOrder: number;
  isActive: boolean;
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const paymentMethodSchema = new Schema<IPaymentMethod>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    archivedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "payment_methods",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

paymentMethodSchema.index({ organizationId: 1, name: 1 }, { unique: true });
paymentMethodSchema.index({ organizationId: 1, isActive: 1, sortOrder: 1 });

export const PaymentMethodModel: Model<IPaymentMethod> =
  (models.PaymentMethod as Model<IPaymentMethod>) ||
  model<IPaymentMethod>("PaymentMethod", paymentMethodSchema);

export default PaymentMethodModel;
