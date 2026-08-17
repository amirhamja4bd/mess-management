import { ROLE_KEY } from "@/lib/constants/enums";
import { connectToDatabase } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { OrganizationMemberModel, UserModel } from "@/lib/models";
import { recordAudit } from "@/lib/services/audit.service";
import type { OrgContext } from "@/lib/authorization";
import { paginationResult, sortClause } from "@/lib/utils/pagination";

function actorId(context: OrgContext): string {
  return context.member.userId.toString();
}

export interface ListMembersOptions {
  page?: number;
  limit?: number;
  status?: string;
  roleKey?: string;
  q?: string;
}

async function assertCanModifyMember(context: OrgContext, targetMemberId: string) {
  const target = await OrganizationMemberModel.findOne({
    _id: targetMemberId,
    organizationId: context.organizationId,
  });
  if (!target) {
    throw new NotFoundError("Member not found");
  }

  if (target.roleKey === ROLE_KEY.OWNER) {
    if (context.member.roleKey !== ROLE_KEY.OWNER) {
      throw new ForbiddenError("Only the owner can modify another owner");
    }
    if (target._id.toString() === context.memberId) {
      throw new ForbiddenError("You cannot modify your own owner membership");
    }
  }

  const activeOwners = await OrganizationMemberModel.countDocuments({
    organizationId: context.organizationId,
    roleKey: ROLE_KEY.OWNER,
    status: { $in: ["ACTIVE"] },
  });
  if (target.roleKey === ROLE_KEY.OWNER && activeOwners <= 1) {
    throw new ConflictError("The organization must keep at least one active owner");
  }

  return target;
}

export async function listMembers(context: OrgContext, options: ListMembersOptions = {}) {
  await connectToDatabase();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;

  const filter: Record<string, unknown> = { organizationId: context.organizationId };
  if (options.status) {
    filter.status = options.status;
  }
  if (options.roleKey) {
    filter.roleKey = options.roleKey;
  }
  if (options.q) {
    const users = await UserModel.find({
      deletedAt: null,
      $or: [
        { name: { $regex: options.q, $options: "i" } },
        { email: { $regex: options.q, $options: "i" } },
      ],
    }).select("_id");
    filter.userId = { $in: users.map((user) => user._id) };
  }

  const total = await OrganizationMemberModel.countDocuments(filter);
  const items = await OrganizationMemberModel.find(filter)
    .sort(sortClause("joinedAt", "desc"))
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("userId")
    .populate("roleId");

  return { items, pagination: paginationResult(total, page, limit) };
}

export async function getMember(context: OrgContext, memberId: string) {
  await connectToDatabase();
  const member = await OrganizationMemberModel.findOne({
    _id: memberId,
    organizationId: context.organizationId,
  })
    .populate("userId")
    .populate("roleId");
  if (!member) {
    throw new NotFoundError("Member not found");
  }
  return member;
}

export async function changeMemberRole(
  context: OrgContext,
  memberId: string,
  input: { roleKey: string; roleId?: string | null }
) {
  if (input.roleKey === ROLE_KEY.OWNER) {
    throw new ForbiddenError("Owner role cannot be granted this way");
  }
  const target = await assertCanModifyMember(context, memberId);
  const previousRole = target.roleKey;
  target.roleKey = input.roleKey as typeof ROLE_KEY[keyof typeof ROLE_KEY];
  target.roleId = input.roleId ? (input.roleId as never) : null;
  await target.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actorId(context),
    action: "member.role_changed",
    entityType: "OrganizationMember",
    entityId: target._id.toString(),
    changes: { previousRole, roleKey: target.roleKey, roleId: input.roleId ?? null },
  });

  return target;
}

export async function updateMemberPermissions(context: OrgContext, memberId: string, permissions: string[]) {
  const target = await assertCanModifyMember(context, memberId);
  if (target.roleKey === ROLE_KEY.OWNER) {
    throw new ForbiddenError("Owner permissions are fixed");
  }
  const previousPermissions = target.permissions ?? [];
  target.permissions = permissions;
  await target.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actorId(context),
    action: "member.permissions_updated",
    entityType: "OrganizationMember",
    entityId: target._id.toString(),
    changes: { previousPermissions, permissions },
  });

  return target;
}

export async function suspendMember(context: OrgContext, memberId: string) {
  const target = await assertCanModifyMember(context, memberId);
  if (target.status === "SUSPENDED") {
    throw new ConflictError("Member is already suspended");
  }
  if (target._id.toString() === context.memberId) {
    throw new ForbiddenError("You cannot suspend yourself");
  }
  target.status = "SUSPENDED";
  await target.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actorId(context),
    action: "member.suspended",
    entityType: "OrganizationMember",
    entityId: target._id.toString(),
  });

  return target;
}

export async function removeMember(context: OrgContext, memberId: string, leftAt?: Date) {
  const target = await assertCanModifyMember(context, memberId);
  if (target.status === "LEFT") {
    throw new ConflictError("Member has already left");
  }
  target.status = "LEFT";
  target.leftAt = leftAt ?? new Date();
  await target.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actorId(context),
    action: "member.removed",
    entityType: "OrganizationMember",
    entityId: target._id.toString(),
    changes: { leftAt: target.leftAt?.toISOString() ?? null },
  });

  return target;
}

export async function restoreMember(context: OrgContext, memberId: string) {
  const target = await assertCanModifyMember(context, memberId);
  if (target.status !== "LEFT" && target.status !== "SUSPENDED") {
    throw new ConflictError("Member is not left or suspended");
  }
  target.status = "ACTIVE";
  target.leftAt = null;
  await target.save();

  void recordAudit({
    organizationId: context.organizationId,
    actorUserId: actorId(context),
    action: "member.restored",
    entityType: "OrganizationMember",
    entityId: target._id.toString(),
  });

  return target;
}
