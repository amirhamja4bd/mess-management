import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { SUBSCRIPTION_STATUS } from "@/lib/constants/enums";
import type { SubscriptionStatus } from "@/lib/constants/enums";

export interface ISubscription {
  organizationId: Types.ObjectId;
  /** Plan key, e.g. "FREE", "PRO". Not a hard-coded business rule. */
  planKey: string;
  status: SubscriptionStatus;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  provider?: string;
  providerSubscriptionId?: string;
  canceledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
    },
    planKey: { type: String, required: true, uppercase: true, default: "FREE" },
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      required: true,
      default: SUBSCRIPTION_STATUS.TRIALING,
    },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    provider: { type: String, maxlength: 60 },
    providerSubscriptionId: { type: String, maxlength: 200 },
    canceledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "subscriptions",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

subscriptionSchema.index({ organizationId: 1, status: 1 });

export const SubscriptionModel: Model<ISubscription> =
  (models.Subscription as Model<ISubscription>) ||
  model<ISubscription>("Subscription", subscriptionSchema);

export default SubscriptionModel;
