import { NextResponse } from "next/server";
import { withAuthHandler } from "@/lib/api/with-handler";
import { signOut } from "@/lib/auth/config";

export const POST = withAuthHandler(async () => {
  await signOut({ redirect: false });
  return NextResponse.json({ success: true, data: { message: "Signed out" } });
});
