import { createHash, randomBytes, randomUUID } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";

/**
 * Signed, short-lived tokens (email verification, password reset) using
 * jose + AUTH_SECRET. Tokens are single-purpose: every payload carries a
 * `purpose` claim and the verifier enforces it.
 *
 * Invitation tokens are high-entropy random strings; only their hash is
 * stored in the database (see lib/services/invitation.service.ts).
 */

export type TokenPurpose = "email-verification" | "password-reset";

export interface TokenPayload extends JWTPayload {
  purpose: TokenPurpose;
  sub: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not defined");
  }
  return new TextEncoder().encode(secret);
}

export async function createSignedToken(
  purpose: TokenPurpose,
  subject: string,
  ttlSeconds: number
): Promise<string> {
  return new SignJWT({ purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getSecret());
}

export async function verifySignedToken(
  token: string,
  purpose: TokenPurpose
): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: ["HS256"],
  });
  if (payload.purpose !== purpose || typeof payload.sub !== "string") {
    throw new Error("invalid token purpose");
  }
  return payload as TokenPayload;
}

/** Random token (used for invitations); store only its SHA-256 hash. */
export function generateRandomToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateId(): string {
  return randomUUID();
}
