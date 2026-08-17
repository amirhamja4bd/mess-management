import { NextResponse } from "next/server";
import { withOrgHandler } from "@/lib/api/with-handler";

/** Store the user's active organization in an httpOnly cookie. */
export const POST = withOrgHandler(async (_request, { context }) => {
  const response = NextResponse.json({
    success: true,
    data: { organizationId: context.organizationId },
  });
  response.cookies.set("activeOrganizationId", context.organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
});
