import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { INVITATION_STATUS, ROLE_KEY } from "@/lib/constants/enums";
import type { InvitationStatus, RoleKey } from "@/lib/constants/enums";

export interface IInvitation {
  organizationId: Types.ObjectId;
  email: string;
  invitedByUserId: Types.ObjectId;
  roleKey: RoleKey;
  tokenHash: string;
  status: InvitationStatus;
  acceptedByUserId?: Types.ObjectId | null;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
  expiresAt: Date;
  message?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    invitedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    roleKey: {
      type: String,
      enum: Object.values(ROLE_KEY),
      required: true,
      default: ROLE_KEY.MEMBER,
    },
    tokenHash: { type: String, required: true, unique: true, select: false },
    status: {
      type: String,
      enum: Object.values(INVITATION_STATUS),
      required: true,
      default: INVITATION_STATUS.PENDING,
    },
    acceptedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    acceptedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
    message: { type: String, maxlength: 2000 },
  },
  {
    timestamps: true,
    collection: "invitations",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

invitationSchema.index(
  { organizationId: 1, email: 1 },
  { unique: true, partialFilterExpression: { status: INVITATION_STATUS.PENDING } }
);
invitationSchema.index({ email: 1 });
invitationSchema.index({ status: 1, expiresAt: 1 });

export const InvitationModel: Model<IInvitation> =
  (models.Invitation as Model<IInvitation>) ||
  model<IInvitation>("Invitation", invitationSchema);

export default InvitationModel;
