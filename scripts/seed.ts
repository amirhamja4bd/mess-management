import "dotenv/config";
import mongoose from "mongoose";
import { connectToDatabase, disconnectFromDatabase } from "../lib/db";
import {
  AdjustmentModel,
  ExpenseCategoryModel,
  ExpenseModel,
  MealConfigModel,
  MealEntryModel,
  MealTypeModel,
  MonthlyCycleModel,
  OrganizationMemberModel,
  OrganizationModel,
  PaymentMethodModel,
  PaymentModel,
  RoleModel,
  SubscriptionModel,
  UserModel,
} from "../lib/models";
import { DISTRIBUTION_METHOD, MEAL_ENTRY_STATUS, PAYMENT_TYPE, ROLE_KEY, ROLE_KIND } from "../lib/constants/enums";
import type { MealEntryStatus } from "../lib/constants/enums";
import { ADMIN_PERMISSIONS, MEMBER_PERMISSIONS } from "../lib/constants/permissions";

/**
 * Development seed data. Creates a demo user + organization with dynamic
 * configuration (categories, meal types/weights, payment methods), an open
 * monthly cycle, and a few sample transactions.
 *
 * Usage:
 *   yarn db:seed            # idempotent, reuses existing records
 *   yarn db:seed --fresh    # drops seeded collections first
 */

const FRESH = process.argv.includes("--fresh");

const SEEDED_COLLECTIONS = [
  "users",
  "organizations",
  "organization_members",
  "roles",
  "expense_categories",
  "meal_types",
  "meal_configs",
  "payment_methods",
  "subscriptions",
  "monthly_cycles",
  "expenses",
  "meal_entries",
  "payments",
  "adjustments",
  "settlements",
  "settlement_transactions",
];

async function fresh(): Promise<void> {
  for (const name of SEEDED_COLLECTIONS) {
    await mongoose.connection.dropCollection(name).catch(() => undefined);
  }
}

function currentPeriodKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

async function main(): Promise<void> {
  await connectToDatabase();
  if (FRESH) {
    console.log("Dropping seeded collections...");
    await fresh();
  }

  const existing = await UserModel.findOne({ email: "amir@example.com" });
  if (existing) {
    console.log("Seed data already present (amir@example.com). Use --fresh to reset.");
    await disconnectFromDatabase();
    return;
  }

  console.log("Creating demo user...");
  const user = await UserModel.create({
    name: "Amir",
    email: "amir@example.com",
    status: "ACTIVE",
  });
  const userId = user._id;

  const slug = `mirpur-mess-${Date.now()}`;
  console.log("Creating organization...");
  const org = await OrganizationModel.create({
    name: "Mirpur Mess",
    slug,
    settings: {
      currency: "BDT",
      mealWeightMode: "PERCENTAGE_OF_100",
      accountingPeriodStartDay: 1,
      timezone: "Asia/Dhaka",
      allowMealOverrides: true,
    },
  });
  const orgId = org._id;

  console.log("Seeding system roles...");
  const ownerRole = await RoleModel.create({
    organizationId: orgId,
    key: ROLE_KEY.OWNER,
    name: "Owner",
    kind: ROLE_KIND.SYSTEM,
    permissions: [],
  });
  await RoleModel.create({
    organizationId: orgId,
    key: ROLE_KEY.ADMIN,
    name: "Admin",
    kind: ROLE_KIND.SYSTEM,
    permissions: [...ADMIN_PERMISSIONS],
  });
  await RoleModel.create({
    organizationId: orgId,
    key: ROLE_KEY.MEMBER,
    name: "Member",
    kind: ROLE_KIND.SYSTEM,
    permissions: [...MEMBER_PERMISSIONS],
  });

  console.log("Creating OWNER membership...");
  const ownerMember = await OrganizationMemberModel.create({
    organizationId: orgId,
    userId,
    roleKey: ROLE_KEY.OWNER,
    roleId: ownerRole._id,
    permissions: [],
    status: "ACTIVE",
    joinedAt: new Date(),
  });

  console.log("Creating MEMBER memberships...");
  const memberRole = await RoleModel.findOne({
    organizationId: orgId,
    key: ROLE_KEY.MEMBER,
  });
  const rahim = await UserModel.create({ name: "Rahim", email: "rahim@example.com", status: "ACTIVE" });
  const karim = await UserModel.create({ name: "Karim", email: "karim@example.com", status: "ACTIVE" });
  const rahimMember = await OrganizationMemberModel.create({
    organizationId: orgId,
    userId: rahim._id,
    roleKey: ROLE_KEY.MEMBER,
    roleId: memberRole!._id,
    permissions: [],
    status: "ACTIVE",
    joinedAt: new Date(),
  });
  const karimMember = await OrganizationMemberModel.create({
    organizationId: orgId,
    userId: karim._id,
    roleKey: ROLE_KEY.MEMBER,
    roleId: memberRole!._id,
    permissions: [],
    status: "ACTIVE",
    joinedAt: new Date(),
  });

  console.log("Seeding expense categories...");
  const categories = [
    { name: "Rent", isFood: false, sortOrder: 0 },
    { name: "Electricity", isFood: false, sortOrder: 1 },
    { name: "Water", isFood: false, sortOrder: 2 },
    { name: "WiFi", isFood: false, sortOrder: 3 },
    { name: "Gas", isFood: false, sortOrder: 4 },
    { name: "Grocery", isFood: true, sortOrder: 5 },
    { name: "Cooking", isFood: true, sortOrder: 6 },
    { name: "Maintenance", isFood: false, sortOrder: 7 },
    { name: "Others", isFood: false, sortOrder: 8 },
  ];
  const categoryDocs = await ExpenseCategoryModel.insertMany(
    categories.map((c) => ({ organizationId: orgId, ...c }))
  );
  const groceryCategory = categoryDocs.find((c) => c.name === "Grocery")!;
  const electricityCategory = categoryDocs.find((c) => c.name === "Electricity")!;

  console.log("Seeding meal types and weights (Breakfast 20 / Lunch 40 / Dinner 40)...");
  const meals = await MealTypeModel.insertMany(
    ["Breakfast", "Lunch", "Dinner"].map((name, index) => ({
      organizationId: orgId,
      name,
      sortOrder: index,
    }))
  );
  const weights = [20, 40, 40];
  await MealConfigModel.insertMany(
    meals.map((meal, index) => ({
      organizationId: orgId,
      mealTypeId: meal._id,
      weight: weights[index],
      effectiveFrom: new Date(0),
      isCurrent: true,
    }))
  );

  console.log("Seeding payment methods...");
  await PaymentMethodModel.insertMany(
    ["Cash", "bKash", "Nagad", "Bank", "Other"].map((name, index) => ({
      organizationId: orgId,
      name,
      sortOrder: index,
      isActive: true,
    }))
  );

  console.log("Seeding subscription...");
  await SubscriptionModel.create({
    organizationId: orgId,
    planKey: "FREE",
    status: "TRIALING",
  });

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  console.log("Opening monthly cycle...");
  await MonthlyCycleModel.create({
    organizationId: orgId,
    periodKey: currentPeriodKey(now),
    startDate: start,
    endDate: end,
    status: "OPEN",
  });

  console.log("Seeding sample expenses...");
  await ExpenseModel.create({
    organizationId: orgId,
    categoryId: groceryCategory._id,
    description: "Bazar - rice, oil, vegetables",
    amount: 471000,
    expenseDate: new Date(now.getFullYear(), now.getMonth(), 1),
    paidByMemberId: ownerMember._id,
    distribution: { method: DISTRIBUTION_METHOD.MEAL_BASED, participants: [] },
    items: [
      { name: "Rice", quantity: 25, unit: "kg", unitPrice: 9600, total: 240000 },
      { name: "Oil", quantity: 5, unit: "L", unitPrice: 17000, total: 85000 },
      { name: "Vegetables", total: 56000 },
      { name: "Chicken", total: 90000 },
    ],
    status: "APPROVED",
    createdByUserId: userId,
  });
  await ExpenseModel.create({
    organizationId: orgId,
    categoryId: electricityCategory._id,
    description: "Electricity bill",
    amount: 2000000,
    expenseDate: new Date(now.getFullYear(), now.getMonth(), 5),
    paidByMemberId: rahimMember._id,
    distribution: { method: DISTRIBUTION_METHOD.EQUAL, participants: [] },
    status: "APPROVED",
    createdByUserId: userId,
  });

  console.log("Seeding sample meal entries...");
  const day1 = new Date(now.getFullYear(), now.getMonth(), 1);
  const day2 = new Date(now.getFullYear(), now.getMonth(), 2);
  const day3 = new Date(now.getFullYear(), now.getMonth(), 3);
  const attendance: Array<[typeof ownerMember, Date, MealEntryStatus]> = [
    [ownerMember, day1, MEAL_ENTRY_STATUS.CONSUMED],
    [ownerMember, day2, MEAL_ENTRY_STATUS.CONSUMED],
    [ownerMember, day3, MEAL_ENTRY_STATUS.AWAY],
    [rahimMember, day1, MEAL_ENTRY_STATUS.CONSUMED],
    [rahimMember, day2, MEAL_ENTRY_STATUS.NOT_CONSUMED],
    [rahimMember, day3, MEAL_ENTRY_STATUS.CONSUMED],
    [karimMember, day1, MEAL_ENTRY_STATUS.CONSUMED],
    [karimMember, day2, MEAL_ENTRY_STATUS.CONSUMED],
    [karimMember, day3, MEAL_ENTRY_STATUS.CONSUMED],
  ];
  for (const meal of meals) {
    for (const [member, date, status] of attendance) {
      await MealEntryModel.create({
        organizationId: orgId,
        organizationMemberId: member._id,
        date,
        mealTypeId: meal._id,
        status,
        createdByUserId: userId,
      });
    }
  }

  console.log("Seeding sample payment...");
  const payment = await PaymentModel.create({
    organizationId: orgId,
    organizationMemberId: rahimMember._id,
    amount: 1000000,
    paymentDate: new Date(now.getFullYear(), now.getMonth(), 2),
    methodName: "bKash",
    type: PAYMENT_TYPE.CONTRIBUTION,
    status: "COMPLETED",
    createdByUserId: userId,
  });

  console.log("Seeding sample adjustment...");
  await AdjustmentModel.create({
    organizationId: orgId,
    organizationMemberId: karimMember._id,
    type: "CREDIT",
    amount: 10000,
    reason: "Round-off adjustment",
    adjustmentDate: now,
    createdByUserId: userId,
  });

  console.log(`Seeded:
  - Users: ${user.email}, ${rahim.email}, ${karim.email}
  - Organization: ${org.name} (${org.slug})
  - Members: ${ownerMember._id}, ${rahimMember._id}, ${karimMember._id}
  - Categories: ${categoryDocs.length}
  - Meal types: ${meals.map((m) => m.name).join(", ")}
  - Cycle: ${currentPeriodKey(now)}
  - Payment: ${payment.amount} paisa`);

  await disconnectFromDatabase();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
