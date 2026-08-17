import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { MEAL_DAY_STATUS } from "@/lib/constants/enums";
import type { MealDayStatus } from "@/lib/constants/enums";

export interface IMealDayStatus {
  organizationId: Types.ObjectId;
  date: Date;
  mealTypeId: Types.ObjectId;
  /** CANCELLED = meal was unavailable/kitchen closed for this day. */
  status: MealDayStatus;
  reason?: string;
  setByUserId?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const mealDayStatusSchema = new Schema<IMealDayStatus>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    date: { type: Date, required: true },
    mealTypeId: { type: Schema.Types.ObjectId, ref: "MealType", required: true },
    status: {
      type: String,
      enum: Object.values(MEAL_DAY_STATUS),
      required: true,
      default: MEAL_DAY_STATUS.CANCELLED,
    },
    reason: { type: String, maxlength: 500 },
    setByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
    collection: "meal_day_statuses",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

mealDayStatusSchema.index(
  { organizationId: 1, date: 1, mealTypeId: 1 },
  { unique: true }
);
mealDayStatusSchema.index({ organizationId: 1, date: 1 });

export const MealDayStatusModel: Model<IMealDayStatus> =
  (models.MealDayStatus as Model<IMealDayStatus>) ||
  model<IMealDayStatus>("MealDayStatus", mealDayStatusSchema);

export default MealDayStatusModel;
