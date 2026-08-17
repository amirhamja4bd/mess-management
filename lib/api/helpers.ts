import type { NextRequest } from "next/server";
import type { ZodType } from "zod";
import { BadRequestError, ValidationError } from "@/lib/errors";

/**
 * API request plumbing shared by every route handler.
 *
 * Routes use the documented pipeline:
 *   Route Handler -> Authentication -> Authorization -> Validation
 *   -> Service -> Business Logic -> Mongoose -> MongoDB
 */

export async function parseBody<T>(request: NextRequest, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new BadRequestError("Request body must be valid JSON");
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ValidationError("Request body is invalid", result.error.issues);
  }
  return result.data;
}

/** Parse a body that may be empty (e.g. DELETE with an optional reason). */
export async function parseOptionalBody<T>(
  request: NextRequest,
  schema: ZodType<T>,
  fallback: T
): Promise<T> {
  let text = "";
  try {
    text = await request.text();
  } catch {
    throw new BadRequestError("Request body must be valid JSON");
  }
  if (text.trim().length === 0) {
    return fallback;
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BadRequestError("Request body must be valid JSON");
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ValidationError("Request body is invalid", result.error.issues);
  }
  return result.data;
}

export async function parseParams<T>(params: unknown, schema: ZodType<T>): Promise<T> {
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ValidationError("URL parameters are invalid", result.error.issues);
  }
  return result.data;
}

export async function parseQuery<T>(request: NextRequest, schema: ZodType<T>): Promise<T> {
  const entries: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    entries[key] = value;
  });
  const result = schema.safeParse(entries);
  if (!result.success) {
    throw new ValidationError("Query parameters are invalid", result.error.issues);
  }
  return result.data;
}

export function clientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }
  return request.headers.get("x-real-ip") ?? undefined;
}

export function clientUserAgent(request: NextRequest): string | undefined {
  return request.headers.get("user-agent") ?? undefined;
}
