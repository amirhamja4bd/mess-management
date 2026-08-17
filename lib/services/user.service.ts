import { connectToDatabase } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { UserModel } from "@/lib/models";
import type { CurrentUser } from "@/lib/auth/session";

export interface UpdateUserProfileInput {
  name?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

/** Strip the password hash (and any other secret) before returning a user to the client. */
export function toSafeUser(user: object): Record<string, unknown> {
  const safe = { ...(user as Record<string, unknown>) };
  delete safe.passwordHash;
  return safe;
}

export async function getProfile(user: CurrentUser) {
  await connectToDatabase();
  const profile = await UserModel.findById(user.id);
  if (!profile) {
    throw new NotFoundError("User not found");
  }
  return toSafeUser(profile.toObject());
}

export async function updateUserProfile(user: CurrentUser, input: UpdateUserProfileInput) {
  await connectToDatabase();
  const profile = await UserModel.findById(user.id);
  if (!profile) {
    throw new NotFoundError("User not found");
  }
  if (input.name !== undefined) {
    profile.name = input.name;
  }
  if (input.phone !== undefined) {
    profile.phone = input.phone ?? undefined;
  }
  if (input.avatarUrl !== undefined) {
    profile.avatarUrl = input.avatarUrl ?? undefined;
  }
  await profile.save();
  return toSafeUser(profile.toObject());
}
