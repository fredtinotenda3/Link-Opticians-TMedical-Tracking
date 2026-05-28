// FILE: lib/errors/index.ts

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  public fields?: Record<string, string>;
  constructor(message: string, fields?: Record<string, string>) {
    super(message, 422, "VALIDATION_ERROR");
    this.fields = fields;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403, "FORBIDDEN");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 400, "BUSINESS_RULE_VIOLATION");
  }
}

export class InvalidStatusTransitionError extends BusinessRuleError {
  constructor(from: string, to: string) {
    super(`Cannot transition claim from "${from}" to "${to}"`);
  }
}

// Centralized API error response
export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  fields?: Record<string, string>;
  statusCode: number;
}

export function toApiError(error: unknown): ApiErrorResponse & { statusCode: number } {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      fields: error instanceof ValidationError ? error.fields : undefined,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    // Mongoose validation error
    if ((error as any).name === "ValidationError") {
      const fields: Record<string, string> = {};
      const ve = error as any;
      Object.keys(ve.errors || {}).forEach((k) => {
        fields[k] = ve.errors[k].message;
      });
      return {
        success: false,
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        fields,
        statusCode: 422,
      };
    }
    // Mongoose duplicate key
    if ((error as any).code === 11000) {
      return {
        success: false,
        error: "A record with this value already exists",
        code: "DUPLICATE_KEY",
        statusCode: 409,
      };
    }
  }

  console.error("Unhandled error:", error);
  return {
    success: false,
    error: "An unexpected error occurred",
    code: "INTERNAL_ERROR",
    statusCode: 500,
  };
}