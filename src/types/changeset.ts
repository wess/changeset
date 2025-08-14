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

// Validation function type
export type ValidationFunction<T> = (changeset: Changeset<T>) => Changeset<T>;

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
