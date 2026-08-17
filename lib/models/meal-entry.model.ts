import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { MEAL_ENTRY_STATUS } from "@/lib/constants/enums";
import type { MealEntryStatus } from "@/lib/constants/enums";

export interface IMealEntry {
  organizationId: Types.ObjectId;
  organizationMemberId: Types.ObjectId;
  date: Date;
  mealTypeId: Types.ObjectId;
  status: MealEntryStatus;
  isManualAdjustment: boolean;
  overrideReason?: string;
  notes?: string;
  createdByUserId?: Types.ObjectId | null;
  updatedByUserId?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const mealEntrySchema = new Schema<IMealEntry>(
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
    date: { type: Date, required: true },
    mealTypeId: { type: Schema.Types.ObjectId, ref: "MealType", required: true },
    status: {
      type: String,
      enum: Object.values(MEAL_ENTRY_STATUS),
      required: true,
      default: MEAL_ENTRY_STATUS.CONSUMED,
    },
    isManualAdjustment: { type: Boolean, default: false },
    overrideReason: { type: String, maxlength: 500 },
    notes: { type: String, maxlength: 500 },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
    collection: "meal_entries",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

mealEntrySchema.index(
  { organizationId: 1, organizationMemberId: 1, date: 1, mealTypeId: 1 },
  { unique: true }
);
mealEntrySchema.index({ organizationId: 1, date: 1 });
mealEntrySchema.index({ organizationId: 1, mealTypeId: 1, date: 1 });
mealEntrySchema.index({ organizationId: 1, organizationMemberId: 1, date: -1 });

export const MealEntryModel: Model<IMealEntry> =
  (models.MealEntry as Model<IMealEntry>) || model<IMealEntry>("MealEntry", mealEntrySchema);

export default MealEntryModel;
