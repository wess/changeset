// Where clause builder with intuitive syntax

import type { WhereCondition } from "../types/query.ts";

/**
 * Field operators interface for the proxy
 */
export interface FieldOperators {
  eq: (value: unknown) => WhereCondition;
  neq: (value: unknown) => WhereCondition;
  gt: (value: unknown) => WhereCondition;
  gte: (value: unknown) => WhereCondition;
  lt: (value: unknown) => WhereCondition;
  lte: (value: unknown) => WhereCondition;
  like: (value: string) => WhereCondition;
  ilike: (value: string) => WhereCondition;
  in: (values: unknown[]) => WhereCondition;
  notIn: (values: unknown[]) => WhereCondition;
  isNull: () => WhereCondition;
  isNotNull: () => WhereCondition;
}

/**
 * Query proxy type that maps all fields to FieldOperators
 */
export type QueryProxy<T> = {
  [K in keyof T]: FieldOperators;
};

/**
 * Proxy-based field accessor for natural query syntax
 * Enables: where(u => u.name.eq("John"))
 */
export const createQueryProxy = <T>(): QueryProxy<T> => {
  return new Proxy({} as QueryProxy<T>, {
    get(_target, prop: string) {
      // Return another proxy with operator methods
      return {
        // Comparison operators
        eq: (value: unknown): WhereCondition => ({
          field: prop,
          operator: "eq",
          value,
        }),
        neq: (value: unknown): WhereCondition => ({
          field: prop,
          operator: "neq",
          value,
        }),
        gt: (value: unknown): WhereCondition => ({
          field: prop,
          operator: "gt",
          value,
        }),
        gte: (value: unknown): WhereCondition => ({
          field: prop,
          operator: "gte",
          value,
        }),
        lt: (value: unknown): WhereCondition => ({
          field: prop,
          operator: "lt",
          value,
        }),
        lte: (value: unknown): WhereCondition => ({
          field: prop,
          operator: "lte",
          value,
        }),
        // String operators
        like: (value: string): WhereCondition => ({
          field: prop,
          operator: "like",
          value,
        }),
        ilike: (value: string): WhereCondition => ({
          field: prop,
          operator: "ilike",
          value,
        }),
        // Array operators
        in: (values: unknown[]): WhereCondition => ({
          field: prop,
          operator: "in",
          value: values,
        }),
        notIn: (values: unknown[]): WhereCondition => ({
          field: prop,
          operator: "not_in",
          value: values,
        }),
        // Null checks
        isNull: (): WhereCondition => ({
          field: prop,
          operator: "is_null",
          value: undefined,
        }),
        isNotNull: (): WhereCondition => ({
          field: prop,
          operator: "is_not_null",
          value: undefined,
        }),
      } as FieldOperators;
    },
  });
};

/**
 * Alternative approach: Parse arrow function string for natural syntax
 * This would enable: where(u => u.age > 18 && u.name == "John")
 *
 * Note: This approach requires parsing the function string, which is more complex
 * and less reliable than the proxy approach above.
 */
export const parseWhereExpression = <T>(expr: (entity: T) => boolean): WhereCondition[] => {
  // Get function string
  const _fnStr = expr.toString();

  // This would require a parser to convert JS expressions to WhereConditions
  // For now, we'll use the proxy approach above which is more reliable

  console.warn("Natural operator syntax (==, >, <) not yet implemented. Use .eq(), .gt(), etc.");
  return [];
};

/**
 * Helper to combine multiple conditions
 */
export const combineConditions = (
  ...conditions: (WhereCondition | WhereCondition[])[]
): WhereCondition[] => {
  return conditions.flat();
};
