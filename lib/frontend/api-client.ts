"use client";

/**
 * Typed client for the internal MessMate API. Same-origin requests so the
 * httpOnly next-auth session cookie and the activeOrganizationId cookie are
 * attached automatically. Throws {@link ApiError} on any non-success envelope.
 */

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface ApiListData<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    body = null;
  }

  if (!res.ok || !body?.success || body.data === undefined) {
    const error = body?.error;
    throw new ApiError(
      error?.code ?? "REQUEST_FAILED",
      error?.message ?? `Request failed with status ${res.status}`,
      res.status,
      error?.details
    );
  }
  return body.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  delete: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "DELETE", body: data === undefined ? undefined : JSON.stringify(data) }),
};

export type ListQuery = {
  page?: number;
  limit?: number;
  [key: string]: string | number | undefined;
};

/** Build a query string from a partial query object, skipping empty values. */
export function toQuery(query?: ListQuery): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
