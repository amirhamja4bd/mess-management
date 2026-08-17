import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { EXPENSE_CATEGORY_STATUS } from "@/lib/constants/enums";

export interface IMealType {
  organizationId: Types.ObjectId;
  name: string;
  sortOrder: number;
  status: (typeof EXPENSE_CATEGORY_STATUS)[keyof typeof EXPENSE_CATEGORY_STATUS];
  archivedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const mealTypeSchema = new Schema<IMealType>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    sortOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(EXPENSE_CATEGORY_STATUS),
      required: true,
      default: EXPENSE_CATEGORY_STATUS.ACTIVE,
    },
    archivedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "meal_types",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

mealTypeSchema.index({ organizationId: 1, name: 1 }, { unique: true });
mealTypeSchema.index({ organizationId: 1, status: 1, sortOrder: 1 });
mealTypeSchema.index({ organizationId: 1, deletedAt: 1 });

export const MealTypeModel: Model<IMealType> =
  (models.MealType as Model<IMealType>) || model<IMealType>("MealType", mealTypeSchema);

export default MealTypeModel;
