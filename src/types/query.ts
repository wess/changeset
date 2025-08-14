// Query type definitions

import type { Schema } from "./schema.ts";

// Query builder interface - immutable operations
export interface Query<T = unknown> {
  readonly schema: Schema;
  readonly alias?: string;
  readonly whereConditions: WhereCondition[];
  readonly selectFields?: SelectExpression<T>;
  readonly joins: JoinExpression[];
  readonly orderByFields: OrderByExpression[];
  readonly limitValue?: number;
  readonly offsetValue?: number;
  readonly groupByFields: string[];
  readonly havingConditions: WhereCondition[];
  readonly distinctFields?: string[];
}

// Where condition types
export interface WhereCondition {
  field: string;
  operator: ComparisonOperator;
  value: unknown;
  logical?: LogicalOperator;
  // For composite conditions (and/or)
  conditions?: WhereCondition[];
}

export type ComparisonOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "in"
  | "not_in"
  | "is_null"
  | "is_not_null"
  | "and"
  | "or"
  | "not";

export type LogicalOperator = "and" | "or" | "not";

// Select expression types
export type SelectExpression<T> = (entity: T) => unknown;

// Join types
export interface JoinExpression {
  type: "join" | "left_join" | "right_join" | "full_join";
  schema: Schema;
  alias?: string;
  on: JoinCondition;
}

export interface JoinCondition {
  leftField: string;
  rightField: string;
}

// Order by types
export interface OrderByExpression {
  field: string;
  direction: "asc" | "desc";
}

// Query builder function type - returns new Query instance
export type QueryBuilder<T> = (query: Query<T>) => Query<T>;

// Queryable type - anything that can be queried
export type Queryable<T = unknown> = Schema<any> | Query<T>;
