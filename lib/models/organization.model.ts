import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { ORGANIZATION_STATUS, MEAL_WEIGHT_MODE } from "@/lib/constants/enums";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import type { OrganizationStatus, MealWeightMode } from "@/lib/constants/enums";

export interface IOrganizationSettings {
  currency: string;
  mealWeightMode: MealWeightMode;
  /** Day of month (1-28) on which the accounting period starts. */
  accountingPeriodStartDay: number;
  timezone?: string;
  defaultPaymentMethodId?: Types.ObjectId;
  allowMealOverrides: boolean;
  /** SMTP email configuration */
  smtp?: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    from?: string;
  };
}

export interface IOrganization {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  status: OrganizationStatus;
  settings: IOrganizationSettings;
  archivedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const smtpSettingsSchema = new Schema(
  {
    host: { type: String, maxlength: 200 },
    port: { type: Number, min: 1, max: 65535 },
    user: { type: String, maxlength: 200 },
    pass: { type: String, maxlength: 200 },
    from: { type: String, maxlength: 200 },
  },
  { _id: false }
);

const organizationSettingsSchema = new Schema<IOrganizationSettings>(
  {
    currency: { type: String, default: DEFAULT_CURRENCY, uppercase: true, maxlength: 3 },
    mealWeightMode: {
      type: String,
      enum: Object.values(MEAL_WEIGHT_MODE),
      default: MEAL_WEIGHT_MODE.PERCENTAGE_OF_100,
    },
    accountingPeriodStartDay: { type: Number, default: 1, min: 1, max: 28 },
    timezone: { type: String, default: "Asia/Dhaka" },
    defaultPaymentMethodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod", default: null },
    allowMealOverrides: { type: Boolean, default: true },
    smtp: { type: smtpSettingsSchema, default: () => ({}) },
  },
  { _id: false }
);

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 2000 },
    logoUrl: { type: String, maxlength: 2000 },
    status: {
      type: String,
      enum: Object.values(ORGANIZATION_STATUS),
      default: ORGANIZATION_STATUS.ACTIVE,
      required: true,
    },
    settings: { type: organizationSettingsSchema, default: () => ({}) },
    archivedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "organizations",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

organizationSchema.index({ name: 1 });
organizationSchema.index({ status: 1 });
organizationSchema.index({ deletedAt: 1 });

export const OrganizationModel: Model<IOrganization> =
  (models.Organization as Model<IOrganization>) ||
  model<IOrganization>("Organization", organizationSchema);

export default OrganizationModel;
