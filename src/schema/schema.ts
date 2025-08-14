// Schema definition functions

import type { FieldDefinition } from "../types/field-types.ts";
import type { Schema, SchemaToType } from "../types/schema.ts";

/**
 * Define a schema with table name and fields
 * @param tableName - Database table name
 * @param fields - Object containing field definitions
 * @returns Schema instance
 */
export const schema = <T extends Record<string, FieldDefinition>>(
  tableName: string,
  fields: T,
): Schema<T> => {
  const schemaInstance: Schema<T> = {
    tableName,
    fields,
    __type: undefined as unknown as SchemaToType<T>,
  };

  return schemaInstance;
};

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
