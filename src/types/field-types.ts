// Field type definitions using string literals to match Ecto's atom types

export type FieldType =
  | "id"
  | "string"
  | "integer"
  | "float"
  | "boolean"
  | "date"
  | "time"
  | "naive_datetime"
  | "utc_datetime"
  | "binary"
  | "array"
  | "map";

// TypeScript type mapping from field types
type FieldTypeMap = {
  id: number;
  string: string;
  integer: number;
  float: number;
  boolean: boolean;
  date: Date;
  time: Date;
  naive_datetime: Date;
  utc_datetime: Date;
  binary: Buffer;
  array: unknown[];
  map: Record<string, unknown>;
};

export type FieldTypeToTs<T extends FieldType> = FieldTypeMap[T];

// Field options interface
export interface FieldOptions {
  null?: boolean;
  default?: unknown;
  unique?: boolean;
  primaryKey?: boolean;
  size?: number;
  precision?: number;
  scale?: number;
}

// Field definition interface
export interface FieldDefinition<T extends FieldType = FieldType> {
  name: string;
  type: T;
  options: FieldOptions;
}
