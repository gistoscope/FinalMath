export class HttpException extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain

    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 - Bad Request
export interface ErrorField {
  field: string;
  message: string[];
}

type RawError = {
  property: string;
  constraints: string[];
};

export class ValidationException extends HttpException {
  public errors: ErrorField[];
  constructor(rawErrors: RawError[]) {
    super("Validation failed", 400);
    this.errors = rawErrors.map((err) => ({
      field: err.property,
      message: err.constraints as string[],
    }));
  }

  get all() {
    return this.errors;
  }
}

// 401 - Unauthorized
export class UnauthorizedException extends HttpException {
  constructor(message: string = "Authentication required") {
    super(message, 401);
  }
}

// 403 - Forbidden
export class ForbiddenException extends HttpException {
  constructor(
    message: string = "You do not have permission to perform this action"
  ) {
    super(message, 403);
  }
}

// 404 - Not Found
export class NotFoundException extends HttpException {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

// 409 - Conflict
export class ConflictException extends HttpException {
  constructor(message: string = "Resource already exists") {
    super(message, 409);
  }
}

// 500 - Internal Server Error
export class InternalServerException extends HttpException {
  constructor(message: string = "Something went wrong") {
    super(message, 500, false); // false because this is likely a bug, not operational
  }
}
