// Association definition functions

import type { Association, AssociationOptions, Schema } from "../types/schema.ts";

/**
 * Define a has_many association
 * @param schema - Related schema
 * @param options - Association options
 * @returns Association definition
 */
export const hasMany = (schema: Schema, options: AssociationOptions = {}): Association => {
  return {
    type: "has_many",
    schema,
    options: {
      references: "id",
      ...options,
    },
  };
};

/**
 * Define a has_one association
 * @param schema - Related schema
 * @param options - Association options
 * @returns Association definition
 */
export const hasOne = (schema: Schema, options: AssociationOptions = {}): Association => {
  return {
    type: "has_one",
    schema,
    options: {
      references: "id",
      ...options,
    },
  };
};

/**
 * Define a belongs_to association
 * @param schema - Related schema
 * @param options - Association options
 * @returns Association definition
 */
export const belongsTo = (schema: Schema, options: AssociationOptions = {}): Association => {
  return {
    type: "belongs_to",
    schema,
    options: {
      references: "id",
      ...options,
    },
  };
};

/**
 * Define a many_to_many association
 * @param schema - Related schema
 * @param options - Association options (requires through and joinKeys)
 * @returns Association definition
 */
export const manyToMany = (schema: Schema, options: AssociationOptions): Association => {
  if (!options.through || !options.joinKeys) {
    throw new Error("many_to_many associations require 'through' and 'joinKeys' options");
  }

  return {
    type: "many_to_many",
    schema,
    options: {
      references: "id",
      ...options,
    },
  };
};
