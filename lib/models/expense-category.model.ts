import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { EXPENSE_CATEGORY_STATUS } from "@/lib/constants/enums";
import type { ExpenseCategoryStatus } from "@/lib/constants/enums";

export interface IExpenseCategory {
  organizationId: Types.ObjectId;
  name: string;
  /** Whether expenses in this category are food/bazar related. Used for reporting only. */
  isFood: boolean;
  color?: string;
  icon?: string;
  sortOrder: number;
  status: ExpenseCategoryStatus;
  archivedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const expenseCategorySchema = new Schema<IExpenseCategory>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    isFood: { type: Boolean, default: false },
    color: { type: String, maxlength: 20 },
    icon: { type: String, maxlength: 60 },
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
    collection: "expense_categories",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

expenseCategorySchema.index({ organizationId: 1, name: 1 }, { unique: true });
expenseCategorySchema.index({ organizationId: 1, status: 1, sortOrder: 1 });
expenseCategorySchema.index({ organizationId: 1, deletedAt: 1 });

export const ExpenseCategoryModel: Model<IExpenseCategory> =
  (models.ExpenseCategory as Model<IExpenseCategory>) ||
  model<IExpenseCategory>("ExpenseCategory", expenseCategorySchema);

export default ExpenseCategoryModel;
