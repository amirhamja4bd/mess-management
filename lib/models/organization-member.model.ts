import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { MEMBERSHIP_STATUS, ROLE_KEY } from "@/lib/constants/enums";
import type { MembershipStatus, RoleKey } from "@/lib/constants/enums";
import { ALL_PERMISSIONS } from "@/lib/constants/permissions";

export interface IOrganizationMember {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  roleKey: RoleKey;
  roleId?: Types.ObjectId | null;
  permissions: string[];
  status: MembershipStatus;
  /** Effective date the membership started. Drives mid-month join accounting. */
  joinedAt: Date;
  /** Effective date the membership ended. Drives mid-month leave accounting. */
  leftAt?: Date | null;
  invitedByUserId?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const organizationMemberSchema = new Schema<IOrganizationMember>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    roleKey: {
      type: String,
      enum: Object.values(ROLE_KEY),
      required: true,
      default: ROLE_KEY.MEMBER,
    },
    roleId: { type: Schema.Types.ObjectId, ref: "Role", default: null },
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator: (values: string[]) =>
          values.every((value) => (ALL_PERMISSIONS as readonly string[]).includes(value)),
        message: "permissions contains an unknown permission key",
      },
    },
    status: {
      type: String,
      enum: Object.values(MEMBERSHIP_STATUS),
      required: true,
      default: MEMBERSHIP_STATUS.ACTIVE,
    },
    joinedAt: { type: Date, required: true, default: Date.now },
    leftAt: { type: Date, default: null },
    invitedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
    collection: "organization_members",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
organizationMemberSchema.index({ organizationId: 1, status: 1 });
organizationMemberSchema.index({ organizationId: 1, joinedAt: 1 });
organizationMemberSchema.index({ userId: 1, status: 1 });

export const OrganizationMemberModel: Model<IOrganizationMember> =
  (models.OrganizationMember as Model<IOrganizationMember>) ||
  model<IOrganizationMember>("OrganizationMember", organizationMemberSchema);

export default OrganizationMemberModel;
