// Adapter pattern for database connections

import { createSqliteAdapter, type SqliteConfig } from "./sqlite.ts";
import { createPostgresAdapter, type PostgresConfig } from "./postgres.ts";
import { type DatabaseAdapter } from "./types.ts";

/**
 * SQLite adapter configuration function
 * @param path - Path to SQLite database file or full config
 * @returns SQLite configuration object
 */
export const sqlite = (path: string | SqliteConfig): SqliteConfig => {
  if (typeof path === "string") {
    return {
      database: path,
      options: { create: true, readwrite: true },
    };
  }
  return path;
};

/**
 * PostgreSQL adapter configuration function
 * @param config - PostgreSQL connection config or URL
 * @returns PostgreSQL configuration object
 */
export const postgres = (config: string | PostgresConfig): PostgresConfig => {
  if (typeof config === "string") {
    return { url: config };
  }
  return config;
};

/**
 * MySQL adapter configuration function (placeholder for future implementation)
 * @param config - MySQL connection config or URL
 * @returns MySQL configuration object
 */
export const mysql = (config: string | Record<string, unknown>): Record<string, unknown> => {
  if (typeof config === "string") {
    return { url: config };
  }
  return config;
};

/**
 * Generic connection function that creates database adapters
 * @param adapterConfig - Configuration object from adapter functions
 * @returns Database adapter instance
 */
export const connect = (adapterConfig: SqliteConfig | PostgresConfig | Record<string, unknown>): DatabaseAdapter => {
  // Check if it's SQLite config (has 'database' property with string value for file path)
  if ('database' in adapterConfig && typeof adapterConfig.database === 'string' && !('url' in adapterConfig || 'host' in adapterConfig)) {
    return createSqliteAdapter(adapterConfig as SqliteConfig);
  }
  
  // Check if it's PostgreSQL config (has 'url' or 'host' property)
  if ('url' in adapterConfig || 'host' in adapterConfig || ('database' in adapterConfig && ('user' in adapterConfig || 'username' in adapterConfig))) {
    return createPostgresAdapter(adapterConfig as PostgresConfig);
  }
  
  // Future: Add MySQL adapters
  if ('mysql' in adapterConfig) {
    throw new Error("MySQL adapter not yet implemented");
  }
  
  throw new Error("Unknown adapter configuration");
};

/**
 * Connection helper functions that combine adapter config and connection
 */
export const connectSqlite = (path: string | SqliteConfig): DatabaseAdapter => {
  return connect(sqlite(path));
};

export const connectPostgres = (config: string | PostgresConfig): DatabaseAdapter => {
  return connect(postgres(config));
};

// Future implementation:
// export const connectMysql = (config: string | Record<string, unknown>): DatabaseAdapter => {
//   return connect(mysql(config));
// };