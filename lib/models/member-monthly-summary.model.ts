import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { MONTHLY_CYCLE_STATUS } from "@/lib/constants/enums";

/**
 * MemberMonthlySummary — per member result of a monthly calculation.
 *
 * Balance sign convention (documented and mirrored in tests):
 *   netBalance > 0  => member owes money (needs to pay)
 *   netBalance < 0  => member should receive money
 *   netBalance = 0  => settled
 */

export interface IMemberSummaryTotals {
  foodShare: number;
  commonShare: number;
  individualShare: number;
  otherLiability: number;
  totalLiability: number;
  totalPaid: number;
  totalCredit: number;
  applicableAdvance: number;
  netBalance: number;
  roundingAdjustment: number;
}

export interface IMemberMealStat {
  mealTypeId: string;
  name: string;
  weight: number;
  /** Number of consumed/valid entries for this meal type. */
  count: number;
  /** weight * count (aggregate meal units). */
  units: number;
}

export interface IMemberSummarySnapshot {
  mealWeightMode: string;
  capturedAt: Date;
}

export interface IMemberMonthlySummary {
  organizationId: Types.ObjectId;
  cycleId: Types.ObjectId;
  organizationMemberId: Types.ObjectId;
  totals: IMemberSummaryTotals;
  mealStats: IMemberMealStat[];
  paymentStats: {
    totalContribution: number;
    totalAdvance: number;
    totalSettlementPaid: number;
    totalRefund: number;
  };
  snapshot: IMemberSummarySnapshot;
  status: (typeof MONTHLY_CYCLE_STATUS)[keyof typeof MONTHLY_CYCLE_STATUS];
  createdAt?: Date;
  updatedAt?: Date;
}

const memberSummaryTotalsSchema = new Schema<IMemberSummaryTotals>(
  {
    foodShare: { type: Number, default: 0 },
    commonShare: { type: Number, default: 0 },
    individualShare: { type: Number, default: 0 },
    otherLiability: { type: Number, default: 0 },
    totalLiability: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },
    applicableAdvance: { type: Number, default: 0 },
    netBalance: { type: Number, default: 0 },
    roundingAdjustment: { type: Number, default: 0 },
  },
  { _id: false }
);

const memberMealStatSchema = new Schema<IMemberMealStat>(
  {
    mealTypeId: { type: String, required: true },
    name: { type: String, required: true },
    weight: { type: Number, required: true },
    count: { type: Number, required: true, default: 0 },
    units: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const memberSummarySnapshotSchema = new Schema<IMemberSummarySnapshot>(
  {
    mealWeightMode: { type: String, default: "PERCENTAGE_OF_100" },
    capturedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const memberMonthlySummarySchema = new Schema<IMemberMonthlySummary>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    cycleId: { type: Schema.Types.ObjectId, ref: "MonthlyCycle", required: true },
    organizationMemberId: {
      type: Schema.Types.ObjectId,
      ref: "OrganizationMember",
      required: true,
    },
    totals: { type: memberSummaryTotalsSchema, default: () => ({}) },
    mealStats: { type: [memberMealStatSchema], default: [] },
    paymentStats: {
      type: {
        totalContribution: { type: Number, default: 0 },
        totalAdvance: { type: Number, default: 0 },
        totalSettlementPaid: { type: Number, default: 0 },
        totalRefund: { type: Number, default: 0 },
      },
      default: () => ({}),
    },
    snapshot: { type: memberSummarySnapshotSchema, default: () => ({}) },
    status: {
      type: String,
      enum: Object.values(MONTHLY_CYCLE_STATUS),
      default: MONTHLY_CYCLE_STATUS.OPEN,
    },
  },
  {
    timestamps: true,
    collection: "member_monthly_summaries",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

memberMonthlySummarySchema.index(
  { cycleId: 1, organizationMemberId: 1 },
  { unique: true }
);
memberMonthlySummarySchema.index({ organizationId: 1, cycleId: 1 });
memberMonthlySummarySchema.index({ organizationId: 1, organizationMemberId: 1 });

export const MemberMonthlySummaryModel: Model<IMemberMonthlySummary> =
  (models.MemberMonthlySummary as Model<IMemberMonthlySummary>) ||
  model<IMemberMonthlySummary>("MemberMonthlySummary", memberMonthlySummarySchema);

export default MemberMonthlySummaryModel;
