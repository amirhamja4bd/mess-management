import { compare, hash } from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hashValue: string): Promise<boolean> {
  try {
    return await compare(password, hashValue);
  } catch {
    return false;
  }
}
