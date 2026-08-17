import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withPublicHandler } from "@/lib/api/with-handler";
import { verifyEmail } from "@/lib/services/auth.service";
import { verifyEmailSchema } from "@/lib/schemas";

export const POST = withPublicHandler(async (request) => {
  const input = await parseBody(request, verifyEmailSchema);
  await verifyEmail(input.token);
  return ok({ message: "Email verified" });
});
