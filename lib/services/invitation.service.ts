import { INVITATION_STATUS, ROLE_KEY } from "@/lib/constants/enums";
import type { RoleKey } from "@/lib/constants/enums";
import { INVITATION_TTL_DAYS } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { InvitationModel, OrganizationMemberModel, UserModel } from "@/lib/models";
import { generateRandomToken, hashToken } from "@/lib/auth/tokens";
import { hashPassword } from "@/lib/auth/password";
import { buildInvitationLink, sendEmail } from "@/lib/services/email.service";
import type { CurrentUser } from "@/lib/auth/session";
import type { OrgContext } from "@/lib/authorization";

export interface CreateInvitationInput {
  email: string;
  roleKey: string;
  message?: string;
  expiresAt?: Date;
}

function assertInvitableRole(roleKey: string): void {
  if (roleKey === ROLE_KEY.OWNER) {
    throw new BusinessRuleError("Owner role cannot be granted via invitation");
  }
}

export async function createInvitation(
  context: OrgContext,
  actor: CurrentUser,
  input: CreateInvitationInput
) {
  await connectToDatabase();

  const email = input.email.toLowerCase();
  assertInvitableRole(input.roleKey);

  const memberByEmail = await UserModel.findOne({ email, deletedAt: null });
  if (memberByEmail) {
    const alreadyMember = await OrganizationMemberModel.findOne({
      organizationId: context.organizationId,
      userId: memberByEmail._id,
    });
    if (alreadyMember) {
      throw new ConflictError("This user is already a member of the organization");
    }
  }

  const pending = await InvitationModel.findOne({
    organizationId: context.organizationId,
    email,
    status: INVITATION_STATUS.PENDING,
  });
  if (pending) {
    throw new ConflictError("An active invitation already exists for this email");
  }

  const token = generateRandomToken();
  const expiresAt = input.expiresAt ?? new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await InvitationModel.create({
    organizationId: context.organizationId,
    email,
    invitedByUserId: actor.id,
    roleKey: input.roleKey as RoleKey,
    tokenHash: hashToken(token),
    status: INVITATION_STATUS.PENDING,
    expiresAt,
    message: input.message ?? undefined,
  });

  await sendEmail({
    to: email,
    subject: `You're invited to ${context.organizationName}`,
    text: `Join ${context.organizationName} on MessMate by opening: ${buildInvitationLink(token)}`,
  }, context.organizationId);

  return { invitation, inviteLink: buildInvitationLink(token) };
}

export async function resendInvitation(context: OrgContext, actor: CurrentUser, invitationId: string) {
  await connectToDatabase();
  const invitation = await InvitationModel.findOne({
    _id: invitationId,
    organizationId: context.organizationId,
  });
  if (!invitation) {
    throw new NotFoundError("Invitation not found");
  }
  if (invitation.status !== INVITATION_STATUS.PENDING) {
    throw new BusinessRuleError("Only pending invitations can be resent");
  }

  const token = generateRandomToken();
  invitation.tokenHash = hashToken(token);
  invitation.expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
  invitation.status = INVITATION_STATUS.PENDING;
  await invitation.save();

  await sendEmail({
    to: invitation.email,
    subject: `You're invited to ${context.organizationName}`,
    text: `Join ${context.organizationName} on MessMate by opening: ${buildInvitationLink(token)}`,
  }, context.organizationId);

  return { invitation, inviteLink: buildInvitationLink(token) };
}

export async function cancelInvitation(context: OrgContext, invitationId: string) {
  await connectToDatabase();
  const invitation = await InvitationModel.findOne({
    _id: invitationId,
    organizationId: context.organizationId,
  });
  if (!invitation) {
    throw new NotFoundError("Invitation not found");
  }
  if (invitation.status === INVITATION_STATUS.CANCELLED) {
    throw new ConflictError("Invitation is already cancelled");
  }
  if (
    invitation.status === INVITATION_STATUS.ACCEPTED ||
    invitation.status === INVITATION_STATUS.REJECTED
  ) {
    throw new BusinessRuleError("Invitation has already been resolved");
  }
  invitation.status = INVITATION_STATUS.CANCELLED;
  await invitation.save();
  return invitation;
}

export async function rejectInvitation(token: string) {
  await connectToDatabase();
  const invitation = await InvitationModel.findOne({ tokenHash: hashToken(token) });
  if (!invitation) {
    throw new NotFoundError("Invitation not found");
  }
  if (invitation.status !== INVITATION_STATUS.PENDING) {
    throw new BusinessRuleError("Invitation is no longer pending");
  }
  if (invitation.expiresAt.getTime() < Date.now()) {
    invitation.status = INVITATION_STATUS.EXPIRED;
    await invitation.save();
    throw new BusinessRuleError("Invitation has expired");
  }
  invitation.status = INVITATION_STATUS.REJECTED;
  invitation.rejectedAt = new Date();
  await invitation.save();
  return invitation;
}

export interface AcceptInvitationInput {
  token: string;
  name?: string;
  password?: string;
}

export async function acceptInvitation(input: AcceptInvitationInput) {
  await connectToDatabase();
  const invitation = await InvitationModel.findOne({ tokenHash: hashToken(input.token) });
  if (!invitation) {
    throw new NotFoundError("Invitation not found");
  }
  if (invitation.status !== INVITATION_STATUS.PENDING) {
    throw new BusinessRuleError("Invitation is no longer pending");
  }
  if (invitation.expiresAt.getTime() < Date.now()) {
    invitation.status = INVITATION_STATUS.EXPIRED;
    await invitation.save();
    throw new BusinessRuleError("Invitation has expired");
  }

  assertInvitableRole(invitation.roleKey);

  let user = await UserModel.findOne({ email: invitation.email, deletedAt: null });
  if (!user) {
    if (!input.password || !input.name) {
      throw new ValidationError(
        "This email has no account yet. Provide a name and password to create one."
      );
    }
    user = await UserModel.create({
      name: input.name,
      email: invitation.email,
      passwordHash: await hashPassword(input.password),
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    });
  }

  const existingMember = await OrganizationMemberModel.findOne({
    organizationId: invitation.organizationId,
    userId: user._id,
  });
  if (existingMember) {
    invitation.status = INVITATION_STATUS.ACCEPTED;
    invitation.acceptedByUserId = user._id;
    invitation.acceptedAt = new Date();
    await invitation.save();
    throw new ConflictError("You are already a member of this organization");
  }

  const membership = await OrganizationMemberModel.create({
    organizationId: invitation.organizationId,
    userId: user._id,
    roleKey: invitation.roleKey,
    permissions: [],
    status: "ACTIVE",
    joinedAt: new Date(),
    invitedByUserId: invitation.invitedByUserId,
  });

  invitation.status = INVITATION_STATUS.ACCEPTED;
  invitation.acceptedByUserId = user._id;
  invitation.acceptedAt = new Date();
  await invitation.save();

  return { user, membership };
}

export async function listInvitations(context: OrgContext) {
  await connectToDatabase();
  await InvitationModel.updateMany(
    {
      organizationId: context.organizationId,
      status: INVITATION_STATUS.PENDING,
      expiresAt: { $lt: new Date() },
    },
    { $set: { status: INVITATION_STATUS.EXPIRED } }
  );
  return InvitationModel.find({ organizationId: context.organizationId }).sort({ createdAt: -1 });
}
