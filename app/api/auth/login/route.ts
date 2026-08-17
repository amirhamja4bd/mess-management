import { NextResponse } from "next/server";
import { AuthError } from "next-auth";
import { parseBody } from "@/lib/api/helpers";
import { withPublicHandler } from "@/lib/api/with-handler";
import { signIn } from "@/lib/auth/config";
import { loginSchema } from "@/lib/schemas";

export const POST = withPublicHandler(async (request) => {
  const input = await parseBody(request, loginSchema);
  try {
    await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
        },
        { status: 401 }
      );
    }
    throw error;
  }
  return NextResponse.json({ success: true, data: { message: "Signed in" } });
});
