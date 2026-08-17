import { Schema, model, models } from "mongoose";
import type { Model } from "mongoose";
import { USER_STATUS } from "@/lib/constants/enums";
import type { UserStatus } from "@/lib/constants/enums";

export interface IUser {
  name: string;
  email: string;
  phone?: string;
  passwordHash?: string;
  avatarUrl?: string;
  status: UserStatus;
  emailVerifiedAt?: Date | null;
  lastLoginAt?: Date | null;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      index: true,
    },
    phone: { type: String, trim: true, maxlength: 30 },
    passwordHash: { type: String, select: false },
    avatarUrl: { type: String, maxlength: 2000 },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
      required: true,
    },
    emailVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "users",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

userSchema.index({ status: 1 });
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ deletedAt: 1 });

export const UserModel: Model<IUser> =
  (models.User as Model<IUser>) || model<IUser>("User", userSchema);

export default UserModel;
