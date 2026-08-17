import { connectToDatabase } from "@/lib/db";
import { NotificationModel } from "@/lib/models";
import { NOTIFICATION_TYPE } from "@/lib/constants/enums";
import type { NotificationType } from "@/lib/constants/enums";

export interface NotifyInput {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

/** Fire-and-forget in-app notification writer. */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await connectToDatabase();
    await NotificationModel.create({
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? "",
      data: input.data,
    });
  } catch (error) {
    console.error("[notify] failed to write notification:", error);
  }
}

export { NOTIFICATION_TYPE };
