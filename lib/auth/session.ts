import { connectToDatabase } from "@/lib/db";
import { UnauthorizedError } from "@/lib/errors";
import { UserModel } from "@/lib/models";
import { auth } from "@/lib/auth/config";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

/**
 * Returns the authenticated user from the session. Never trusts client
 * state: the session cookie is verified by Auth.js on the server.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    avatarUrl: session.user.image ?? null,
  };
}

/** Requires an authenticated user and returns their fresh DB record. */
export async function requireActiveUser(): Promise<CurrentUser> {
  const sessionUser = await getCurrentUser();
  await connectToDatabase();
  const user = await UserModel.findOne({
    _id: sessionUser.id,
    deletedAt: null,
  });
  if (!user) {
    throw new UnauthorizedError("Account no longer exists");
  }
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
  };
}
