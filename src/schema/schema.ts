// Schema definition functions

import type { FieldDefinition } from "../types/field-types.ts";
import type { Schema, SchemaToType } from "../types/schema.ts";

/**
 * Define a schema with table name and fields
 * @param tableName - Database table name
 * @param fields - Object containing field definitions
 * @returns Schema instance with optional generic type for better type inference
 */
export function schema<T extends Record<string, FieldDefinition>>(
  tableName: string,
  fields: T,
): Schema<T>;

export function schema<
  DataType,
  T extends Record<string, FieldDefinition>
>(
  tableName: string,
  fields: T,
): Schema<T, DataType>;

export function schema<
  DataType = never,
  T extends Record<string, FieldDefinition> = Record<string, FieldDefinition>
>(
  tableName: string,
  fields: T,
): Schema<T, DataType extends never ? SchemaToType<T> : DataType> {
  const schemaInstance = {
    tableName,
    fields,
    __type: undefined as unknown as SchemaToType<T>,
    __dataType: undefined as unknown as (DataType extends never ? SchemaToType<T> : DataType),
  };

  return schemaInstance as Schema<T, DataType extends never ? SchemaToType<T> : DataType>;
}

/**
 * Get the TypeScript type for a schema (utility for type inference)
 * @param schema - Schema instance
 * @returns Type utility (compile-time only)
 */
export const getSchemaType = <T extends Record<string, FieldDefinition>>(
  _schema: Schema<T>,
): SchemaToType<T> => {
  return undefined as unknown as SchemaToType<T>;
};

/**
 * Helper function to pluralize interface names for table naming
 * User -> users, Post -> posts, Category -> categories
 */
const pluralize = (word: string): string => {
  const irregulars: Record<string, string> = {
    Person: "people",
    Child: "children",
    Tooth: "teeth",
    Foot: "feet",
    Mouse: "mice",
    Goose: "geese",
  };

  if (irregulars[word]) {
    return irregulars[word];
  }

  if (word.endsWith("y")) {
    return `${word.slice(0, -1)}ies`;
  }
  if (
    word.endsWith("s") ||
    word.endsWith("sh") ||
    word.endsWith("ch") ||
    word.endsWith("x") ||
    word.endsWith("z")
  ) {
    return `${word}es`;
  }

  return `${word.toLowerCase()}s`;
};

/**
 * Create a schema with simplified syntax where table name is inferred from type name
 * Usage: createSchema('User', { ... }) -> table: 'users'
 */
export function createSchema<T extends Record<string, FieldDefinition>>(
  typeName: string,
  fields: T,
): Schema<T>;

export function createSchema<
  DataType,
  T extends Record<string, FieldDefinition>
>(
  typeName: string,
  fields: T,
): Schema<T, DataType>;

export function createSchema<
  DataType = never,
  T extends Record<string, FieldDefinition> = Record<string, FieldDefinition>
>(
  typeName: string,
  fields: T,
): Schema<T, DataType extends never ? SchemaToType<T> : DataType> {
  const tableName = pluralize(typeName);
  return schema(tableName, fields) as Schema<T, DataType extends never ? SchemaToType<T> : DataType>;
}
