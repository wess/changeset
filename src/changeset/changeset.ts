// Core changeset functions for data validation and transformation

import type { CastOptions, Changeset, ValidationFunction } from "../types/changeset.ts";
import type { ValidationError } from "../types/result.ts";

/**
 * Create a new changeset with initial data
 */
export const changeset = <T = Record<string, unknown>>(
  data: T | Record<string, never> = {} as Record<string, never>,
  action: "insert" | "update" | "delete" = "update",
): Changeset<T> => ({
  action,
  data,
  changes: {},
  errors: [],
  valid: true,
  required: [],
  optional: [],
});

/**
 * Cast parameters to changeset, filtering allowed fields
 */
export const cast = <T = Record<string, unknown>>(
  changeset: Changeset<T>,
  params: Record<string, unknown>,
  allowedFields: (keyof T)[],
  options: CastOptions = {},
): Changeset<T> => {
  const { empty = "trim" } = options;
  const changes: Partial<T> = {};

  for (const field of allowedFields) {
    const key = field as string;
    if (key in params) {
      let value = params[key];

      // Handle empty string values based on options
      if (typeof value === "string") {
        if (empty === "trim") {
          value = value.trim();
        }
        if (empty === "ignore" && value === "") {
          continue;
        }
      }

      changes[field] = value as T[keyof T];
    }
  }

  return {
    ...changeset,
    changes,
    errors: [],
    valid: true,
  };
};

/**
 * Apply changes to the original data
 */
export const applyChanges = <T extends Record<string, unknown>>(changeset: Changeset<T>): T => ({
  ...changeset.data,
  ...changeset.changes,
});

/**
 * Add an error to the changeset
 */
export const addError = <T extends Record<string, unknown>>(
  changeset: Changeset<T>,
  field: string,
  message: string,
): Changeset<T> => {
  const error: ValidationError = { field, message };
  return {
    ...changeset,
    errors: [...changeset.errors, error],
    valid: false,
  };
};

/**
 * Check if a field has changed
 */
export const hasChanged = <T extends Record<string, unknown>>(
  changeset: Changeset<T>,
  field: keyof T,
): boolean => {
  return field in changeset.changes;
};

/**
 * Get the current value of a field (change or original)
 */
export const getValue = <T extends Record<string, unknown>>(
  changeset: Changeset<T>,
  field: keyof T,
): T[keyof T] | undefined => {
  if (hasChanged(changeset, field)) {
    return changeset.changes[field];
  }
  return changeset.data[field];
};

/**
 * Get all changes
 */
export const getChanges = <T extends Record<string, unknown>>(
  changeset: Changeset<T>,
): Partial<T> => changeset.changes;

/**
 * Check if changeset is valid
 */
export const isValid = <T extends Record<string, unknown>>(changeset: Changeset<T>): boolean =>
  changeset.valid && changeset.errors.length === 0;

/**
 * Pipe changeset through validation functions
 */
export const pipe = <T = Record<string, unknown>>(
  changeset: Changeset<T>,
  ...validations: ValidationFunction<T>[]
): Changeset<T> => {
  return validations.reduce((cs, validation) => validation(cs), changeset);
};

/**
 * Mark fields as required
 */
export const required = <T = Record<string, unknown>>(
  changeset: Changeset<T>,
  fields: (keyof T)[],
): Changeset<T> => ({
  ...changeset,
  required: fields.map((f) => String(f)),
});

/**
 * Mark fields as optional
 */
export const optional = <T = Record<string, unknown>>(
  changeset: Changeset<T>,
  fields: (keyof T)[],
): Changeset<T> => ({
  ...changeset,
  optional: fields.map((f) => String(f)),
});

/**
 * Get validation errors from changeset
 */
export const getErrors = <T = Record<string, unknown>>(
  changeset: Changeset<T>,
): ValidationError[] => changeset.errors;

// Legacy alias for backward compatibility
export const validate = getErrors;

/**
 * Clear all errors from changeset
 */
export const clearErrors = <T = Record<string, unknown>>(
  changeset: Changeset<T>,
): Changeset<T> => ({
  ...changeset,
  errors: [],
  valid: true,
});

/**
 * Update a specific field in the changeset
 */
export const putChange = <T = Record<string, unknown>>(
  changeset: Changeset<T>,
  field: keyof T,
  value: T[keyof T],
): Changeset<T> => ({
  ...changeset,
  changes: {
    ...changeset.changes,
    [field]: value,
  },
});

/**
 * Delete a change from the changeset
 */
export const deleteChange = <T = Record<string, unknown>>(
  changeset: Changeset<T>,
  field: keyof T,
): Changeset<T> => {
  const { [field]: _, ...remainingChanges } = changeset.changes;
  return {
    ...changeset,
    changes: remainingChanges as Partial<T>,
  };
};

/**
 * Merge another changeset into this one
 */
export const merge = <T extends Record<string, unknown>>(
  changeset: Changeset<T>,
  other: Changeset<T>,
): Changeset<T> => ({
  ...changeset,
  changes: {
    ...changeset.changes,
    ...other.changes,
  },
  errors: [...changeset.errors, ...other.errors],
  valid: changeset.valid && other.valid,
});
