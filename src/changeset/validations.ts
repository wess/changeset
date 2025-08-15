// Core validation functions for changesets

import type {
  Changeset,
  LengthConstraints,
  NumberConstraints,
  ValidationFunction,
  ValidationOptions,
} from "../types/changeset.ts";
import { addError, getValue } from "./changeset.ts";

/**
 * Validate that required fields are present
 */
export const validateRequired = <T = Record<string, unknown>>(
  fields?: (keyof T)[],
  options: ValidationOptions = {},
): ValidationFunction<T> => {
  return (changeset: Changeset<T>) => {
    const { message, allowBlank = false } = options;
    const fieldsToCheck = fields || (changeset.required as (keyof T)[]);
    let result = changeset;

    for (const field of fieldsToCheck) {
      const value = getValue(changeset, field);
      const fieldName = String(field);

      if (value === null || value === undefined) {
        result = addError(result, fieldName, message || `${fieldName} is required`);
      } else if (!allowBlank && value === "") {
        result = addError(result, fieldName, message || `${fieldName} can't be blank`);
      }
    }

    return result;
  };
};

/**
 * Validate string format with regex
 */
export const validateFormat = <T = Record<string, unknown>>(
  field: keyof T,
  pattern: RegExp,
  options: ValidationOptions = {},
): ValidationFunction<T> => {
  return (changeset: Changeset<T>) => {
    const { message } = options;
    const value = getValue(changeset, field);
    const fieldName = String(field);

    if (value === null || value === undefined) {
      return changeset;
    }

    const stringValue = String(value);
    if (!pattern.test(stringValue)) {
      return addError(changeset, fieldName, message || `${fieldName} has invalid format`);
    }

    return changeset;
  };
};

/**
 * Validate string or array length
 */
export const validateLength = <T = Record<string, unknown>>(
  field: keyof T,
  constraints: LengthConstraints,
  options: ValidationOptions = {},
): ValidationFunction<T> => {
  return (changeset: Changeset<T>) => {
    const { message } = options;
    const value = getValue(changeset, field);
    const fieldName = String(field);

    if (value === null || value === undefined) {
      return changeset;
    }

    const length = Array.isArray(value) ? value.length : String(value).length;

    if (constraints.is !== undefined && length !== constraints.is) {
      return addError(
        changeset,
        fieldName,
        message || `${fieldName} should be ${constraints.is} character(s)`,
      );
    }

    if (constraints.min !== undefined && length < constraints.min) {
      return addError(
        changeset,
        fieldName,
        message || `${fieldName} should be at least ${constraints.min} character(s)`,
      );
    }

    if (constraints.max !== undefined && length > constraints.max) {
      return addError(
        changeset,
        fieldName,
        message || `${fieldName} should be at most ${constraints.max} character(s)`,
      );
    }

    return changeset;
  };
};

/**
 * Validate number constraints
 */
export const validateNumber = <T = Record<string, unknown>>(
  field: keyof T,
  constraints: NumberConstraints,
  options: ValidationOptions = {},
): ValidationFunction<T> => {
  return (changeset: Changeset<T>) => {
    const { message } = options;
    const value = getValue(changeset, field);
    const fieldName = String(field);

    if (value === null || value === undefined) {
      return changeset;
    }

    const num = Number(value);
    if (Number.isNaN(num)) {
      return addError(changeset, fieldName, message || `${fieldName} must be a number`);
    }

    if (constraints.equalTo !== undefined && num !== constraints.equalTo) {
      return addError(
        changeset,
        fieldName,
        message || `${fieldName} must be equal to ${constraints.equalTo}`,
      );
    }

    if (constraints.greaterThan !== undefined && num <= constraints.greaterThan) {
      return addError(
        changeset,
        fieldName,
        message || `${fieldName} must be greater than ${constraints.greaterThan}`,
      );
    }

    if (constraints.greaterThanOrEqualTo !== undefined && num < constraints.greaterThanOrEqualTo) {
      return addError(
        changeset,
        fieldName,
        message ||
          `${fieldName} must be greater than or equal to ${constraints.greaterThanOrEqualTo}`,
      );
    }

    if (constraints.lessThan !== undefined && num >= constraints.lessThan) {
      return addError(
        changeset,
        fieldName,
        message || `${fieldName} must be less than ${constraints.lessThan}`,
      );
    }

    if (constraints.lessThanOrEqualTo !== undefined && num > constraints.lessThanOrEqualTo) {
      return addError(
        changeset,
        fieldName,
        message || `${fieldName} must be less than or equal to ${constraints.lessThanOrEqualTo}`,
      );
    }

    return changeset;
  };
};

/**
 * Validate value is in a list of allowed values
 */
export const validateInclusion = <T = Record<string, unknown>>(
  field: keyof T,
  allowedValues: unknown[],
  options: ValidationOptions = {},
): ValidationFunction<T> => {
  return (changeset: Changeset<T>) => {
    const { message } = options;
    const value = getValue(changeset, field);
    const fieldName = String(field);

    if (value === null || value === undefined) {
      return changeset;
    }

    if (!allowedValues.includes(value)) {
      return addError(changeset, fieldName, message || `${fieldName} is not included in the list`);
    }

    return changeset;
  };
};

/**
 * Validate value is NOT in a list of excluded values
 */
export const validateExclusion = <T = Record<string, unknown>>(
  field: keyof T,
  excludedValues: unknown[],
  options: ValidationOptions = {},
): ValidationFunction<T> => {
  return (changeset: Changeset<T>) => {
    const { message } = options;
    const value = getValue(changeset, field);
    const fieldName = String(field);

    if (value === null || value === undefined) {
      return changeset;
    }

    if (excludedValues.includes(value)) {
      return addError(changeset, fieldName, message || `${fieldName} is reserved`);
    }

    return changeset;
  };
};

/**
 * Validate field matches another field (e.g., password confirmation)
 */
export const validateConfirmation = <T = Record<string, unknown>>(
  field: keyof T,
  confirmField: keyof T,
  options: ValidationOptions = {},
): ValidationFunction<T> => {
  return (changeset: Changeset<T>) => {
    const { message } = options;
    const value = getValue(changeset, field);
    const confirmValue = getValue(changeset, confirmField);
    const fieldName = String(field);
    const confirmFieldName = String(confirmField);

    if (value !== confirmValue) {
      return addError(
        changeset,
        fieldName,
        message || `${fieldName} does not match ${confirmFieldName}`,
      );
    }

    return changeset;
  };
};

/**
 * Validate email format
 */
export const validateEmail = <T = Record<string, unknown>>(
  field: keyof T,
  options: ValidationOptions = {},
): ValidationFunction<T> => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return validateFormat(field, emailRegex, {
    message: options.message || `${String(field)} must be a valid email`,
    ...options,
  });
};

/**
 * Custom validation function
 */
export const validateCustom = <T = Record<string, unknown>>(
  field: keyof T,
  validator: (value: unknown, changeset: Changeset<T>) => boolean | string,
  options: ValidationOptions = {},
): ValidationFunction<T> => {
  return (changeset: Changeset<T>) => {
    const { message } = options;
    const value = getValue(changeset, field);
    const fieldName = String(field);

    const result = validator(value, changeset);

    if (result === false) {
      return addError(changeset, fieldName, message || `${fieldName} is invalid`);
    }

    if (typeof result === "string") {
      return addError(changeset, fieldName, result);
    }

    return changeset;
  };
};

/**
 * Validate uniqueness (requires async database check)
 * This returns a function that needs to be called with a database query function
 */
export const validateUniqueness = <T = Record<string, unknown>>(
  field: keyof T,
  _queryFn: (value: unknown) => Promise<boolean>,
  _options: ValidationOptions = {},
): ValidationFunction<T> => {
  return (changeset: Changeset<T>) => {
    const _value = getValue(changeset, field);
    const fieldName = String(field);

    // Mark as async validation needed
    // This would need to be handled separately in an async validation pipeline
    console.warn(`Async validation for ${fieldName} uniqueness needs to be handled separately`);

    return changeset;
  };
};

/**
 * Compose multiple validations for a single field
 */
export const validateField = <T = Record<string, unknown>>(
  field: keyof T,
  ...validations: Array<(value: unknown) => boolean | string>
): ValidationFunction<T> => {
  return (changeset: Changeset<T>) => {
    const value = getValue(changeset, field);
    const fieldName = String(field);
    let result = changeset;

    for (const validation of validations) {
      const validationResult = validation(value);
      if (validationResult === false) {
        result = addError(result, fieldName, `${fieldName} is invalid`);
      } else if (typeof validationResult === "string") {
        result = addError(result, fieldName, validationResult);
      }
    }

    return result;
  };
};
