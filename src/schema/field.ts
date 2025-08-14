// Field definition functions

import type { FieldDefinition, FieldOptions, FieldType } from "../types/field-types.ts";

/**
 * Define a field in a schema
 * @param name - Field name
 * @param type - Field type using string literals
 * @param options - Field options (null, default, unique, etc.)
 * @returns Field definition
 */
export const field = <T extends FieldType>(
  name: string,
  type: T,
  options: FieldOptions = {},
): FieldDefinition<T> => {
  return {
    name,
    type,
    options: {
      null: true,
      ...options,
    },
  };
};

/**
 * Create an ID field with common defaults
 * @param name - Field name (default: "id")
 * @param options - Additional options
 * @returns ID field definition
 */
export const idField = (name = "id", options: FieldOptions = {}): FieldDefinition<"id"> => {
  return field(name, "id", {
    primaryKey: true,
    null: false,
    ...options,
  });
};

/**
 * Create timestamp fields (inserted_at, updated_at)
 * @param type - Timestamp type (default: "utc_datetime")
 * @returns Object with inserted_at and updated_at fields
 */
export const timestamps = (type: "naive_datetime" | "utc_datetime" = "utc_datetime") => {
  return {
    inserted_at: field("inserted_at", type, { null: false }),
    updated_at: field("updated_at", type, { null: false }),
  };
};
