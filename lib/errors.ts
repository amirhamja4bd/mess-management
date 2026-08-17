/**
 * Central error hierarchy for the backend.
 *
 * These errors are plain classes (no framework imports) so the pure
 * business-logic core can throw them and the API layer maps them to
 * consistent HTTP responses via lib/api-response.ts.
 */

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super("FORBIDDEN", message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super("NOT_FOUND", message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, details?: unknown) {
    super("BUSINESS_RULE_VIOLATION", message, 422, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message = "A database operation failed") {
    super("DATABASE_ERROR", message, 500);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super("BAD_REQUEST", message, 400);
  }
}
