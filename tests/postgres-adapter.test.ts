// Tests for PostgreSQL Adapter (requires PostgreSQL instance)

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { createPostgresAdapter } from "../src/connection/postgres.ts";

// Skip PostgreSQL tests if no database is available
const POSTGRES_URL = process.env.POSTGRES_URL || "postgresql://postgres:postgres@localhost:5432/changeset_test";
const SKIP_POSTGRES_TESTS = !process.env.POSTGRES_URL && !process.env.RUN_POSTGRES_TESTS;

describe("PostgreSQL Adapter", () => {
  let adapter: ReturnType<typeof createPostgresAdapter>;

  beforeEach(() => {
    if (SKIP_POSTGRES_TESTS) {
      return;
    }

    adapter = createPostgresAdapter({
      url: POSTGRES_URL,
      max: 5,
      min: 0,
    });
  });

  afterEach(async () => {
    if (SKIP_POSTGRES_TESTS || !adapter) {
      return;
    }

    try {
      await adapter.disconnect();
    } catch {
      // Ignore cleanup errors
    }
  });

  if (SKIP_POSTGRES_TESTS) {
    test.skip("PostgreSQL tests skipped - no database available", () => {
      expect(true).toBe(true);
    });
    return;
  }

  describe("connection management", () => {
    test("connects to PostgreSQL database", async () => {
      const result = await adapter.connect();
      expect(result.success).toBe(true);
    });

    test("handles connection failures gracefully", async () => {
      const badAdapter = createPostgresAdapter({
        url: "postgresql://invalid:invalid@localhost:9999/nonexistent",
        acquireTimeout: 1000,
      });

      const result = await badAdapter.connect();
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("PostgreSQL connection failed");
    });
  });

  describe("table operations", () => {
    beforeEach(async () => {
      await adapter.connect();
      // Clean up any existing test tables
      await adapter.dropTable("test_users");
    });

    test("createTable creates a table", async () => {
      const result = await adapter.createTable("test_users", [
        "id SERIAL PRIMARY KEY",
        "name VARCHAR(255) NOT NULL",
        "email VARCHAR(255) UNIQUE",
        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
      ]);
      
      expect(result.success).toBe(true);
      expect(await adapter.tableExists("test_users")).toBe(true);
    });

    test("dropTable drops a table", async () => {
      // First create a table
      await adapter.createTable("temp_table", ["id SERIAL PRIMARY KEY"]);
      expect(await adapter.tableExists("temp_table")).toBe(true);
      
      // Then drop it
      const result = await adapter.dropTable("temp_table");
      expect(result.success).toBe(true);
      expect(await adapter.tableExists("temp_table")).toBe(false);
    });

    test("tableExists returns correct status", async () => {
      expect(await adapter.tableExists("nonexistent_table")).toBe(false);
      
      await adapter.createTable("existing_table", ["id SERIAL PRIMARY KEY"]);
      expect(await adapter.tableExists("existing_table")).toBe(true);
    });
  });

  describe("column operations", () => {
    beforeEach(async () => {
      await adapter.connect();
      await adapter.dropTable("test_table");
      await adapter.createTable("test_table", [
        "id SERIAL PRIMARY KEY",
        "name VARCHAR(255) NOT NULL",
      ]);
    });

    test("addColumn adds a column", async () => {
      const result = await adapter.addColumn("test_table", "email VARCHAR(255)");
      expect(result.success).toBe(true);
    });

    test("addColumn handles errors gracefully", async () => {
      const result = await adapter.addColumn("nonexistent_table", "email VARCHAR(255)");
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("Failed to add column");
    });
  });

  describe("index operations", () => {
    beforeEach(async () => {
      await adapter.connect();
      await adapter.dropTable("indexed_table");
      await adapter.createTable("indexed_table", [
        "id SERIAL PRIMARY KEY", 
        "name VARCHAR(255) NOT NULL",
        "email VARCHAR(255)",
        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
      ]);
    });

    test("createIndex creates a regular index", async () => {
      const result = await adapter.createIndex("idx_name", "indexed_table", ["name"]);
      expect(result.success).toBe(true);
    });

    test("createIndex creates a unique index", async () => {
      const result = await adapter.createIndex("idx_email", "indexed_table", ["email"], true);
      expect(result.success).toBe(true);
    });

    test("createIndex creates a composite index", async () => {
      const result = await adapter.createIndex("idx_name_email", "indexed_table", ["name", "email"]);
      expect(result.success).toBe(true);
    });

    test("dropIndex drops an index", async () => {
      // First create an index
      await adapter.createIndex("idx_to_drop", "indexed_table", ["name"]);
      
      // Then drop it
      const result = await adapter.dropIndex("idx_to_drop");
      expect(result.success).toBe(true);
    });

    test("index operations handle errors gracefully", async () => {
      const createResult = await adapter.createIndex("bad_idx", "nonexistent_table", ["name"]);
      expect(createResult.success).toBe(false);
      
      const dropResult = await adapter.dropIndex("nonexistent_index");
      expect(dropResult.success).toBe(true); // PostgreSQL doesn't error on DROP INDEX IF EXISTS
    });
  });

  describe("database maintenance", () => {
    beforeEach(async () => {
      await adapter.connect();
      await adapter.dropTable("maintenance_table");
      await adapter.createTable("maintenance_table", [
        "id SERIAL PRIMARY KEY",
        "data TEXT",
      ]);
      
      // Insert some test data
      await adapter.execute({
        sql: "INSERT INTO maintenance_table (data) VALUES ($1)",
        params: ["test data"],
      });
    });

    test("vacuum optimizes the database", async () => {
      const result = await adapter.vacuum();
      expect(result.success).toBe(true);
    });

    test("analyze updates statistics", async () => {
      const result = await adapter.analyze();
      expect(result.success).toBe(true);
    });
  });

  describe("query operations", () => {
    beforeEach(async () => {
      await adapter.connect();
      await adapter.dropTable("query_test");
      await adapter.createTable("query_test", [
        "id SERIAL PRIMARY KEY",
        "name VARCHAR(255) NOT NULL",
        "age INTEGER",
      ]);
    });

    test("query returns multiple rows", async () => {
      // Insert test data
      await adapter.execute({
        sql: "INSERT INTO query_test (name, age) VALUES ($1, $2), ($3, $4)",
        params: ["Alice", 25, "Bob", 30],
      });

      const result = await adapter.query({
        sql: "SELECT * FROM query_test ORDER BY name",
        params: [],
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0]?.name).toBe("Alice");
      expect(result.data?.[1]?.name).toBe("Bob");
    });

    test("queryOne returns single row", async () => {
      await adapter.execute({
        sql: "INSERT INTO query_test (name, age) VALUES ($1, $2)",
        params: ["Charlie", 35],
      });

      const result = await adapter.queryOne({
        sql: "SELECT * FROM query_test WHERE name = $1",
        params: ["Charlie"],
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Charlie");
      expect(result.data?.age).toBe(35);
    });

    test("execute returns affected row count", async () => {
      const result = await adapter.execute({
        sql: "INSERT INTO query_test (name, age) VALUES ($1, $2)",
        params: ["David", 40],
      });

      expect(result.success).toBe(true);
      expect(result.data?.changes).toBe(1);
    });
  });

  describe("transaction handling", () => {
    beforeEach(async () => {
      await adapter.connect();
      await adapter.dropTable("transaction_test");
      await adapter.createTable("transaction_test", [
        "id SERIAL PRIMARY KEY",
        "name VARCHAR(255)",
      ]);
    });

    test("successful transaction commits", async () => {
      const result = await adapter.transaction(async () => {
        await adapter.execute({
          sql: "INSERT INTO transaction_test (name) VALUES ($1)",
          params: ["test1"],
        });
        
        await adapter.execute({
          sql: "INSERT INTO transaction_test (name) VALUES ($1)", 
          params: ["test2"],
        });
        
        return "success";
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      
      // Verify data was committed
      const records = await adapter.query({
        sql: "SELECT COUNT(*) as count FROM transaction_test",
        params: [],
      });
      
      expect(records.success).toBe(true);
      expect(Number(records.data?.[0]?.count)).toBe(2);
    });

    test("failed transaction rolls back", async () => {
      const result = await adapter.transaction(async () => {
        await adapter.execute({
          sql: "INSERT INTO transaction_test (name) VALUES ($1)",
          params: ["test1"],
        });
        
        // Force an error
        throw new Error("Intentional error");
      });
      
      expect(result.success).toBe(false);
      
      // Verify no data was committed
      const records = await adapter.query({
        sql: "SELECT COUNT(*) as count FROM transaction_test",
        params: [],
      });
      
      expect(records.success).toBe(true);
      expect(Number(records.data?.[0]?.count)).toBe(0);
    });
  });

  describe("error handling", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    test("handles invalid SQL gracefully", async () => {
      const result = await adapter.query({
        sql: "INVALID SQL STATEMENT",
        params: [],
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("PostgreSQL query failed");
    });

    test("handles invalid table operations", async () => {
      const result = await adapter.createTable("", []); // Invalid table name
      expect(result.success).toBe(false);
    });
  });

  describe("raw database access", () => {
    test("getRawDatabase returns pg Pool instance", async () => {
      await adapter.connect();
      const pool = adapter.getRawDatabase();
      
      expect(pool).toBeDefined();
      expect(typeof pool.query).toBe("function");
      expect(typeof pool.connect).toBe("function");
      expect(typeof pool.end).toBe("function");
    });

    test("raw database can execute queries", async () => {
      await adapter.connect();
      const pool = adapter.getRawDatabase();
      
      // Create table using raw pool
      await pool.query("CREATE TABLE IF NOT EXISTS raw_test (id SERIAL PRIMARY KEY, name VARCHAR(255))");
      
      // Verify table exists using adapter
      expect(await adapter.tableExists("raw_test")).toBe(true);
      
      // Cleanup
      await pool.query("DROP TABLE IF EXISTS raw_test");
    });
  });

  describe("PostgreSQL-specific features", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    test("supports PostgreSQL-specific column types", async () => {
      const result = await adapter.createTable("pg_types_test", [
        "id SERIAL PRIMARY KEY",
        "data JSONB",
        "tags TEXT[]",
        "created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
        "uuid_col UUID DEFAULT gen_random_uuid()",
      ]);

      expect(result.success).toBe(true);
      expect(await adapter.tableExists("pg_types_test")).toBe(true);
      
      // Cleanup
      await adapter.dropTable("pg_types_test");
    });

    test("supports PostgreSQL-specific SQL features", async () => {
      await adapter.createTable("pg_features_test", [
        "id SERIAL PRIMARY KEY",
        "data JSONB",
      ]);

      // Test JSONB operations
      const insertResult = await adapter.execute({
        sql: "INSERT INTO pg_features_test (data) VALUES ($1) RETURNING id",
        params: [JSON.stringify({ name: "test", tags: ["a", "b"] })],
      });

      expect(insertResult.success).toBe(true);

      // Test JSONB query
      const queryResult = await adapter.query({
        sql: "SELECT * FROM pg_features_test WHERE data->>'name' = $1",
        params: ["test"],
      });

      expect(queryResult.success).toBe(true);
      expect(queryResult.data).toHaveLength(1);

      // Cleanup
      await adapter.dropTable("pg_features_test");
    });
  });
});