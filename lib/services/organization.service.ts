import mongoose from "mongoose";
import { ROLE_KIND, ROLE_KEY } from "@/lib/constants/enums";
import { ALL_PERMISSIONS, ADMIN_PERMISSIONS, MEMBER_PERMISSIONS } from "@/lib/constants/permissions";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_MEAL_TYPES,
  DEFAULT_MEAL_WEIGHTS,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_SUBSCRIPTION_PLAN,
} from "@/lib/constants/defaults";
import { DEFAULT_CURRENCY, DEFAULT_MEAL_WEIGHT_MODE } from "@/lib/constants";
import { currentPeriodKey, periodKeyToRange } from "@/lib/core/period";
import { connectToDatabase } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  ExpenseCategoryModel,
  MealConfigModel,
  MealTypeModel,
  MonthlyCycleModel,
  OrganizationMemberModel,
  OrganizationModel,
  PaymentMethodModel,
  RoleModel,
  SubscriptionModel,
} from "@/lib/models";
import { uniqueSlug } from "@/lib/utils/slug";
import type { CurrentUser } from "@/lib/auth/session";
import type { OrgContext } from "@/lib/authorization";
import type { IOrganizationSettings } from "@/lib/models";

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateOrganizationInput {
  name?: string;
  description?: string | null;
  logoUrl?: string | null;
  settings?: Record<string, unknown>;
}

const DEFAULT_SETTINGS: IOrganizationSettings = {
  currency: DEFAULT_CURRENCY,
  mealWeightMode: DEFAULT_MEAL_WEIGHT_MODE,
  accountingPeriodStartDay: 1,
  timezone: "Asia/Dhaka",
  defaultPaymentMethodId: undefined,
  allowMealOverrides: true,
};

export async function createOrganization(user: CurrentUser, input: CreateOrganizationInput) {
  await connectToDatabase();

  const slug = input.slug ? input.slug.toLowerCase() : uniqueSlug(input.name);
  const existingOrg = await OrganizationModel.findOne({ slug });
  if (existingOrg) {
    throw new ConflictError("An organization with this slug already exists");
  }

  const settings: IOrganizationSettings = {
    ...DEFAULT_SETTINGS,
    ...(input.settings as Partial<IOrganizationSettings> | undefined),
  };

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const [org] = await OrganizationModel.insertMany(
      [
        {
          name: input.name,
          slug,
          description: input.description ?? null,
          logoUrl: input.logoUrl ?? null,
          status: "ACTIVE",
          settings,
        },
      ],
      { session }
    );
    const orgId = org._id;

    const roles = await RoleModel.insertMany(
      [
        {
          organizationId: orgId,
          key: ROLE_KEY.OWNER,
          name: "Owner",
          kind: ROLE_KIND.SYSTEM,
          permissions: [...ALL_PERMISSIONS],
        },
        {
          organizationId: orgId,
          key: ROLE_KEY.ADMIN,
          name: "Admin",
          kind: ROLE_KIND.SYSTEM,
          permissions: [...ADMIN_PERMISSIONS],
        },
        {
          organizationId: orgId,
          key: ROLE_KEY.MEMBER,
          name: "Member",
          kind: ROLE_KIND.SYSTEM,
          permissions: [...MEMBER_PERMISSIONS],
        },
      ],
      { session }
    );
    const ownerRole = roles.find((role) => role.key === ROLE_KEY.OWNER)!;

    const [member] = await OrganizationMemberModel.insertMany(
      [
        {
          organizationId: orgId,
          userId: user.id,
          roleKey: ROLE_KEY.OWNER,
          roleId: ownerRole._id,
          permissions: [],
          status: "ACTIVE",
          joinedAt: new Date(),
        },
      ],
      { session }
    );

    await ExpenseCategoryModel.insertMany(
      DEFAULT_CATEGORIES.map((category) => ({ organizationId: orgId, ...category })),
      { session }
    );

    const mealTypes = await MealTypeModel.insertMany(
      DEFAULT_MEAL_TYPES.map((meal) => ({ organizationId: orgId, ...meal })),
      { session }
    );

    await MealConfigModel.insertMany(
      mealTypes.map((meal) => ({
        organizationId: orgId,
        mealTypeId: meal._id,
        weight: DEFAULT_MEAL_WEIGHTS[meal.name] ?? 0,
        effectiveFrom: new Date(0),
        isCurrent: true,
      })),
      { session }
    );

    await PaymentMethodModel.insertMany(
      DEFAULT_PAYMENT_METHODS.map((name, index) => ({
        organizationId: orgId,
        name,
        sortOrder: index,
        isActive: true,
      })),
      { session }
    );

    await SubscriptionModel.insertMany(
      [{ organizationId: orgId, planKey: DEFAULT_SUBSCRIPTION_PLAN, status: "TRIALING" }],
      { session }
    );

    const startDay = settings.accountingPeriodStartDay;
    const periodKey = currentPeriodKey(new Date(), startDay);
    const { startDate, endDate } = periodKeyToRange(periodKey, startDay);
    await MonthlyCycleModel.insertMany(
      [{ organizationId: orgId, periodKey, startDate, endDate, status: "OPEN" }],
      { session }
    );

    await session.commitTransaction();
    return { organization: org, member };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function getUserOrganizations(user: CurrentUser) {
  await connectToDatabase();
  const memberships = await OrganizationMemberModel.find({
    userId: user.id,
    status: { $in: ["ACTIVE"] },
  })
    .sort({ joinedAt: 1 })
    .populate<{ organizationId: InstanceType<typeof OrganizationModel> }>({
      path: "organizationId",
      match: { deletedAt: null, archivedAt: null },
    });

  return memberships
    .filter((membership) => membership.organizationId)
    .map((membership) => ({
      organization: membership.organizationId,
      roleKey: membership.roleKey,
      memberId: membership._id.toString(),
      joinedAt: membership.joinedAt,
    }));
}

export async function getOrganization(context: OrgContext) {
  return OrganizationModel.findById(context.organizationId);
}

export async function updateOrganization(
  context: OrgContext,
  input: UpdateOrganizationInput
): Promise<InstanceType<typeof OrganizationModel>> {
  await connectToDatabase();
  const organization = await OrganizationModel.findById(context.organizationId);
  if (!organization || organization.deletedAt) {
    throw new NotFoundError("Organization not found");
  }

  if (input.name !== undefined) {
    organization.name = input.name;
  }
  if (input.description !== undefined) {
    organization.description = input.description ?? undefined;
  }
  if (input.logoUrl !== undefined) {
    organization.logoUrl = input.logoUrl ?? undefined;
  }
  if (input.settings) {
    organization.settings = { ...organization.settings, ...input.settings };
    organization.markModified("settings");
  }
  await organization.save();
  return organization;
}

export async function archiveOrganization(context: OrgContext, reason?: string): Promise<void> {
  if (context.member.roleKey !== ROLE_KEY.OWNER) {
    throw new ForbiddenError("Only the organization owner can archive it");
  }
  await connectToDatabase();
  const organization = await OrganizationModel.findById(context.organizationId);
  if (!organization) {
    throw new NotFoundError("Organization not found");
  }
  if (organization.archivedAt) {
    throw new ConflictError("Organization is already archived");
  }
  organization.archivedAt = new Date();
  organization.status = "ARCHIVED";
  if (reason) {
    organization.description = [organization.description ?? "", `[archived: ${reason}]`]
      .filter(Boolean)
      .join(" ")
      .slice(0, 2000);
  }
  await organization.save();
}

export async function restoreOrganization(context: OrgContext): Promise<void> {
  if (context.member.roleKey !== ROLE_KEY.OWNER) {
    throw new ForbiddenError("Only the organization owner can restore it");
  }
  await connectToDatabase();
  const organization = await OrganizationModel.findById(context.organizationId);
  if (!organization) {
    throw new NotFoundError("Organization not found");
  }
  organization.archivedAt = null;
  organization.status = "ACTIVE";
  await organization.save();
}
