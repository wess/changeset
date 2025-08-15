// Schema type definitions

import type { FieldDefinition, FieldTypeToTs } from "./field-types.ts";

// Schema definition interface
export interface SchemaDefinition {
  tableName: string;
  fields: Record<string, FieldDefinition>;
}

// Generate TypeScript type from schema definition
export type SchemaToType<T extends Record<string, FieldDefinition>> = {
  [K in keyof T]: T[K] extends FieldDefinition<infer U>
    ? T[K]["options"]["null"] extends false
      ? FieldTypeToTs<U>
      : FieldTypeToTs<U> | null
    : never;
};

// Schema instance interface
export interface Schema<
  T extends Record<string, FieldDefinition> = Record<string, FieldDefinition>,
  DataType = SchemaToType<T>
> {
  tableName: string;
  fields: T;
  // Generate TypeScript type for this schema
  __type: SchemaToType<T>;
  // Target data interface type
  __dataType: DataType;
}

// Association types
export type AssociationType = "has_many" | "has_one" | "belongs_to" | "many_to_many";

export interface AssociationOptions {
  foreignKey?: string;
  references?: string;
  through?: Schema;
  joinKeys?: [string, string];
}

export interface Association {
  type: AssociationType;
  schema: Schema;
  options: AssociationOptions;
}
