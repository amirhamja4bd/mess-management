import { Types } from "mongoose";
import { ROLE_KEY } from "@/lib/constants/enums";
import {
  ALL_PERMISSIONS,
  ADMIN_PERMISSIONS,
  MEMBER_PERMISSIONS,
  PERMISSION,
} from "@/lib/constants/permissions";
import type { Permission } from "@/lib/constants/permissions";
import { connectToDatabase } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { OrganizationMemberModel, OrganizationModel, RoleModel } from "@/lib/models";
import type { IOrganizationMember } from "@/lib/models";
import type { CurrentUser } from "@/lib/auth/session";

/**
 * Authorization: every protected endpoint resolves an OrgContext and then
 * checks membership + role + permission. Prevents Organization A users
 * from ever reaching Organization B data.
 */

export interface OrgContext {
  organizationId: string;
  organizationName: string;
  member: IOrganizationMember & { _id: Types.ObjectId };
  memberId: string;
  permissions: ReadonlySet<Permission>;
}

const DEFAULT_ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  [ROLE_KEY.ADMIN]: ADMIN_PERMISSIONS,
  [ROLE_KEY.MEMBER]: MEMBER_PERMISSIONS,
};

function toObjectId(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

/** Resolve the effective permission set for a membership. */
export async function resolveMemberPermissions(
  member: IOrganizationMember
): Promise<ReadonlySet<Permission>> {
  if (member.roleKey === ROLE_KEY.OWNER) {
    return new Set(ALL_PERMISSIONS);
  }

  const base: Permission[] = [];
  if (member.roleId) {
    await connectToDatabase();
    const role = await RoleModel.findById(member.roleId);
    if (role?.isActive) {
      base.push(...(role.permissions as Permission[]));
    }
  }
  if (base.length === 0) {
    base.push(...(DEFAULT_ROLE_PERMISSIONS[member.roleKey] ?? []));
  }

  return new Set([...base, ...(member.permissions as Permission[])]);
}

/**
 * Verify the user is an active member of the organization and build the
 * authorization context. Throws ForbiddenError when the user is not a
 * member (also hides whether the org exists).
 */
export async function getOrgContext(
  user: CurrentUser,
  organizationId: string
): Promise<OrgContext> {
  await connectToDatabase();

  const member = await OrganizationMemberModel.findOne({
    organizationId: toObjectId(organizationId),
    userId: toObjectId(user.id),
    status: { $in: ["ACTIVE"] },
  });

  if (!member) {
    throw new ForbiddenError("You are not a member of this organization");
  }

  const organization = await OrganizationModel.findById(organizationId);
  if (!organization || organization.archivedAt) {
    throw new NotFoundError("Organization not found");
  }

  const permissions = await resolveMemberPermissions(member);

  return {
    organizationId: organization._id.toString(),
    organizationName: organization.name,
    member,
    memberId: member._id.toString(),
    permissions,
  };
}

export function hasPermission(context: OrgContext, permission: Permission): boolean {
  return context.permissions.has(permission);
}

export function requirePermission(context: OrgContext, permission: Permission): void {
  if (!hasPermission(context, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
}

/** Load a membership that must belong to the given organization. */
export async function getOrgMember(
  organizationId: string,
  memberId: string
): Promise<IOrganizationMember & { _id: Types.ObjectId }> {
  await connectToDatabase();
  const member = await OrganizationMemberModel.findOne({
    _id: toObjectId(memberId),
    organizationId: toObjectId(organizationId),
  });
  if (!member) {
    throw new NotFoundError("Member not found in this organization");
  }
  return member;
}

export { PERMISSION as PERMISSION_KEYS };
