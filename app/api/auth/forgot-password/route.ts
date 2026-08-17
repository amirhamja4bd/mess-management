import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withPublicHandler } from "@/lib/api/with-handler";
import { forgotPassword } from "@/lib/services/auth.service";
import { forgotPasswordSchema } from "@/lib/schemas";

export const POST = withPublicHandler(async (request) => {
  const input = await parseBody(request, forgotPasswordSchema);
  await forgotPassword(input.email);
  return ok({ message: "If an account exists for this email, a reset link has been sent" });
});
