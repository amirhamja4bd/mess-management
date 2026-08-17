import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withPublicHandler } from "@/lib/api/with-handler";
import { resetPassword } from "@/lib/services/auth.service";
import { resetPasswordSchema } from "@/lib/schemas";

export const POST = withPublicHandler(async (request) => {
  const input = await parseBody(request, resetPasswordSchema);
  await resetPassword(input.token, input.password);
  return ok({ message: "Password reset successfully" });
});
