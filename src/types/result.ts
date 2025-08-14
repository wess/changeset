// Result type for async operations with error handling

export type Result<T, E = Error> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: E;
    };

// Helper functions for creating Result types
export const ok = <T>(data: T): Result<T> => ({
  success: true,
  data,
});

export const err = <E = Error>(error: E): Result<never, E> => ({
  success: false,
  error,
});

// Result utility functions
export const isOk = <T, E>(result: Result<T, E>): result is { success: true; data: T } =>
  result.success;

export const isErr = <T, E>(result: Result<T, E>): result is { success: false; error: E } =>
  !result.success;

// Functional error types - no classes, just factory functions
export interface DatabaseError extends Error {
  name: "DatabaseError";
  code?: string;
  detail?: string;
}

export interface ValidationError extends Error {
  name: "ValidationError";
  field: string;
}

export interface NotFoundError extends Error {
  name: "NotFoundError";
  resource: string;
}

// Factory functions for creating errors functionally
export const createDatabaseError = (
  message: string,
  code?: string,
  detail?: string,
): DatabaseError => {
  const error = new Error(message) as DatabaseError;
  error.name = "DatabaseError";
  error.code = code;
  error.detail = detail;
  return error;
};

export const createValidationError = (
  message: string,
  field: string,
): ValidationError => {
  const error = new Error(message) as ValidationError;
  error.name = "ValidationError";
  error.field = field;
  return error;
};

export const createNotFoundError = (
  resource: string,
  message?: string,
): NotFoundError => {
  const error = new Error(message || `${resource} not found`) as NotFoundError;
  error.name = "NotFoundError";
  error.resource = resource;
  return error;
};
