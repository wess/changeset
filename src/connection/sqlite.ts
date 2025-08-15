// SQLite database connection using Bun's built-in sqlite - Functional approach

import { Database } from "bun:sqlite";
import type { SqlQuery } from "../repo/sql-generator.ts";
import { err, ok, type Result } from "../types/result.ts";
import type { ConnectionConfig, DatabaseAdapter } from "./types.ts";

export interface SqliteConfig extends ConnectionConfig {
  database: string; // File path for SQLite database
  options?: {
    create?: boolean;
    readwrite?: boolean;
    readonly?: boolean;
    strict?: boolean;
  };
}

// SQLite adapter state
export interface SqliteAdapterState {
  db: Database;
  config: SqliteConfig;
}

// Create a SQLite adapter state
const createSqliteState = (config: SqliteConfig): SqliteAdapterState => {
  try {
    const db = new Database(config.database, config.options);
    // Enable foreign keys and WAL mode for better performance
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec("PRAGMA journal_mode = WAL;");

    return { db, config };
  } catch (error) {
    throw new Error(`Failed to connect to SQLite database: ${error}`);
  }
};

// Connection functions
const connect = (state: SqliteAdapterState) => async (): Promise<Result<void>> => {
  try {
    // SQLite connection is established in constructor
    // Just verify it's working with a simple query
    state.db.query("SELECT 1").get();
    return ok(undefined);
  } catch (error) {
    return err(new Error(`SQLite connection failed: ${error}`));
  }
};

const disconnect = (state: SqliteAdapterState) => async (): Promise<Result<void>> => {
  try {
    state.db.close();
    return ok(undefined);
  } catch (error) {
    return err(new Error(`Failed to close SQLite connection: ${error}`));
  }
};

// Query functions
const query =
  <T = unknown>(state: SqliteAdapterState) =>
  async (sqlQuery: SqlQuery): Promise<Result<T[]>> => {
    try {
      const { sql, params } = sqlQuery;
      const stmt = state.db.prepare(sql);

      // Execute query and return results
      const results = stmt.all(...params) as T[];
      return ok(results);
    } catch (error) {
      return err(
        new Error(
          `SQLite query failed: ${error}\nSQL: ${sqlQuery.sql}\nParams: ${JSON.stringify(sqlQuery.params)}`,
        ),
      );
    }
  };

const queryOne =
  <T = unknown>(state: SqliteAdapterState) =>
  async (sqlQuery: SqlQuery): Promise<Result<T | null>> => {
    try {
      const { sql, params } = sqlQuery;
      const stmt = state.db.prepare(sql);

      // Execute query and return first result
      const result = stmt.get(...params) as T | undefined;
      return ok(result || null);
    } catch (error) {
      return err(
        new Error(
          `SQLite queryOne failed: ${error}\nSQL: ${sqlQuery.sql}\nParams: ${JSON.stringify(sqlQuery.params)}`,
        ),
      );
    }
  };

const execute =
  (state: SqliteAdapterState) =>
  async (sqlQuery: SqlQuery): Promise<Result<{ changes: number; lastInsertRowid: number }>> => {
    try {
      const { sql, params } = sqlQuery;
      const stmt = state.db.prepare(sql);

      // Execute statement (INSERT, UPDATE, DELETE)
      const result = stmt.run(...params);
      return ok({
        changes: result.changes,
        lastInsertRowid: Number(result.lastInsertRowid),
      });
    } catch (error) {
      return err(
        new Error(
          `SQLite execute failed: ${error}\nSQL: ${sqlQuery.sql}\nParams: ${JSON.stringify(sqlQuery.params)}`,
        ),
      );
    }
  };

const transaction =
  <T>(state: SqliteAdapterState) =>
  async (fn: () => Promise<T>): Promise<Result<T>> => {
    try {
      // Begin transaction manually for async support
      state.db.exec("BEGIN TRANSACTION");
      
      try {
        const result = await fn();
        state.db.exec("COMMIT");
        return ok(result);
      } catch (error) {
        state.db.exec("ROLLBACK");
        throw error;
      }
    } catch (error) {
      return err(new Error(`SQLite transaction failed: ${error}`));
    }
  };

// SQLite-specific helper functions
const createTable =
  (state: SqliteAdapterState) =>
  (tableName: string, columns: string[]): Result<void> => {
    try {
      const columnDefs = columns.join(", ");
      const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`;
      state.db.exec(sql);
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to create table ${tableName}: ${error}`));
    }
  };

const dropTable =
  (state: SqliteAdapterState) =>
  (tableName: string): Result<void> => {
    try {
      state.db.exec(`DROP TABLE IF EXISTS ${tableName}`);
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to drop table ${tableName}: ${error}`));
    }
  };

const addColumn =
  (state: SqliteAdapterState) =>
  (tableName: string, columnDef: string): Result<void> => {
    try {
      state.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`);
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to add column to ${tableName}: ${error}`));
    }
  };

const createIndex =
  (state: SqliteAdapterState) =>
  (indexName: string, tableName: string, columns: string[], unique = false): Result<void> => {
    try {
      const uniqueClause = unique ? "UNIQUE " : "";
      const columnList = columns.join(", ");
      state.db.exec(`CREATE ${uniqueClause}INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columnList})`);
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to create index ${indexName}: ${error}`));
    }
  };

const dropIndex =
  (state: SqliteAdapterState) =>
  (indexName: string): Result<void> => {
    try {
      state.db.exec(`DROP INDEX IF EXISTS ${indexName}`);
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to drop index ${indexName}: ${error}`));
    }
  };

const vacuum =
  (state: SqliteAdapterState) =>
  (): Result<void> => {
    try {
      state.db.exec("VACUUM");
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to vacuum database: ${error}`));
    }
  };

const analyze =
  (state: SqliteAdapterState) =>
  (): Result<void> => {
    try {
      state.db.exec("ANALYZE");
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to analyze database: ${error}`));
    }
  };

const tableExists =
  (state: SqliteAdapterState) =>
  (tableName: string): boolean => {
    try {
      const result = state.db
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name=?;")
        .get(tableName);
      return !!result;
    } catch {
      return false;
    }
  };

// Get raw database instance for advanced operations
const getRawDatabase = (state: SqliteAdapterState) => (): Database => {
  return state.db;
};

// Create functional SQLite adapter
export const createSqliteAdapter = (config: SqliteConfig): DatabaseAdapter => {
  const state = createSqliteState(config);

  return {
    connect: connect(state),
    disconnect: disconnect(state),
    query: query(state),
    queryOne: queryOne(state),
    execute: execute(state),
    transaction: transaction(state),
    // Attach SQLite-specific methods
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
    createTable: (tableName: string, columns: string[]) => Result<void>;
    dropTable: (tableName: string) => Result<void>;
    addColumn: (tableName: string, columnDef: string) => Result<void>;
    createIndex: (indexName: string, tableName: string, columns: string[], unique?: boolean) => Result<void>;
    dropIndex: (indexName: string) => Result<void>;
    vacuum: () => Result<void>;
    analyze: () => Result<void>;
    tableExists: (tableName: string) => boolean;
    getRawDatabase: () => Database;
  };
};
