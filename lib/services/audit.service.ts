import { connectToDatabase } from "@/lib/db";
import { AuditLogModel } from "@/lib/models";
import { Types } from "mongoose";
import type { OrgContext } from "@/lib/authorization";
import { paginationResult } from "@/lib/utils/pagination";

export interface AuditInput {
  organizationId?: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export interface ListAuditLogsOptions {
  page?: number;
  limit?: number;
  entityType?: string;
  entityId?: string;
  action?: string;
  actorUserId?: string;
  from?: Date | null;
  to?: Date | null;
}

function toId(value?: string): Types.ObjectId | null {
  if (!value) {
    return null;
  }
  try {
    return new Types.ObjectId(value);
  } catch {
    return null;
  }
}

/** Fire-and-forget audit log writer. Never fails the calling operation. */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await connectToDatabase();
    await AuditLogModel.create({
      organizationId: toId(input.organizationId),
      actorUserId: toId(input.actorUserId),
      action: input.action,
      entityType: input.entityType,
      entityId: toId(input.entityId),
      changes: input.changes,
      metadata: input.metadata,
      ip: input.ip,
      userAgent: input.userAgent,
    });
  } catch (error) {
    console.error("[audit] failed to write audit log:", error);
  }
}

/** Paginated, filtered audit log listing for an organization. */
export async function listAuditLogs(context: OrgContext, options: ListAuditLogsOptions = {}) {
  await connectToDatabase();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;

  const filter: Record<string, unknown> = { organizationId: context.organizationId };
  if (options.entityType) {
    filter.entityType = options.entityType;
  }
  if (options.entityId) {
    filter.entityId = toId(options.entityId);
  }
  if (options.action) {
    filter.action = options.action;
  }
  if (options.actorUserId) {
    filter.actorUserId = toId(options.actorUserId);
  }
  if (options.from || options.to) {
    const createdAt: { $gte?: Date; $lte?: Date } = {};
    if (options.from) {
      createdAt.$gte = options.from;
    }
    if (options.to) {
      createdAt.$lte = options.to;
    }
    filter.createdAt = createdAt;
  }

  const total = await AuditLogModel.countDocuments(filter);
  const items = await AuditLogModel.find(filter as never)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({ path: "actorUserId", select: "name email" });

  return { items, pagination: paginationResult(total, page, limit) };
}
