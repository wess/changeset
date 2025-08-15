// Changeset type definitions for data validation and casting

import type { ValidationError } from "./result.ts";

// Changeset interface
export interface Changeset<T = Record<string, unknown>> {
  action: "insert" | "update" | "delete";
  changes: Partial<T>;
  data: T | Record<string, never>;
  errors: ValidationError[];
  valid: boolean;
  required: string[];
  optional: string[];
}

// Fluent validation methods for changeset (Elixir Ecto-like)
export interface FluentChangesetValidation<T = Record<string, unknown>> {
  // Elixir-like properties
  readonly valid: boolean;
  readonly errors: ValidationError[];
  readonly changes: Partial<T>;
  readonly data: T | Record<string, never>;
  
  // Elixir-like methods
  isValid(): boolean;
  getChanges(): Partial<T>;
  getData(): T | Record<string, never>;
  getErrors(): ValidationError[];
  
  // Validation methods (chainable)
  required(fields?: (keyof T)[], options?: ValidationOptions): FluentChangesetValidation<T>;
  email(field: keyof T, options?: ValidationOptions): FluentChangesetValidation<T>;
  length(field: keyof T, constraints: LengthConstraints, options?: ValidationOptions): FluentChangesetValidation<T>;
  number(field: keyof T, constraints: NumberConstraints, options?: ValidationOptions): FluentChangesetValidation<T>;
  format(field: keyof T, pattern: RegExp, options?: ValidationOptions): FluentChangesetValidation<T>;
  inclusion(field: keyof T, allowedValues: unknown[], options?: ValidationOptions): FluentChangesetValidation<T>;
  exclusion(field: keyof T, excludedValues: unknown[], options?: ValidationOptions): FluentChangesetValidation<T>;
  confirmation(field: keyof T, confirmField: keyof T, options?: ValidationOptions): FluentChangesetValidation<T>;
  custom(field: keyof T, validator: (value: unknown, changeset: Changeset<T>) => boolean | string, options?: ValidationOptions): FluentChangesetValidation<T>;
  
  // Backward compatibility methods
  toChangeset(): Changeset<T>;
  result(): { changeset: Changeset<T>; valid: boolean; errors: ValidationError[] };
}

// Namespaced validate object interface
export interface ValidateNamespace {
  changeset: <T = Record<string, unknown>>(changeset: Changeset<T>) => FluentChangesetValidation<T>;
  with: <T = Record<string, unknown>>(
    changeset: Changeset<T>, 
    callback: (validator: FluentChangesetValidation<T>) => FluentChangesetValidation<T>
  ) => Changeset<T>;
}

// Validation function type
export type ValidationFunction<T = Record<string, unknown>> = (changeset: Changeset<T>) => Changeset<T>;

// Constraint validation options
export interface LengthConstraints {
  min?: number;
  max?: number;
  is?: number;
}

export interface NumberConstraints {
  greaterThan?: number;
  greaterThanOrEqualTo?: number;
  lessThan?: number;
  lessThanOrEqualTo?: number;
  equalTo?: number;
}

// Cast options
export interface CastOptions {
  empty?: "trim" | "keep" | "ignore";
}

// Validation options
export interface ValidationOptions {
  message?: string;
  allowBlank?: boolean;
}
