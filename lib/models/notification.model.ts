import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { NOTIFICATION_STATUS, NOTIFICATION_TYPE } from "@/lib/constants/enums";
import type { NotificationStatus, NotificationType } from "@/lib/constants/enums";

export interface INotification {
  organizationId?: Types.ObjectId | null;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  status: NotificationStatus;
  readAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      required: true,
      default: NOTIFICATION_TYPE.SYSTEM,
    },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, maxlength: 2000 },
    data: { type: Schema.Types.Mixed, default: null },
    status: {
      type: String,
      enum: Object.values(NOTIFICATION_STATUS),
      required: true,
      default: NOTIFICATION_STATUS.UNREAD,
    },
    readAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "notifications",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

notificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });

export const NotificationModel: Model<INotification> =
  (models.Notification as Model<INotification>) ||
  model<INotification>("Notification", notificationSchema);

export default NotificationModel;
