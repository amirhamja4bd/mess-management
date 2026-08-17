import { ok } from "@/lib/api-response";
import { parseBody, parseOptionalBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import {
  changeMemberRole,
  getMember,
  removeMember,
} from "@/lib/services/member.service";
import { changeMemberRoleSchema, removeMemberSchema } from "@/lib/schemas";

export const GET = withOrgHandler(async (_request, { params, context }) => {
  requirePermission(context, PERMISSION.MEMBERS_VIEW);
  return ok(await getMember(context, params.memberId));
});

export const PATCH = withOrgHandler(async (request, { params, context }) => {
  requirePermission(context, PERMISSION.MEMBERS_MANAGE);
  const input = await parseBody(request, changeMemberRoleSchema);
  return ok(await changeMemberRole(context, params.memberId, input));
});

export const DELETE = withOrgHandler(async (request, { params, context }) => {
  requirePermission(context, PERMISSION.MEMBERS_MANAGE);
  const input = await parseOptionalBody(request, removeMemberSchema, {});
  return ok(await removeMember(context, params.memberId, input.leftAt));
});
