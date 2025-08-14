// Database connection interface

import type { Result } from "../types/result.ts";

// Connection configuration
export interface ConnectionConfig {
  database: string; // Connection string
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
  };
  logQueries?: boolean;
  logLevel?: "debug" | "info" | "warn" | "error";
}

// Query result interface
export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
  command: string;
}

// Database connection interface
export interface Connection {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<Result<QueryResult<T>>>;
  close(): Promise<void>;
}

// Connection factory type
export type ConnectionFactory = (config: ConnectionConfig) => Promise<Result<Connection>>;
