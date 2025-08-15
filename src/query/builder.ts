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
 * @param selector - Field name (string) or function to select field for ordering
 * @param direction - Sort direction (default: "asc")
 * @returns Query builder function
 */
export const orderBy = <T>(
  selector: string | ((entity: QueryProxy<SchemaToType<any>>) => string),
  direction: "asc" | "desc" = "asc",
): QueryBuilder<T> => {
  return (query: Query<T>) => {
    // Extract field name from selector
    let fieldName: string;
    if (typeof selector === "string") {
      fieldName = selector;
    } else {
      // For function selectors, we'd need to parse the function body or use a proxy
      // For now, we'll extract it from the function call result
      // This is a simplified implementation - in a full version we'd parse the function
      fieldName = "id"; // placeholder - would need proper function parsing
    }

    const orderExpression: OrderByExpression = {
      field: fieldName,
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
 * Add distinct clause to the query
 * @returns Query builder function
 */
export const distinct = <T>(): QueryBuilder<T> => {
  return (query: Query<T>) => {
    return updateQuery(query, {
      distinctFields: true,
    });
  };
};

/**
 * Add group by to the query
 * @param fields - Fields to group by
 * @returns Query builder function
 */
export const groupBy = <T>(...fields: string[]): QueryBuilder<T> => {
  return (query: Query<T>) => {
    return updateQuery(query, {
      groupByFields: [...query.groupByFields, ...fields],
    });
  };
};

/**
 * Add having clause to the query
 * @param predicate - Having condition function
 * @returns Query builder function
 */
export const having = <T>(
  predicate: (entity: QueryProxy<SchemaToType<any>>) => WhereCondition | WhereCondition[],
): QueryBuilder<T> => {
  return (query: Query<T>) => {
    const proxy = createQueryProxy<SchemaToType<any>>();
    const conditions = predicate(proxy);
    const havingConditions = Array.isArray(conditions) ? conditions : [conditions];

    return updateQuery(query, {
      havingConditions: [...query.havingConditions, ...havingConditions],
    });
  };
};

/**
 * Add inner join to the query
 * @param schema - Schema to join with
 * @param onCondition - Join condition
 * @param alias - Optional alias for the joined table
 * @returns Query builder function
 */
export const innerJoin = <T, J>(
  schema: Schema<J>,
  onCondition: string,
  alias?: string,
): QueryBuilder<T> => {
  return (query: Query<T>) => {
    const joinExpression: JoinExpression = {
      type: "INNER",
      table: schema.tableName,
      alias,
      condition: onCondition,
    };

    return updateQuery(query, {
      joins: [...query.joins, joinExpression],
    });
  };
};

/**
 * Add left join to the query
 * @param schema - Schema to join with
 * @param onCondition - Join condition
 * @param alias - Optional alias for the joined table
 * @returns Query builder function
 */
export const leftJoin = <T, J>(
  schema: Schema<J>,
  onCondition: string,
  alias?: string,
): QueryBuilder<T> => {
  return (query: Query<T>) => {
    const joinExpression: JoinExpression = {
      type: "LEFT",
      table: schema.tableName,
      alias,
      condition: onCondition,
    };

    return updateQuery(query, {
      joins: [...query.joins, joinExpression],
    });
  };
};

/**
 * Add right join to the query
 * @param schema - Schema to join with
 * @param onCondition - Join condition
 * @param alias - Optional alias for the joined table
 * @returns Query builder function
 */
export const rightJoin = <T, J>(
  schema: Schema<J>,
  onCondition: string,
  alias?: string,
): QueryBuilder<T> => {
  return (query: Query<T>) => {
    const joinExpression: JoinExpression = {
      type: "RIGHT",
      table: schema.tableName,
      alias,
      condition: onCondition,
    };

    return updateQuery(query, {
      joins: [...query.joins, joinExpression],
    });
  };
};

/**
 * Add full outer join to the query
 * @param schema - Schema to join with
 * @param onCondition - Join condition
 * @param alias - Optional alias for the joined table
 * @returns Query builder function
 */
export const fullJoin = <T, J>(
  schema: Schema<J>,
  onCondition: string,
  alias?: string,
): QueryBuilder<T> => {
  return (query: Query<T>) => {
    const joinExpression: JoinExpression = {
      type: "FULL",
      table: schema.tableName,
      alias,
      condition: onCondition,
    };

    return updateQuery(query, {
      joins: [...query.joins, joinExpression],
    });
  };
};

/**
 * Check if a field value exists in a subquery
 * @param field - Field to check
 * @param subquery - Subquery to check against
 * @returns WhereCondition for use in where clauses
 */
export const inSubquery = (field: string, subquery: Query<unknown>): WhereCondition => ({
  field,
  operator: "in",
  value: `(${subquery.toString()})`,
});

/**
 * Check if a field value does NOT exist in a subquery
 * @param field - Field to check
 * @param subquery - Subquery to check against
 * @returns WhereCondition for use in where clauses
 */
export const notInSubquery = (field: string, subquery: Query<unknown>): WhereCondition => ({
  field,
  operator: "not_in", 
  value: `(${subquery.toString()})`,
});

/**
 * Check if a subquery exists (returns any rows)
 * @param subquery - Subquery to check
 * @returns WhereCondition for use in where clauses
 */
export const existsSubquery = (subquery: Query<unknown>): WhereCondition => ({
  field: "_exists",
  operator: "exists",
  value: `(${subquery.toString()})`,
});

/**
 * Check if a subquery does NOT exist (returns no rows)
 * @param subquery - Subquery to check
 * @returns WhereCondition for use in where clauses
 */
export const notExistsSubquery = (subquery: Query<unknown>): WhereCondition => ({
  field: "_not_exists",
  operator: "not_exists",
  value: `(${subquery.toString()})`,
});

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
      selector: string | ((entity: QueryProxy<SchemaToType<any>>) => string),
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
    distinct: () => {
      const newQuery = applyBuilder(distinct());
      return createQueryMethods(newQuery);
    },
    groupBy: (...fields: string[]) => {
      const newQuery = applyBuilder(groupBy(...fields));
      return createQueryMethods(newQuery);
    },
    having: (predicate: (entity: QueryProxy<SchemaToType<any>>) => WhereCondition | WhereCondition[]) => {
      const newQuery = applyBuilder(having(predicate));
      return createQueryMethods(newQuery);
    },
    innerJoin: <J>(schema: Schema<J>, onCondition: string, alias?: string) => {
      const newQuery = applyBuilder(innerJoin(schema, onCondition, alias));
      return createQueryMethods(newQuery);
    },
    leftJoin: <J>(schema: Schema<J>, onCondition: string, alias?: string) => {
      const newQuery = applyBuilder(leftJoin(schema, onCondition, alias));
      return createQueryMethods(newQuery);
    },
    rightJoin: <J>(schema: Schema<J>, onCondition: string, alias?: string) => {
      const newQuery = applyBuilder(rightJoin(schema, onCondition, alias));
      return createQueryMethods(newQuery);
    },
    fullJoin: <J>(schema: Schema<J>, onCondition: string, alias?: string) => {
      const newQuery = applyBuilder(fullJoin(schema, onCondition, alias));
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
