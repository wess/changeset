// Query entry point - from() function

import type { Query } from "../types/query.ts";
import type { Schema, SchemaToType } from "../types/schema.ts";
import { createQueryMethods } from "./builder.ts";

/**
 * Start a query from a schema
 * @param schema - Schema to query
 * @param alias - Optional alias for the table
 * @returns Query builder with chainable methods
 */
export const from = <T extends Record<string, any>>(schema: Schema<T>, alias?: string) => {
  const initialQuery: Query<SchemaToType<T>> = {
    schema,
    alias,
    whereConditions: [],
    joins: [],
    orderByFields: [],
    groupByFields: [],
    havingConditions: [],
  };

  return createQueryMethods(initialQuery);
};
