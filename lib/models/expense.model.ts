import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { DISTRIBUTION_METHOD, EXPENSE_STATUS } from "@/lib/constants/enums";
import type { DistributionMethod, ExpenseStatus } from "@/lib/constants/enums";

/**
 * Monetary fields (amount, unitPrice, total, shares) are stored as
 * integer minor units (paisa). See lib/money for helpers.
 */

export interface IExpenseParticipant {
  organizationMemberId: Types.ObjectId;
  /** Required when distribution.method is PERCENTAGE. Integer 0-100. */
  percent?: number;
  /** Required when distribution.method is FIXED_AMOUNT. In paisa. */
  amount?: number;
}

export interface IExpenseDistribution {
  method: DistributionMethod;
  /**
   * - EQUAL / MEAL_BASED: optional pre-resolved list; participants are
   *   resolved from membership at calculation time when absent.
   * - SELECTED_MEMBERS / PERCENTAGE / FIXED_AMOUNT / INDIVIDUAL:
   *   required participant list.
   */
  participants: IExpenseParticipant[];
  details?: string;
}

export interface IGroceryItem {
  name: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  total?: number;
  category?: string;
  notes?: string;
}

export interface IExpense {
  organizationId: Types.ObjectId;
  categoryId: Types.ObjectId;
  description: string;
  amount: number;
  expenseDate: Date;
  /** The member who paid / fronted the money for this expense. */
  paidByMemberId: Types.ObjectId;
  distribution: IExpenseDistribution;
  /** Itemized breakdown used for bazar/grocery entries. */
  items: IGroceryItem[];
  status: ExpenseStatus;
  approvedById?: Types.ObjectId | null;
  approvedAt?: Date | null;
  receiptFileId?: Types.ObjectId | null;
  createdByUserId: Types.ObjectId;
  updatedByUserId?: Types.ObjectId | null;
  voidedAt?: Date | null;
  voidedById?: Types.ObjectId | null;
  voidReason?: string;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const expenseParticipantSchema = new Schema<IExpenseParticipant>(
  {
    organizationMemberId: {
      type: Schema.Types.ObjectId,
      ref: "OrganizationMember",
      required: true,
    },
    percent: { type: Number, min: 0, max: 100 },
    amount: { type: Number, min: 0 },
  },
  { _id: false }
);

const expenseDistributionSchema = new Schema<IExpenseDistribution>(
  {
    method: {
      type: String,
      enum: Object.values(DISTRIBUTION_METHOD),
      required: true,
    },
    participants: { type: [expenseParticipantSchema], default: [] },
    details: { type: String, maxlength: 500 },
  },
  { _id: false }
);

const groceryItemSchema = new Schema<IGroceryItem>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    quantity: { type: Number, min: 0 },
    unit: { type: String, trim: true, maxlength: 30 },
    unitPrice: { type: Number, min: 0 },
    total: { type: Number, min: 0 },
    category: { type: String, trim: true, maxlength: 100 },
    notes: { type: String, maxlength: 500 },
  },
  { _id: false }
);

const expenseSchema = new Schema<IExpense>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    categoryId: { type: Schema.Types.ObjectId, ref: "ExpenseCategory", required: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: "amount must be an integer (minor units / paisa)",
      },
    },
    expenseDate: { type: Date, required: true },
    paidByMemberId: {
      type: Schema.Types.ObjectId,
      ref: "OrganizationMember",
      required: true,
    },
    distribution: {
      type: expenseDistributionSchema,
      required: true,
      default: () => ({ method: DISTRIBUTION_METHOD.EQUAL, participants: [] }),
    },
    items: { type: [groceryItemSchema], default: [] },
    status: {
      type: String,
      enum: Object.values(EXPENSE_STATUS),
      required: true,
      default: EXPENSE_STATUS.APPROVED,
    },
    approvedById: { type: Schema.Types.ObjectId, ref: "OrganizationMember", default: null },
    approvedAt: { type: Date, default: null },
    receiptFileId: { type: Schema.Types.ObjectId, ref: "File", default: null },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    voidedAt: { type: Date, default: null },
    voidedById: { type: Schema.Types.ObjectId, ref: "OrganizationMember", default: null },
    voidReason: { type: String, maxlength: 500 },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "expenses",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

expenseSchema.index({ organizationId: 1, expenseDate: -1 });
expenseSchema.index({ organizationId: 1, categoryId: 1 });
expenseSchema.index({ organizationId: 1, paidByMemberId: 1 });
expenseSchema.index({ organizationId: 1, status: 1 });
expenseSchema.index({ organizationId: 1, deletedAt: 1 });
expenseSchema.index({ "distribution.method": 1 });

export const ExpenseModel: Model<IExpense> =
  (models.Expense as Model<IExpense>) || model<IExpense>("Expense", expenseSchema);

export default ExpenseModel;
