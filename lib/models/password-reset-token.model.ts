import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";

export interface IPasswordResetToken {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "password_reset_tokens",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

passwordResetTokenSchema.index({ userId: 1, usedAt: 1 });

export const PasswordResetTokenModel: Model<IPasswordResetToken> =
  (models.PasswordResetToken as Model<IPasswordResetToken>) ||
  model<IPasswordResetToken>("PasswordResetToken", passwordResetTokenSchema);
