import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";

export interface IAuditLog {
  organizationId?: Types.ObjectId | null;
  actorUserId?: Types.ObjectId | null;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId | null;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt?: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true, maxlength: 120 },
    entityType: { type: String, required: true, maxlength: 120 },
    entityId: { type: Schema.Types.ObjectId, default: null },
    changes: { type: Schema.Types.Mixed, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, maxlength: 64 },
    userAgent: { type: String, maxlength: 512 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "audit_logs",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ actorUserId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1 });

export const AuditLogModel: Model<IAuditLog> =
  (models.AuditLog as Model<IAuditLog>) || model<IAuditLog>("AuditLog", auditLogSchema);

export default AuditLogModel;
