// Tests for the new adapter pattern

import { describe, expect, test, afterEach } from "bun:test";
import { connect, sqlite, postgres, connectSqlite, connectPostgres } from "../src/connection/adapters.ts";
import { unlink } from "node:fs/promises";

const TEST_DB1 = "./test-adapter1.db";
const TEST_DB2 = "./test-adapter2.db";

// Cleanup function
const cleanup = async () => {
  try {
    await unlink(TEST_DB1);
    await unlink(TEST_DB2);
  } catch {
    // Ignore cleanup errors
  }
};

afterEach(cleanup);

describe("Adapter Pattern", () => {
  describe("sqlite configuration", () => {
    test("creates config from string path", () => {
      const config = sqlite("./test.db");
      
      expect(config.database).toBe("./test.db");
      expect(config.options?.create).toBe(true);
      expect(config.options?.readwrite).toBe(true);
    });

    test("passes through full config object", () => {
      const fullConfig = {
        database: "./test.db",
        options: {
          create: false,
          readonly: true,
          strict: true,
        },
      };
      
      const config = sqlite(fullConfig);
      expect(config).toEqual(fullConfig);
    });
  });

  describe("postgres configuration", () => {
    test("creates config from connection URL", () => {
      const config = postgres("postgresql://user:pass@localhost:5432/mydb");
      
      expect(config.url).toBe("postgresql://user:pass@localhost:5432/mydb");
    });

    test("passes through full config object", () => {
      const fullConfig = {
        host: "localhost",
        port: 5432,
        database: "myapp",
        user: "admin",
        password: "secret",
        ssl: false,
        max: 20,
      };
      
      const config = postgres(fullConfig);
      expect(config).toEqual(fullConfig);
    });
  });

  describe("connect function", () => {
    test("creates SQLite adapter from string path", async () => {
      const adapter = connect(sqlite(TEST_DB1));
      
      expect(adapter).toBeDefined();
      expect(typeof adapter.connect).toBe("function");
      expect(typeof adapter.query).toBe("function");
      expect(typeof adapter.execute).toBe("function");
      
      // Test connection
      const result = await adapter.connect();
      expect(result.success).toBe(true);
      
      await adapter.disconnect();
    });

    test("creates SQLite adapter from config object", async () => {
      const config = {
        database: TEST_DB2,
        options: { create: true, readwrite: true },
      };
      
      const adapter = connect(sqlite(config));
      
      expect(adapter).toBeDefined();
      
      const result = await adapter.connect();
      expect(result.success).toBe(true);
      
      await adapter.disconnect();
    });

    test("throws error for unknown adapter configuration", () => {
      expect(() => {
        connect({ unknown: "config" });
      }).toThrow("Unknown adapter configuration");
    });

    test("creates PostgreSQL adapter from URL config", () => {
      const adapter = connect(postgres("postgresql://user:pass@localhost/test"));
      
      expect(adapter).toBeDefined();
      expect(typeof adapter.connect).toBe("function");
      expect(typeof adapter.query).toBe("function");
      expect(typeof adapter.execute).toBe("function");
    });

    test("creates PostgreSQL adapter from object config", () => {
      const adapter = connect(postgres({
        host: "localhost",
        port: 5432,
        database: "test",
        user: "postgres",
        password: "secret",
      }));
      
      expect(adapter).toBeDefined();
    });

    test("throws error for unimplemented adapters", () => {
      expect(() => {
        connect({ mysql: "mysql://localhost/test" });
      }).toThrow("MySQL adapter not yet implemented");
    });
  });

  describe("convenience functions", () => {
    test("connectSqlite works with string path", async () => {
      const adapter = connectSqlite(TEST_DB1);
      
      expect(adapter).toBeDefined();
      
      const result = await adapter.connect();
      expect(result.success).toBe(true);
      
      await adapter.disconnect();
    });

    test("connectSqlite works with config object", async () => {
      const config = {
        database: TEST_DB2,
        options: { create: true },
      };
      
      const adapter = connectSqlite(config);
      
      const result = await adapter.connect();
      expect(result.success).toBe(true);
      
      await adapter.disconnect();
    });

    test("connectPostgres works with URL string", () => {
      const adapter = connectPostgres("postgresql://user:pass@localhost/test");
      
      expect(adapter).toBeDefined();
      expect(typeof adapter.connect).toBe("function");
    });

    test("connectPostgres works with config object", () => {
      const config = {
        host: "localhost",
        database: "test",
        user: "postgres",
      };
      
      const adapter = connectPostgres(config);
      expect(adapter).toBeDefined();
    });
  });

  describe("adapter functionality", () => {
    test("adapter supports SQLite-specific methods", async () => {
      const adapter = connect(sqlite(TEST_DB1));
      
      await adapter.connect();
      
      // Test SQLite-specific methods exist
      expect(typeof adapter.createTable).toBe("function");
      expect(typeof adapter.dropTable).toBe("function");
      expect(typeof adapter.tableExists).toBe("function");
      expect(typeof adapter.vacuum).toBe("function");
      expect(typeof adapter.analyze).toBe("function");
      
      // Test creating a table
      const createResult = adapter.createTable("test_table", [
        "id INTEGER PRIMARY KEY",
        "name TEXT NOT NULL",
      ]);
      
      expect(createResult.success).toBe(true);
      expect(adapter.tableExists("test_table")).toBe(true);
      
      await adapter.disconnect();
    });

    test("adapter supports basic database operations", async () => {
      const adapter = connect(sqlite(TEST_DB1));
      
      await adapter.connect();
      
      // Create table
      adapter.createTable("users", [
        "id INTEGER PRIMARY KEY",
        "name TEXT NOT NULL",
        "email TEXT",
      ]);
      
      // Insert data
      const insertResult = await adapter.execute({
        sql: "INSERT INTO users (name, email) VALUES (?, ?)",
        params: ["John Doe", "john@example.com"],
      });
      
      expect(insertResult.success).toBe(true);
      expect(insertResult.data?.changes).toBe(1);
      
      // Query data
      const queryResult = await adapter.query({
        sql: "SELECT * FROM users WHERE name = ?",
        params: ["John Doe"],
      });
      
      expect(queryResult.success).toBe(true);
      expect(queryResult.data).toHaveLength(1);
      expect(queryResult.data?.[0]?.name).toBe("John Doe");
      
      await adapter.disconnect();
    });
  });
});

describe("API Design", () => {
  test("demonstrates clean API usage patterns", async () => {
    // Pattern 1: Simple string path
    const db1 = connect(sqlite("./simple.db"));
    
    // Pattern 2: Configuration object
    const db2 = connect(sqlite({
      database: "./configured.db",
      options: { create: true, strict: true },
    }));
    
    // Pattern 3: Convenience function
    const db3 = connectSqlite("./convenient.db");
    
    // All should work the same way
    for (const db of [db1, db2, db3]) {
      expect(db).toBeDefined();
      expect(typeof db.connect).toBe("function");
    }
    
    // Cleanup
    await Promise.all([
      unlink("./simple.db").catch(() => {}),
      unlink("./configured.db").catch(() => {}), 
      unlink("./convenient.db").catch(() => {}),
    ]);
  });

  test("PostgreSQL adapter patterns work", () => {
    // PostgreSQL adapters are now implemented:
    
    const pgDb = connect(postgres("postgresql://user:pass@localhost/db"));
    const pgDb2 = connect(postgres({
      host: "localhost",
      port: 5432,
      database: "myapp",
      user: "admin",
      password: "secret",
    }));
    
    expect(pgDb).toBeDefined();
    expect(pgDb2).toBeDefined();
    expect(typeof pgDb.connect).toBe("function");
    expect(typeof pgDb2.connect).toBe("function");
  });

  test("future MySQL adapter patterns are designed", () => {
    // MySQL adapter will work like this once implemented:
    
    // const mysqlDb = connect(mysql("mysql://user:pass@localhost/db"));
    // const mysqlDb2 = connect(mysql({
    //   host: "localhost",
    //   port: 3306,
    //   database: "myapp",
    //   user: "admin",
    //   password: "secret",
    // }));
    
    expect(true).toBe(true); // Placeholder test for future implementation
  });
});