// Improved field builder syntax using namespaced approach

import type { FieldDefinition, FieldOptions } from "../types/field-types.ts";
import { field as createField } from "./field.ts";

/**
 * Namespaced field builders for cleaner syntax
 * Usage: f.string("name", { null: false })
 */
export const f = {
  /**
   * Create an ID field
   */
  id: (name = "id", options: FieldOptions = {}): FieldDefinition<"id"> => {
    return createField(name, "id", {
      primaryKey: true,
      null: false,
      ...options,
    });
  },

  /**
   * Create a string field
   */
  string: (name: string, options: FieldOptions = {}): FieldDefinition<"string"> => {
    return createField(name, "string", options);
  },

  /**
   * Create an integer field
   */
  integer: (name: string, options: FieldOptions = {}): FieldDefinition<"integer"> => {
    return createField(name, "integer", options);
  },

  /**
   * Create a float field
   */
  float: (name: string, options: FieldOptions = {}): FieldDefinition<"float"> => {
    return createField(name, "float", options);
  },

  /**
   * Create a boolean field
   */
  boolean: (name: string, options: FieldOptions = {}): FieldDefinition<"boolean"> => {
    return createField(name, "boolean", options);
  },

  /**
   * Create a date field
   */
  date: (name: string, options: FieldOptions = {}): FieldDefinition<"date"> => {
    return createField(name, "date", options);
  },

  /**
   * Create a time field
   */
  time: (name: string, options: FieldOptions = {}): FieldDefinition<"time"> => {
    return createField(name, "time", options);
  },

  /**
   * Create a naive datetime field (no timezone)
   */
  naiveDateTime: (name: string, options: FieldOptions = {}): FieldDefinition<"naive_datetime"> => {
    return createField(name, "naive_datetime", options);
  },

  /**
   * Create a UTC datetime field
   */
  utcDateTime: (name: string, options: FieldOptions = {}): FieldDefinition<"utc_datetime"> => {
    return createField(name, "utc_datetime", options);
  },

  /**
   * Create a binary field
   */
  binary: (name: string, options: FieldOptions = {}): FieldDefinition<"binary"> => {
    return createField(name, "binary", options);
  },

  /**
   * Create an array field (PostgreSQL)
   */
  array: (name: string, options: FieldOptions = {}): FieldDefinition<"array"> => {
    return createField(name, "array", options);
  },

  /**
   * Create a map/JSON field
   */
  map: (name: string, options: FieldOptions = {}): FieldDefinition<"map"> => {
    return createField(name, "map", options);
  },
};
