import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

/** Consistent envelope for all API responses. */
export type ApiErrorBody = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

export type ApiSuccessBody<T> = {
  success: true;
  data: T;
};

export type ApiListBody<T> = ApiSuccessBody<{
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}>;

export function ok<T>(data: T): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ success: true, data });
}

export function created<T>(data: T): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function okList<T>(
  items: T[],
  pagination: { page: number; limit: number; total: number; totalPages: number }
): NextResponse<ApiListBody<T>> {
  return NextResponse.json({ success: true, data: { items, pagination } });
}

export function noContent(): NextResponse<ApiSuccessBody<null>> {
  return NextResponse.json({ success: true, data: null }, { status: 204 });
}

function isDuplicateKeyError(error: unknown): { code: number; message: string } | null {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code: number }).code === 11000
  ) {
    return {
      code: 409,
      message: "A record with the same unique value already exists",
    };
  }
  return null;
}

/** Map any thrown error to a consistent API error response. Never leaks internals. */
export function apiError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ZodError) {
    const issues = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Validation failed", details: issues },
      },
      { status: 400 }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? undefined,
        },
      },
      { status: error.status }
    );
  }

  const duplicate = isDuplicateKeyError(error);
  if (duplicate) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "CONFLICT", message: duplicate.message },
      },
      { status: duplicate.code }
    );
  }

  const cast = (error as { name?: string }).name;
  if (cast === "CastError") {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid identifier supplied" },
      },
      { status: 400 }
    );
  }

  console.error("[api-error]", error);
  return NextResponse.json(
    {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    },
    { status: 500 }
  );
}
