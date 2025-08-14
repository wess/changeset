// Repository implementation

import { createPostgresConnection } from "../connection/postgres.ts";
import { createSqliteAdapter } from "../connection/sqlite.ts";
import type { ConnectionOptions, DatabaseAdapter } from "../connection/types.ts";
import type { Query } from "../types/query.ts";
import type { Result } from "../types/result.ts";
import { err, ok, createNotFoundError } from "../types/result.ts";
import { generateDeleteSql, generateSql, generateUpdateSql } from "./sql-generator.ts";

// Repository interface
export interface Repo {
  all<T>(query: Query<T>): Promise<Result<T[]>>;
  one<T>(query: Query<T>): Promise<Result<T | null>>;
  one$<T>(query: Query<T>): Promise<Result<T>>; // Throws if not found
  insert<T>(tableName: string, data: Partial<T>): Promise<Result<T>>;
  insertAll<T>(tableName: string, data: Partial<T>[]): Promise<Result<T[]>>;
  update<T>(tableName: string, data: Partial<T>, id: unknown): Promise<Result<T>>;
  updateAll<T>(query: Query<T>, updates: Partial<T>): Promise<Result<{ count: number }>>;
  delete<T>(tableName: string, id: unknown): Promise<Result<T>>;
  deleteAll<T>(query: Query<T>): Promise<Result<{ count: number }>>;
  aggregate<T>(query: Query<T>, operation: string, field: string): Promise<Result<number>>;
  close(): Promise<void>;
}

// Functional repository implementation using closures
export const createRepoFunctions = (adapter: DatabaseAdapter) => {
  const all = async <T>(query: Query<T> | any): Promise<Result<T[]>> => {
    // Check if query has build method (query builder) or is already a built query
    const actualQuery = typeof query.build === "function" ? query.build() : query;
    const sqlQuery = generateSql(actualQuery);
    return await adapter.query<T>(sqlQuery);
  };

  const one = async <T>(query: Query<T> | any): Promise<Result<T | null>> => {
    // Check if query has build method (query builder) or is already a built query
    const actualQuery = typeof query.build === "function" ? query.build() : query;
    const sqlQuery = generateSql(actualQuery);
    return await adapter.queryOne<T>(sqlQuery);
  };

  const one$ = async <T>(query: Query<T>): Promise<Result<T>> => {
    const result = await one(query);

    if (!result.success) {
      return err(result.error);
    }

    if (result.data === null) {
      return err(createNotFoundError("Record", "No record found"));
    }

    return ok(result.data);
  };

  const insert = async <T>(tableName: string, data: Partial<T>): Promise<Result<T>> => {
    // Generate SQLite-compatible insert SQL
    const fields = Object.keys(data as Record<string, unknown>);
    const values = Object.values(data as Record<string, unknown>).map((value) => {
      // Convert Date objects to ISO strings for SQLite
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });

    const fieldList = fields.join(", ");
    const placeholders = fields.map(() => "?").join(", ");

    const sqlQuery = {
      sql: `INSERT INTO ${tableName} (${fieldList}) VALUES (${placeholders})`,
      params: values,
    };

    const result = await adapter.execute(sqlQuery);

    if (!result.success) {
      return err(result.error);
    }

    // For SQLite, we need to fetch the inserted record
    const selectQuery = {
      sql: `SELECT * FROM ${tableName} WHERE rowid = ?`,
      params: [result.data.lastInsertRowid],
    };
    return await adapter.queryOne<T>(selectQuery);
  };

  const insertAll = async <T>(tableName: string, data: Partial<T>[]): Promise<Result<T[]>> => {
    const results: T[] = [];

    // For simplicity, we'll insert one by one
    // In a production implementation, we'd use batch inserts
    for (const item of data) {
      const result = await insert<T>(tableName, item);
      if (!result.success) {
        return err(result.error);
      }
      results.push(result.data);
    }

    return ok(results);
  };

  const update = async <T>(tableName: string, data: Partial<T>, id: unknown): Promise<Result<T>> => {
    const whereConditions = [{ field: "id", operator: "eq" as const, value: id }];
    const sqlQuery = generateUpdateSql(tableName, data as Record<string, unknown>, whereConditions);
    const result = await adapter.execute(sqlQuery);

    if (!result.success) {
      return err(result.error);
    }

    if (result.data.changes === 0) {
      return err(createNotFoundError("Record", "No record found to update"));
    }

    // Fetch the updated record
    const selectQuery = { sql: `SELECT * FROM ${tableName} WHERE id = ?`, params: [id] };
    return await adapter.queryOne<T>(selectQuery);
  };

  const updateAll = async <T>(query: Query<T>, updates: Partial<T>): Promise<Result<{ count: number }>> => {
    const sqlQuery = generateUpdateSql(
      query.schema.tableName,
      updates as Record<string, unknown>,
      query.whereConditions,
    );
    const result = await adapter.execute(sqlQuery);

    if (!result.success) {
      return err(result.error);
    }

    return ok({ count: result.data.changes });
  };

  const deleteRecord = async <T>(tableName: string, id: unknown): Promise<Result<T>> => {
    const whereConditions = [{ field: "id", operator: "eq" as const, value: id }];

    // First get the record
    const selectQuery = { sql: `SELECT * FROM ${tableName} WHERE id = ?`, params: [id] };
    const selectResult = await adapter.queryOne<T>(selectQuery);

    if (!selectResult.success) {
      return err(selectResult.error);
    }

    if (selectResult.data === null) {
      return err(createNotFoundError("Record", "No record found to delete"));
    }

    const record = selectResult.data;

    // Then delete it
    const deleteQuery = generateDeleteSql(tableName, whereConditions);
    const deleteResult = await adapter.execute(deleteQuery);

    if (!deleteResult.success) {
      return err(deleteResult.error);
    }

    return ok(record);
  };

  const deleteAll = async <T>(query: Query<T>): Promise<Result<{ count: number }>> => {
    const sqlQuery = generateDeleteSql(query.schema.tableName, query.whereConditions);
    const result = await adapter.execute(sqlQuery);

    if (!result.success) {
      return err(result.error);
    }

    return ok({ count: result.data.changes });
  };

  const aggregate = async <T>(query: Query<T>, operation: string, field: string): Promise<Result<number>> => {
    const { schema, whereConditions } = query;

    let sql = `SELECT ${operation.toUpperCase()}(${field}) as result FROM ${schema.tableName}`;
    const params: unknown[] = [];

    if (whereConditions.length > 0) {
      // Use the same SQL generation logic as other queries
      const whereQuery = { ...query, selectFields: undefined };
      const { sql: fullSql } = generateSql(whereQuery);
      const whereClause = fullSql.split("WHERE")[1];
      if (whereClause) {
        sql += ` WHERE ${whereClause.trim()}`;
        whereConditions.forEach((condition) => {
          if (condition.value !== undefined) {
            params.push(condition.value);
          }
        });
      }
    }

    const sqlQuery = { sql, params };
    const result = await adapter.query<{ result: number }>(sqlQuery);

    if (!result.success) {
      return err(result.error);
    }

    return ok(result.data[0]?.result || 0);
  };

  const close = async (): Promise<void> => {
    await adapter.disconnect();
  };

  return {
    all,
    one,
    one$,
    insert,
    insertAll,
    update,
    updateAll,
    delete: deleteRecord,
    deleteAll,
    aggregate,
    close,
  };
};

/**
 * Create a repository instance
 * @param options - Database connection options
 * @returns Promise resolving to Repo result
 */
export const createRepo = async (options: ConnectionOptions): Promise<Result<Repo>> => {
  let adapter: DatabaseAdapter;

  try {
    switch (options.type) {
      case "sqlite":
        adapter = createSqliteAdapter(options.config as any);
        break;
      case "postgresql": {
        const connectionResult = await createPostgresConnection(options.config as any);
        if (!connectionResult.success) {
          return err(connectionResult.error);
        }
        // We need to create a PostgreSQL adapter that wraps the connection
        // For now, we'll focus on SQLite
        throw new Error("PostgreSQL adapter not yet updated for new interface");
      }
      default:
        return err(new Error(`Unsupported database type: ${options.type}`));
    }

    const connectResult = await adapter.connect();
    if (!connectResult.success) {
      return err(connectResult.error);
    }

    return ok(createRepoFunctions(adapter));
  } catch (error) {
    return err(new Error(`Failed to create repository: ${error}`));
  }
};

// Convenience function for SQLite
export const createSqliteRepo = async (database: string): Promise<Result<Repo>> => {
  return createRepo({
    type: "sqlite",
    config: { database },
  });
};
