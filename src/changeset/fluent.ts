// Fluent API for changeset validation with method chaining

import type {
  Changeset,
  LengthConstraints,
  NumberConstraints,
  ValidationOptions,
  ValidateNamespace,
} from "../types/changeset.ts";
import {
  validateRequired,
  validateFormat,
  validateLength,
  validateNumber,
  validateInclusion,
  validateExclusion,
  validateConfirmation,
  validateEmail,
  validateCustom,
} from "./validations.ts";

/**
 * Fluent validator for method chaining validation operations
 * Provides Elixir Ecto-like API with direct property access
 */
export class FluentValidator<T = Record<string, unknown>> {
  private _changeset: Changeset<T>;

  constructor(changeset: Changeset<T>) {
    this._changeset = changeset;
  }

  // Elixir-like properties for direct access
  get valid(): boolean {
    return this._changeset.valid;
  }

  get errors(): Array<{ field: string; message: string }> {
    return this._changeset.errors;
  }

  get changes(): Partial<T> {
    return this._changeset.changes;
  }

  get data(): T | Record<string, never> {
    return this._changeset.data;
  }

  // Elixir-like methods
  isValid(): boolean {
    return this._changeset.valid && this._changeset.errors.length === 0;
  }

  getChanges(): Partial<T> {
    return this._changeset.changes;
  }

  getData(): T | Record<string, never> {
    return this._changeset.data;
  }

  getErrors(): Array<{ field: string; message: string }> {
    return this._changeset.errors;
  }

  /**
   * Validate that required fields are present
   */
  required(fields?: (keyof T)[], options?: ValidationOptions): FluentValidator<T> {
    const validation = validateRequired<T>(fields, options);
    this._changeset = validation(this._changeset);
    return this;
  }

  /**
   * Validate email format
   */
  email(field: keyof T, options?: ValidationOptions): FluentValidator<T> {
    const validation = validateEmail<T>(field, options);
    this._changeset = validation(this._changeset);
    return this;
  }

  /**
   * Validate string or array length
   */
  length(
    field: keyof T,
    constraints: LengthConstraints,
    options?: ValidationOptions,
  ): FluentValidator<T> {
    const validation = validateLength<T>(field, constraints, options);
    this._changeset = validation(this._changeset);
    return this;
  }

  /**
   * Validate number constraints
   */
  number(
    field: keyof T,
    constraints: NumberConstraints,
    options?: ValidationOptions,
  ): FluentValidator<T> {
    const validation = validateNumber<T>(field, constraints, options);
    this._changeset = validation(this._changeset);
    return this;
  }

  /**
   * Validate string format with regex
   */
  format(field: keyof T, pattern: RegExp, options?: ValidationOptions): FluentValidator<T> {
    const validation = validateFormat<T>(field, pattern, options);
    this._changeset = validation(this._changeset);
    return this;
  }

  /**
   * Validate value is in a list of allowed values
   */
  inclusion(
    field: keyof T,
    allowedValues: unknown[],
    options?: ValidationOptions,
  ): FluentValidator<T> {
    const validation = validateInclusion<T>(field, allowedValues, options);
    this._changeset = validation(this._changeset);
    return this;
  }

  /**
   * Validate value is NOT in a list of excluded values
   */
  exclusion(
    field: keyof T,
    excludedValues: unknown[],
    options?: ValidationOptions,
  ): FluentValidator<T> {
    const validation = validateExclusion<T>(field, excludedValues, options);
    this._changeset = validation(this._changeset);
    return this;
  }

  /**
   * Validate field matches another field
   */
  confirmation(
    field: keyof T,
    confirmField: keyof T,
    options?: ValidationOptions,
  ): FluentValidator<T> {
    const validation = validateConfirmation<T>(field, confirmField, options);
    this._changeset = validation(this._changeset);
    return this;
  }

  /**
   * Custom validation function
   */
  custom(
    field: keyof T,
    validator: (value: unknown, changeset: Changeset<T>) => boolean | string,
    options?: ValidationOptions,
  ): FluentValidator<T> {
    const validation = validateCustom<T>(field, validator, options);
    this._changeset = validation(this._changeset);
    return this;
  }

  /**
   * Get the validated changeset (for backward compatibility)
   */
  toChangeset(): Changeset<T> {
    return this._changeset;
  }

  /**
   * Get validation result (for backward compatibility)
   */
  result(): {
    changeset: Changeset<T>;
    valid: boolean;
    errors: Array<{ field: string; message: string }>;
  } {
    return {
      changeset: this._changeset,
      valid: this._changeset.valid,
      errors: this._changeset.errors,
    };
  }
}

/**
 * Create a fluent validator from a changeset
 */
const changeset = <T = Record<string, unknown>>(
  cs: Changeset<T>,
): FluentValidator<T> => {
  return new FluentValidator(cs);
};

/**
 * Alternative fluent validation with callback style
 */
const with_ = <T = Record<string, unknown>>(
  cs: Changeset<T>,
  callback: (validator: FluentValidator<T>) => FluentValidator<T>,
): Changeset<T> => {
  const validator = new FluentValidator(cs);
  const result = callback(validator);
  return result.toChangeset();
};

/**
 * Namespaced validate object with fluent API methods
 */
export const validate: ValidateNamespace = {
  changeset,
  with: with_,
};

// Legacy exports for backward compatibility (deprecated)
export const validateFluent = changeset;
export const validateWith = with_;