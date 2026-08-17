import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { MONTHLY_CYCLE_STATUS } from "@/lib/constants/enums";
import type { MonthlyCycleStatus } from "@/lib/constants/enums";

export interface IMonthlyCycleTotals {
  totalExpense: number;
  foodExpense: number;
  commonExpense: number;
  individualExpense: number;
  totalPayments: number;
  totalAdjustments: number;
  totalSettlement: number;
  /** Residual from deterministic rounding during calculation; tracked, never dropped. */
  roundingAdjustment: number;
}

export interface IMonthlyCycleSnapshot {
  organizationSettings: Record<string, unknown>;
  mealConfig: Array<{
    mealTypeId: string;
    name: string;
    weight: number;
    effectiveFrom: Date;
    effectiveTo: Date | null;
  }>;
  categories: Array<{ categoryId: string; name: string; isFood: boolean }>;
  paymentMethods: Array<{ methodId: string; name: string }>;
  members: Array<{ memberId: string; userId: string; name: string; joinedAt: Date; leftAt: Date | null }>;
  capturedAt: Date;
}

export interface IMonthlyCycle {
  organizationId: Types.ObjectId;
  /** "YYYY-MM" unique per organization. */
  periodKey: string;
  startDate: Date;
  endDate: Date;
  status: MonthlyCycleStatus;
  totals: IMonthlyCycleTotals;
  snapshot: IMonthlyCycleSnapshot;
  calculatedAt?: Date | null;
  finalizedAt?: Date | null;
  closedAt?: Date | null;
  finalizedByUserId?: Types.ObjectId | null;
  closedByUserId?: Types.ObjectId | null;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const monthlyCycleTotalsSchema = new Schema<IMonthlyCycleTotals>(
  {
    totalExpense: { type: Number, default: 0 },
    foodExpense: { type: Number, default: 0 },
    commonExpense: { type: Number, default: 0 },
    individualExpense: { type: Number, default: 0 },
    totalPayments: { type: Number, default: 0 },
    totalAdjustments: { type: Number, default: 0 },
    totalSettlement: { type: Number, default: 0 },
    roundingAdjustment: { type: Number, default: 0 },
  },
  { _id: false }
);

const monthlyCycleSnapshotSchema = new Schema<IMonthlyCycleSnapshot>(
  {
    organizationSettings: { type: Schema.Types.Mixed, default: {} },
    mealConfig: {
      type: [
        {
          mealTypeId: { type: String, required: true },
          name: { type: String, required: true },
          weight: { type: Number, required: true },
          effectiveFrom: { type: Date, required: true },
          effectiveTo: { type: Date, default: null },
        },
      ],
      default: [],
    },
    categories: {
      type: [
        {
          categoryId: { type: String, required: true },
          name: { type: String, required: true },
          isFood: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    paymentMethods: {
      type: [{ methodId: { type: String, required: true }, name: { type: String, required: true } }],
      default: [],
    },
    members: {
      type: [
        {
          memberId: { type: String, required: true },
          userId: { type: String, required: true },
          name: { type: String, required: true },
          joinedAt: { type: Date, required: true },
          leftAt: { type: Date, default: null },
        },
      ],
      default: [],
    },
    capturedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const monthlyCycleSchema = new Schema<IMonthlyCycle>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    periodKey: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(MONTHLY_CYCLE_STATUS),
      required: true,
      default: MONTHLY_CYCLE_STATUS.OPEN,
    },
    totals: { type: monthlyCycleTotalsSchema, default: () => ({}) },
    snapshot: { type: monthlyCycleSnapshotSchema, default: () => ({}) },
    calculatedAt: { type: Date, default: null },
    finalizedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    finalizedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    closedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    notes: { type: String, maxlength: 2000 },
  },
  {
    timestamps: true,
    collection: "monthly_cycles",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

monthlyCycleSchema.index({ organizationId: 1, periodKey: 1 }, { unique: true });
monthlyCycleSchema.index({ organizationId: 1, status: 1 });

export const MonthlyCycleModel: Model<IMonthlyCycle> =
  (models.MonthlyCycle as Model<IMonthlyCycle>) ||
  model<IMonthlyCycle>("MonthlyCycle", monthlyCycleSchema);

export default MonthlyCycleModel;
