// Database connection types and interfaces

import type { SqlQuery } from "../repo/sql-generator.ts";
import type { Result } from "../types/result.ts";

export interface ConnectionConfig {
  database: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  ssl?: boolean;
  poolSize?: number;
  timeout?: number;
}

export interface DatabaseAdapter {
  // Connection management
  connect(): Promise<Result<void>>;
  disconnect(): Promise<Result<void>>;

  // Query execution
  query<T = unknown>(sqlQuery: SqlQuery): Promise<Result<T[]>>;
  queryOne<T = unknown>(sqlQuery: SqlQuery): Promise<Result<T | null>>;
  execute(sqlQuery: SqlQuery): Promise<Result<{ changes: number; lastInsertRowid: number }>>;

  // Transaction support
  transaction<T>(fn: () => Promise<T>): Promise<Result<T>>;
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable?: boolean;
  defaultValue?: unknown;
  primaryKey?: boolean;
  unique?: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export type DatabaseType = "sqlite" | "postgresql";

export interface ConnectionOptions {
  type: DatabaseType;
  config: ConnectionConfig;
}
