import { ROLE_KIND } from "@/lib/constants/enums";
import { connectToDatabase } from "@/lib/db";
import { BusinessRuleError, ConflictError, NotFoundError } from "@/lib/errors";
import { RoleModel } from "@/lib/models";
import type { OrgContext } from "@/lib/authorization";

export interface CreateRoleInput {
  name: string;
  key: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
  permissions?: string[];
  isActive?: boolean;
}

export async function listRoles(context: OrgContext) {
  await connectToDatabase();
  return RoleModel.find({ organizationId: context.organizationId }).sort({ kind: 1, name: 1 });
}

export async function createRole(context: OrgContext, input: CreateRoleInput) {
  await connectToDatabase();
  const existing = await RoleModel.findOne({
    organizationId: context.organizationId,
    key: input.key,
  });
  if (existing) {
    throw new ConflictError("A role with this key already exists");
  }
  return RoleModel.create({
    organizationId: context.organizationId,
    name: input.name,
    key: input.key,
    kind: ROLE_KIND.CUSTOM,
    description: input.description ?? undefined,
    permissions: input.permissions,
    isActive: true,
  });
}

export async function updateRole(context: OrgContext, roleId: string, input: UpdateRoleInput) {
  await connectToDatabase();
  const role = await RoleModel.findOne({
    _id: roleId,
    organizationId: context.organizationId,
  });
  if (!role) {
    throw new NotFoundError("Role not found");
  }
  if (role.kind === ROLE_KIND.SYSTEM) {
    throw new BusinessRuleError("System roles cannot be edited");
  }
  if (input.name !== undefined) {
    role.name = input.name;
  }
  if (input.description !== undefined) {
    role.description = input.description ?? undefined;
  }
  if (input.permissions !== undefined) {
    role.permissions = input.permissions;
  }
  if (input.isActive !== undefined) {
    role.isActive = input.isActive;
  }
  await role.save();
  return role;
}
