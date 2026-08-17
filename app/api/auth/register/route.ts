import { created } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withPublicHandler } from "@/lib/api/with-handler";
import { registerUser } from "@/lib/services/auth.service";
import { toSafeUser } from "@/lib/services/user.service";
import { signUpSchema } from "@/lib/schemas";

export const POST = withPublicHandler(async (request) => {
  const input = await parseBody(request, signUpSchema);
  const user = await registerUser(input);
  return created({ user: toSafeUser(user.toObject()) });
});
