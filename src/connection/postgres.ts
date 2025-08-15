// PostgreSQL database connection using pg package - Functional approach

import { Pool, type PoolConfig } from "pg";
import type { SqlQuery } from "../repo/sql-generator.ts";
import { err, ok, type Result } from "../types/result.ts";
import type { ConnectionConfig, DatabaseAdapter } from "./types.ts";

export interface PostgresConfig extends ConnectionConfig {
  // Connection can be URL string or configuration object
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  username?: string;
  password?: string;
  ssl?: boolean | {
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
  // Connection pool options
  max?: number;
  min?: number;
  idle?: number;
  acquireTimeout?: number;
  createTimeout?: number;
  destroyTimeout?: number;
  reapInterval?: number;
}

// PostgreSQL adapter state
export interface PostgresAdapterState {
  pool: Pool;
  config: PostgresConfig;
}

// Create a PostgreSQL adapter state
const createPostgresState = (config: PostgresConfig): PostgresAdapterState => {
  try {
    let poolConfig: PoolConfig;
    
    if (config.url) {
      poolConfig = {
        connectionString: config.url,
        max: config.max || 10,
        min: config.min || 0,
        idleTimeoutMillis: config.idle || 30000,
        connectionTimeoutMillis: config.acquireTimeout || 60000,
        ssl: config.ssl || false,
      };
    } else {
      // Build config from components
      poolConfig = {
        host: config.host || "localhost",
        port: config.port || 5432,
        database: config.database || "postgres",
        user: config.user || config.username || "postgres",
        password: config.password || "",
        max: config.max || 10,
        min: config.min || 0,
        idleTimeoutMillis: config.idle || 30000,
        connectionTimeoutMillis: config.acquireTimeout || 60000,
        ssl: config.ssl || false,
      };
    }

    const pool = new Pool(poolConfig);
    
    return { pool, config };
  } catch (error) {
    throw new Error(`Failed to create PostgreSQL connection pool: ${error}`);
  }
};

// Connection functions
const connect = (state: PostgresAdapterState) => async (): Promise<Result<void>> => {
  try {
    // Test connection with a simple query
    const client = await state.pool.connect();
    await client.query("SELECT 1 as test");
    client.release();
    return ok(undefined);
  } catch (error) {
    return err(new Error(`PostgreSQL connection failed: ${error}`));
  }
};

const disconnect = (state: PostgresAdapterState) => async (): Promise<Result<void>> => {
  try {
    await state.pool.end();
    return ok(undefined);
  } catch (error) {
    return err(new Error(`Failed to close PostgreSQL connection: ${error}`));
  }
};

// Query functions
const query =
  <T = unknown>(state: PostgresAdapterState) =>
  async (sqlQuery: SqlQuery): Promise<Result<T[]>> => {
    try {
      const { sql, params } = sqlQuery;
      const result = await state.pool.query(sql, params);
      return ok(result.rows as T[]);
    } catch (error) {
      return err(
        new Error(
          `PostgreSQL query failed: ${error}\\nSQL: ${sqlQuery.sql}\\nParams: ${JSON.stringify(sqlQuery.params)}`,
        ),
      );
    }
  };

const queryOne =
  <T = unknown>(state: PostgresAdapterState) =>
  async (sqlQuery: SqlQuery): Promise<Result<T | null>> => {
    try {
      const { sql, params } = sqlQuery;
      const result = await state.pool.query(sql, params);
      const row = result.rows[0] as T | undefined;
      return ok(row || null);
    } catch (error) {
      return err(
        new Error(
          `PostgreSQL queryOne failed: ${error}\\nSQL: ${sqlQuery.sql}\\nParams: ${JSON.stringify(sqlQuery.params)}`,
        ),
      );
    }
  };

const execute =
  (state: PostgresAdapterState) =>
  async (sqlQuery: SqlQuery): Promise<Result<{ changes: number; lastInsertRowid: number }>> => {
    try {
      const { sql, params } = sqlQuery;
      
      const result = await state.pool.query(sql, params);
      
      // PostgreSQL returns different result format than SQLite
      // For INSERT with RETURNING, result.rows will contain the inserted data
      // For UPDATE/DELETE, result.rowCount shows affected rows
      const changes = result.rowCount || 0;
      const lastInsertRowid = result.rows[0]?.id ? Number(result.rows[0].id) : 0;
      
      return ok({
        changes,
        lastInsertRowid,
      });
    } catch (error) {
      return err(
        new Error(
          `PostgreSQL execute failed: ${error}\\nSQL: ${sqlQuery.sql}\\nParams: ${JSON.stringify(sqlQuery.params)}`,
        ),
      );
    }
  };

const transaction =
  <T>(state: PostgresAdapterState) =>
  async (fn: () => Promise<T>): Promise<Result<T>> => {
    const client = await state.pool.connect();
    
    try {
      await client.query("BEGIN");
      
      try {
        const result = await fn();
        await client.query("COMMIT");
        return ok(result);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    } catch (error) {
      return err(new Error(`PostgreSQL transaction failed: ${error}`));
    } finally {
      client.release();
    }
  };

// PostgreSQL-specific helper functions
const createTable =
  (state: PostgresAdapterState) =>
  async (tableName: string, columns: string[]): Promise<Result<void>> => {
    try {
      const columnDefs = columns.join(", ");
      const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`;
      await state.pool.query(sql);
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to create table ${tableName}: ${error}`));
    }
  };

const dropTable =
  (state: PostgresAdapterState) =>
  async (tableName: string): Promise<Result<void>> => {
    try {
      await state.pool.query(`DROP TABLE IF EXISTS ${tableName}`);
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to drop table ${tableName}: ${error}`));
    }
  };

const addColumn =
  (state: PostgresAdapterState) =>
  async (tableName: string, columnDef: string): Promise<Result<void>> => {
    try {
      await state.pool.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnDef}`);
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to add column to ${tableName}: ${error}`));
    }
  };

const createIndex =
  (state: PostgresAdapterState) =>
  async (indexName: string, tableName: string, columns: string[], unique = false): Promise<Result<void>> => {
    try {
      const uniqueClause = unique ? "UNIQUE " : "";
      const columnList = columns.join(", ");
      await state.pool.query(`CREATE ${uniqueClause}INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columnList})`);
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to create index ${indexName}: ${error}`));
    }
  };

const dropIndex =
  (state: PostgresAdapterState) =>
  async (indexName: string): Promise<Result<void>> => {
    try {
      await state.pool.query(`DROP INDEX IF EXISTS ${indexName}`);
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to drop index ${indexName}: ${error}`));
    }
  };

const vacuum =
  (state: PostgresAdapterState) =>
  async (): Promise<Result<void>> => {
    try {
      await state.pool.query("VACUUM");
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to vacuum database: ${error}`));
    }
  };

const analyze =
  (state: PostgresAdapterState) =>
  async (): Promise<Result<void>> => {
    try {
      await state.pool.query("ANALYZE");
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to analyze database: ${error}`));
    }
  };

const tableExists =
  (state: PostgresAdapterState) =>
  async (tableName: string): Promise<boolean> => {
    try {
      const result = await state.pool.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) as exists",
        [tableName]
      );
      return Boolean(result.rows[0]?.exists);
    } catch {
      return false;
    }
  };

// Get raw database instance for advanced operations
const getRawDatabase = (state: PostgresAdapterState) => (): Pool => {
  return state.pool;
};

// Create functional PostgreSQL adapter
export const createPostgresAdapter = (config: PostgresConfig): DatabaseAdapter => {
  const state = createPostgresState(config);

  return {
    connect: connect(state),
    disconnect: disconnect(state),
    query: query(state),
    queryOne: queryOne(state),
    execute: execute(state),
    transaction: transaction(state),
    // Attach PostgreSQL-specific methods
    createTable: createTable(state),
    dropTable: dropTable(state),
    addColumn: addColumn(state),
    createIndex: createIndex(state),
    dropIndex: dropIndex(state),
    vacuum: vacuum(state),
    analyze: analyze(state),
    tableExists: tableExists(state),
    getRawDatabase: getRawDatabase(state),
  } as DatabaseAdapter & {
    createTable: (tableName: string, columns: string[]) => Promise<Result<void>>;
    dropTable: (tableName: string) => Promise<Result<void>>;
    addColumn: (tableName: string, columnDef: string) => Promise<Result<void>>;
    createIndex: (indexName: string, tableName: string, columns: string[], unique?: boolean) => Promise<Result<void>>;
    dropIndex: (indexName: string) => Promise<Result<void>>;
    vacuum: () => Promise<Result<void>>;
    analyze: () => Promise<Result<void>>;
    tableExists: (tableName: string) => Promise<boolean>;
    getRawDatabase: () => Pool;
  };
};
