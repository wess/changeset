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

/**
 * Preload associations in a query
 * @param associations - Array of association names to preload
 * @returns Preload options
 */
export const preload = (associations: string[]): PreloadOptions => ({
  associations,
  nested: {},
});

/**
 * Preload nested associations
 * @param associations - Object mapping associations to their nested preloads
 * @returns Preload options
 */
export const preloadNested = (
  associations: Record<string, string[]>,
): PreloadOptions => ({
  associations: Object.keys(associations),
  nested: associations,
});

export interface PreloadOptions {
  associations: string[];
  nested: Record<string, string[]>;
}

/**
 * Build preload queries for associations
 * @param schema - Source schema
 * @param preloadOptions - Preload configuration
 * @param records - Records to preload associations for
 * @returns Map of association queries
 */
export const buildPreloadQueries = (
  schema: Schema,
  preloadOptions: PreloadOptions,
  records: unknown[],
): Record<string, unknown> => {
  const queries: Record<string, unknown> = {};

  for (const associationName of preloadOptions.associations) {
    // This would build queries for each association
    // For now, just a placeholder
    queries[associationName] = {
      association: associationName,
      records: records.length,
      nested: preloadOptions.nested[associationName] || [],
    };
  }

  return queries;
};

/**
 * Execute preload queries and attach results to records
 * @param records - Source records
 * @param preloadQueries - Preload queries to execute
 * @returns Records with preloaded associations
 */
export const executePreloads = async (
  records: unknown[],
  preloadQueries: Record<string, unknown>,
): Promise<unknown[]> => {
  // This would execute the preload queries and attach results
  // For now, just return the original records
  console.log(`Executing preloads for ${Object.keys(preloadQueries).length} associations`);
  return records;
};
