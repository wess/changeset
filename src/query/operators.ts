// Query operators for conditions

import type { ComparisonOperator, WhereCondition } from "../types/query.ts";

/**
 * Field proxy object that provides operator methods
 */
export interface FieldOperators<T> {
  eq: (value: T) => WhereCondition;
  neq: (value: T) => WhereCondition;
  gt: (value: T) => WhereCondition;
  gte: (value: T) => WhereCondition;
  lt: (value: T) => WhereCondition;
  lte: (value: T) => WhereCondition;
  like: (value: string) => WhereCondition;
  ilike: (value: string) => WhereCondition;
  in: (values: T[]) => WhereCondition;
  notIn: (values: T[]) => WhereCondition;
  isNull: () => WhereCondition;
  isNotNull: () => WhereCondition;
}

/**
 * Create a field operator proxy
 * @param fieldName - Name of the field
 * @returns Field operators object
 */
export const createFieldOperators = <T>(fieldName: string): FieldOperators<T> => {
  const createCondition = (operator: ComparisonOperator, value?: unknown): WhereCondition => ({
    field: fieldName,
    operator,
    value,
  });

  return {
    eq: (value: T) => createCondition("eq", value),
    neq: (value: T) => createCondition("neq", value),
    gt: (value: T) => createCondition("gt", value),
    gte: (value: T) => createCondition("gte", value),
    lt: (value: T) => createCondition("lt", value),
    lte: (value: T) => createCondition("lte", value),
    like: (value: string) => createCondition("like", value),
    ilike: (value: string) => createCondition("ilike", value),
    in: (values: T[]) => createCondition("in", values),
    notIn: (values: T[]) => createCondition("not_in", values),
    isNull: () => createCondition("is_null"),
    isNotNull: () => createCondition("is_not_null"),
  };
};

// Logical operators are exported from where-builder.ts to avoid conflicts

/**
 * Helper function to flatten condition arrays
 */
export const flattenConditions = (
  conditions: (WhereCondition | WhereCondition[])[],
): WhereCondition[] => {
  return conditions.flat();
};
