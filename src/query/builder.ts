// Query builder implementation with immutable operations

import { generateSql, type SqlQuery } from "../repo/sql-generator.ts";
import type {
  JoinExpression,
  OrderByExpression,
  Query,
  QueryBuilder,
  SelectExpression,
  WhereCondition,
} from "../types/query.ts";
import type { Schema, SchemaToType } from "../types/schema.ts";
import { createQueryProxy, type QueryProxy } from "./where-builder.ts";

/**
 * Create a new query with updated properties (immutable)
 */
const updateQuery = <T>(query: Query<T>, updates: Partial<Query<T>>): Query<T> => {
  return {
    ...query,
    ...updates,
  };
};

/**
 * Add a where condition to the query
 * @param predicate - Function that returns a condition using proxy syntax
 * @returns Query builder function
 */
export const where = <T>(
  predicate: (entity: QueryProxy<SchemaToType<any>>) => WhereCondition | WhereCondition[],
): QueryBuilder<T> => {
  return (query: Query<T>) => {
    // Create proxy for natural field access
    const proxy = createQueryProxy<SchemaToType<any>>();
    const result = predicate(proxy);

    // Handle single condition or array of conditions
    const conditions = Array.isArray(result) ? result : [result];

    return updateQuery(query, {
      whereConditions: [...query.whereConditions, ...conditions],
    });
  };
};

/**
 * Add field selection to the query
 * @param selector - Function to select fields
 * @returns Query builder function
 */
export const select = <T, R>(selector: SelectExpression<SchemaToType<any>>): QueryBuilder<R> => {
  return (query: Query<T>) => {
    return updateQuery(query as Query<R>, {
      selectFields: selector as SelectExpression<R>,
    });
  };
};

/**
 * Add ordering to the query
 * @param selector - Function to select field for ordering
 * @param direction - Sort direction (default: "asc")
 * @returns Query builder function
 */
export const orderBy = <T>(
  _selector: (entity: QueryProxy<SchemaToType<any>>) => string,
  direction: "asc" | "desc" = "asc",
): QueryBuilder<T> => {
  return (query: Query<T>) => {
    // In a full implementation, we'd parse the selector function
    const orderExpression: OrderByExpression = {
      field: "id", // placeholder
      direction,
    };

    return updateQuery(query, {
      orderByFields: [...query.orderByFields, orderExpression],
    });
  };
};

/**
 * Add limit to the query
 * @param count - Maximum number of results
 * @returns Query builder function
 */
export const limit = <T>(count: number): QueryBuilder<T> => {
  return (query: Query<T>) => {
    return updateQuery(query, {
      limitValue: count,
    });
  };
};

/**
 * Add offset to the query
 * @param count - Number of results to skip
 * @returns Query builder function
 */
export const offset = <T>(count: number): QueryBuilder<T> => {
  return (query: Query<T>) => {
    return updateQuery(query, {
      offsetValue: count,
    });
  };
};

/**
 * Add join to the query
 * @param schema - Schema to join
 * @param alias - Alias for the joined table
 * @param onCondition - Join condition function
 * @returns Query builder function
 */
export const join = <T>(
  schema: Schema,
  alias?: string,
  _onCondition?: (left: any, right: any) => void,
): QueryBuilder<T> => {
  return (query: Query<T>) => {
    const joinExpression: JoinExpression = {
      type: "join",
      schema,
      alias,
      on: {
        leftField: "id", // placeholder
        rightField: "id", // placeholder
      },
    };

    return updateQuery(query, {
      joins: [...query.joins, joinExpression],
    });
  };
};

/**
 * Create query builder methods that can be chained
 */
export const createQueryMethods = <T>(initialQuery: Query<T>) => {
  const applyBuilder = (builder: QueryBuilder<T>): Query<T> => {
    return builder(initialQuery);
  };

  return {
    where: (
      predicate: (entity: QueryProxy<SchemaToType<any>>) => WhereCondition | WhereCondition[],
    ) => {
      const newQuery = applyBuilder(where(predicate));
      return createQueryMethods(newQuery);
    },
    select: <R>(selector: SelectExpression<SchemaToType<any>>) => {
      const newQuery = applyBuilder(select(selector));
      return createQueryMethods(newQuery as Query<R>);
    },
    orderBy: (
      selector: (entity: QueryProxy<SchemaToType<any>>) => string,
      direction: "asc" | "desc" = "asc",
    ) => {
      const newQuery = applyBuilder(orderBy(selector, direction));
      return createQueryMethods(newQuery);
    },
    limit: (count: number) => {
      const newQuery = applyBuilder(limit(count));
      return createQueryMethods(newQuery);
    },
    offset: (count: number) => {
      const newQuery = applyBuilder(offset(count));
      return createQueryMethods(newQuery);
    },
    join: (schema: Schema, alias?: string, onCondition?: (left: any, right: any) => void) => {
      const newQuery = applyBuilder(join(schema, alias, onCondition));
      return createQueryMethods(newQuery);
    },
    // Return the final query for execution
    build: () => initialQuery,
    // Generate SQL directly from the query
    toSql: (): SqlQuery => generateSql(initialQuery),
    // Get just the SQL string
    toString: (): string => generateSql(initialQuery).sql,
  };
};
