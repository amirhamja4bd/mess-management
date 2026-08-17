import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { ROLE_KIND } from "@/lib/constants/enums";
import type { RoleKind } from "@/lib/constants/enums";
import { ALL_PERMISSIONS } from "@/lib/constants/permissions";

export interface IRole {
  organizationId: Types.ObjectId;
  key: string;
  name: string;
  kind: RoleKind;
  description?: string;
  permissions: string[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const roleSchema = new Schema<IRole>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    key: { type: String, required: true, uppercase: true, trim: true, maxlength: 60 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    kind: {
      type: String,
      enum: Object.values(ROLE_KIND),
      required: true,
      default: ROLE_KIND.CUSTOM,
    },
    description: { type: String, maxlength: 500 },
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator: (values: string[]) =>
          values.every((value) => (ALL_PERMISSIONS as readonly string[]).includes(value)),
        message: "permissions contains an unknown permission key",
      },
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "roles",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

roleSchema.index({ organizationId: 1, key: 1 }, { unique: true });
roleSchema.index({ organizationId: 1, isActive: 1 });

export const RoleModel: Model<IRole> =
  (models.Role as Model<IRole>) || model<IRole>("Role", roleSchema);

export default RoleModel;
