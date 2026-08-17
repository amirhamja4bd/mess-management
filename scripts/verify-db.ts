import "dotenv/config";
import mongoose from "mongoose";
import type { IndexDefinition, IndexOptions } from "mongoose";
import { connectToDatabase, disconnectFromDatabase } from "../lib/db";
import {
  AuditLogModel,
  AdjustmentModel,
  ExpenseCategoryModel,
  ExpenseModel,
  FileModel,
  InvitationModel,
  MealConfigModel,
  MealDayStatusModel,
  MealEntryModel,
  MealTypeModel,
  MemberMonthlySummaryModel,
  MonthlyCycleModel,
  NotificationModel,
  OrganizationMemberModel,
  OrganizationModel,
  PaymentMethodModel,
  PaymentModel,
  RoleModel,
  SettlementModel,
  SettlementTransactionModel,
  SubscriptionModel,
  UserModel,
} from "../lib/models";

interface RegisteredModel {
  collection: { name: string };
  schema: { indexes(): Array<[IndexDefinition, IndexOptions]> };
  createIndexes(): Promise<void>;
}

const ALL_MODELS: Array<{ name: string; model: RegisteredModel }> = [
  { name: "User", model: UserModel },
  { name: "Organization", model: OrganizationModel },
  { name: "Role", model: RoleModel },
  { name: "OrganizationMember", model: OrganizationMemberModel },
  { name: "Invitation", model: InvitationModel },
  { name: "PaymentMethod", model: PaymentMethodModel },
  { name: "ExpenseCategory", model: ExpenseCategoryModel },
  { name: "MealType", model: MealTypeModel },
  { name: "MealConfig", model: MealConfigModel },
  { name: "MealDayStatus", model: MealDayStatusModel },
  { name: "Expense", model: ExpenseModel },
  { name: "MealEntry", model: MealEntryModel },
  { name: "Payment", model: PaymentModel },
  { name: "Adjustment", model: AdjustmentModel },
  { name: "MonthlyCycle", model: MonthlyCycleModel },
  { name: "MemberMonthlySummary", model: MemberMonthlySummaryModel },
  { name: "Settlement", model: SettlementModel },
  { name: "SettlementTransaction", model: SettlementTransactionModel },
  { name: "AuditLog", model: AuditLogModel },
  { name: "Notification", model: NotificationModel },
  { name: "File", model: FileModel },
  { name: "Subscription", model: SubscriptionModel },
];

function printIndexes(model: RegisteredModel): void {
  const indexes = model.schema.indexes();
  for (const [spec, options] of indexes) {
    const fields = Object.keys(spec).join(", ");
    const unique = options.unique ? " UNIQUE" : "";
    const partial = options.partialFilterExpression
      ? ` PARTIAL(${JSON.stringify(options.partialFilterExpression)})`
      : "";
    console.log(`    - (${fields})${unique}${partial}`);
  }
}

async function main(): Promise<void> {
  console.log("Validating model compilation...");
  for (const { name, model } of ALL_MODELS) {
    console.log(`  [OK] ${name} -> collection "${model.collection.name}"`);
  }

  console.log("\nIndex definitions:");
  for (const { name, model } of ALL_MODELS) {
    console.log(`  ${name}:`);
    printIndexes(model);
  }

  const uri =
    process.env.MONGODB_URI ??
    process.env.DATABASE_URL ??
    "mongodb://127.0.0.1:27017/messmate";

  const willConnect = process.env.MONGODB_URI !== undefined;
  if (willConnect) {
    console.log("\nConnecting to MongoDB to build indexes...");
    await connectToDatabase();
    await Promise.all(
      ALL_MODELS.map(({ model }) => model.createIndexes())
    );
    console.log("Indexes built. Ready state:", mongoose.connection.readyState);
    await disconnectFromDatabase();
  } else {
    console.log(
      `\nMONGODB_URI not set; skipping live index build. ` +
        `Start mongod and run with MONGODB_URI="${uri}" yarn db:verify to build indexes.`
    );
  }

  console.log("\nDatabase verification complete.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Verification failed:", error);
  process.exit(1);
});
