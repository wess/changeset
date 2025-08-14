// PostgreSQL connection implementation

import { Pool, type PoolConfig } from "pg";
import { createDatabaseError, err, ok, type Result } from "../types/result.ts";
import type { Connection, ConnectionConfig, ConnectionFactory, QueryResult } from "./connection.ts";

// Functional PostgreSQL connection implementation
interface PostgresConnectionState {
  pool: Pool;
  logQueries: boolean;
}

const createPostgresConnectionState = (pool: Pool, logQueries = false): PostgresConnectionState => ({
  pool,
  logQueries,
});

const createPostgresQuery = (state: PostgresConnectionState) => 
  async <T = unknown>(sql: string, params: unknown[] = []): Promise<Result<QueryResult<T>>> => {
    try {
      if (state.logQueries) {
        console.log("[SQL]", sql, params);
      }

      const startTime = Date.now();
      const result = await state.pool.query(sql, params);
      const duration = Date.now() - startTime;

      if (state.logQueries) {
        console.log(`[SQL] Completed in ${duration}ms`);
      }

      return ok({
        rows: result.rows as T[],
        rowCount: result.rowCount || 0,
        command: result.command,
      });
    } catch (error) {
      const dbError = createDatabaseError(
        error instanceof Error ? error.message : "Unknown database error",
        (error as any)?.code,
        (error as any)?.detail,
      );
      return err(dbError);
    }
  };

const createPostgresClose = (state: PostgresConnectionState) => 
  async (): Promise<void> => {
    await state.pool.end();
  };

const createPostgresConnectionFromPool = (pool: Pool, logQueries = false): Connection => {
  const state = createPostgresConnectionState(pool, logQueries);
  
  return {
    query: createPostgresQuery(state),
    close: createPostgresClose(state),
  };
};

/**
 * Create a PostgreSQL connection
 * @param config - Connection configuration
 * @returns Promise resolving to Connection result
 */
export const createPostgresConnection: ConnectionFactory = async (
  config: ConnectionConfig,
): Promise<Result<Connection>> => {
  try {
    // Parse connection string or use direct config
    const poolConfig: PoolConfig = {
      connectionString: config.database,
      min: config.pool?.min ?? 0,
      max: config.pool?.max ?? 10,
      idleTimeoutMillis: config.pool?.idleTimeoutMillis ?? 30000,
    };

    const pool = new Pool(poolConfig);

    // Test the connection
    const client = await pool.connect();
    client.release();

    const connection = createPostgresConnectionFromPool(pool, config.logQueries);
    return ok(connection);
  } catch (error) {
    const dbError = createDatabaseError(
      error instanceof Error ? error.message : "Failed to create connection",
    );
    return err(dbError);
  }
};
