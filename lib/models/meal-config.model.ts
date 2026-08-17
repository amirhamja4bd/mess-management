import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { DEFAULT_MEAL_WEIGHT_TOTAL } from "@/lib/constants";

export interface IMealConfig {
  organizationId: Types.ObjectId;
  mealTypeId: Types.ObjectId;
  /**
   * Weight of this meal type. Meaning depends on the organization's
   * mealWeightMode. Default mode is PERCENTAGE_OF_100, in which the
   * active weights for an organization must sum to 100. That rule is a
   * cross-document invariant and is enforced in the service layer / Zod
   * validation, not here (a single document cannot see its siblings).
   */
  weight: number;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  /** Convenience flag; the effective range is the source of truth. */
  isCurrent: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const mealConfigSchema = new Schema<IMealConfig>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    mealTypeId: { type: Schema.Types.ObjectId, ref: "MealType", required: true },
    weight: {
      type: Number,
      required: true,
      min: 1,
      max: DEFAULT_MEAL_WEIGHT_TOTAL,
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: "weight must be an integer",
      },
    },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    isCurrent: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "meal_configs",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

mealConfigSchema.index(
  { organizationId: 1, mealTypeId: 1, effectiveFrom: -1 },
  { unique: true }
);
mealConfigSchema.index({ organizationId: 1, isCurrent: 1 });
mealConfigSchema.index({ organizationId: 1, effectiveFrom: 1, effectiveTo: 1 });
mealConfigSchema.index({ mealTypeId: 1 });

export const MealConfigModel: Model<IMealConfig> =
  (models.MealConfig as Model<IMealConfig>) ||
  model<IMealConfig>("MealConfig", mealConfigSchema);

export default MealConfigModel;
