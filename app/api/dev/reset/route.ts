import { NextResponse } from "next/server";
import { connectToDatabase, mongoose } from "@/lib/db";

const DEV_RESET_KEY = process.env.DEV_RESET_KEY || "messmate-dev-reset-2026";

const KEEP_COLLECTIONS = new Set([
  "users",
  "organizations",
  "organization_members",
  "roles",
  "expense_categories",
  "payment_methods",
  "meal_configs",
  "meal_types",
]);

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.key !== DEV_RESET_KEY) {
    return NextResponse.json({ error: "Invalid key" }, { status: 401 });
  }

  const mode = body.mode === "full" ? "full" : "partial";

  await connectToDatabase();

  const collections = mongoose.connection.collections;
  const dropped: string[] = [];

  for (const name of Object.keys(collections)) {
    if (mode === "partial" && KEEP_COLLECTIONS.has(name)) {
      continue;
    }
    await collections[name].drop();
    dropped.push(name);
  }

  return NextResponse.json({ success: true, mode, dropped });
}
