import { USER_STATUS } from "@/lib/constants/enums";
import { connectToDatabase } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { PasswordResetTokenModel, UserModel } from "@/lib/models";
import { hashPassword } from "@/lib/auth/password";
import {
  createSignedToken,
  hashToken,
  verifySignedToken,
} from "@/lib/auth/tokens";
import {
  buildResetLink,
  buildVerificationLink,
  sendEmail,
} from "@/lib/services/email.service";

const PASSWORD_RESET_TTL_SECONDS = 60 * 60;
const EMAIL_VERIFY_TTL_SECONDS = 24 * 60 * 60;

const REQUIRE_EMAIL_VERIFICATION =
  process.env.REQUIRE_EMAIL_VERIFICATION === "true";

export interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

/** Create a user account. Throws ConflictError when the email is taken. */
export async function registerUser(input: RegisterInput) {
  await connectToDatabase();

  const existing = await UserModel.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await UserModel.create({
    name: input.name,
    email: input.email.toLowerCase(),
    phone: input.phone,
    passwordHash,
    status: REQUIRE_EMAIL_VERIFICATION
      ? USER_STATUS.PENDING_VERIFICATION
      : USER_STATUS.ACTIVE,
    emailVerifiedAt: REQUIRE_EMAIL_VERIFICATION ? null : new Date(),
  });

  if (REQUIRE_EMAIL_VERIFICATION) {
    const token = await createSignedToken(
      "email-verification",
      user._id.toString(),
      EMAIL_VERIFY_TTL_SECONDS
    );
    await sendEmail({
      to: user.email,
      subject: "Verify your email",
      text: `Hello ${user.name},\n\nVerify your email by opening: ${buildVerificationLink(token)}`,
    });
  }

  return user;
}

export async function verifyEmail(token: string): Promise<void> {
  await connectToDatabase();
  const payload = await verifySignedToken(token, "email-verification");
  const user = await UserModel.findById(payload.sub);
  if (!user) {
    throw new NotFoundError("Account not found");
  }
  if (user.status === USER_STATUS.DELETED) {
    throw new ValidationError("Account is no longer active");
  }
  user.status = USER_STATUS.ACTIVE;
  user.emailVerifiedAt = new Date();
  await user.save();
}

/** Always succeeds to avoid leaking whether an email is registered. */
export async function forgotPassword(email: string): Promise<void> {
  await connectToDatabase();
  const user = await UserModel.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (!user) {
    return;
  }

  const token = await createSignedToken(
    "password-reset",
    user._id.toString(),
    PASSWORD_RESET_TTL_SECONDS
  );
  await PasswordResetTokenModel.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000),
    usedAt: null,
  });

  await sendEmail({
    to: user.email,
    subject: "Reset your password",
    text: `Hello ${user.name},\n\nReset your password by opening: ${buildResetLink(token)}`,
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await connectToDatabase();
  const tokenHash = hashToken(token);
  const record = await PasswordResetTokenModel.findOne({ tokenHash });
  if (!record || record.usedAt) {
    throw new ValidationError("This reset link is invalid or has already been used");
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new ValidationError("This reset link has expired");
  }

  const user = await UserModel.findById(record.userId);
  if (!user) {
    throw new NotFoundError("Account not found");
  }

  record.usedAt = new Date();
  await record.save();

  user.passwordHash = await hashPassword(password);
  await user.save();

  await PasswordResetTokenModel.updateMany(
    { userId: user._id, usedAt: null },
    { $set: { usedAt: new Date() } }
  );
}
