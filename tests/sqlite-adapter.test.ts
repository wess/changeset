// SQLite adapter specific tests

import { test, expect, beforeEach, afterEach } from "bun:test";
import { createSqliteAdapter } from "../src/connection/sqlite.ts";
import type { DatabaseAdapter } from "../src/connection/types.ts";
import type { Database } from "bun:sqlite";

// Type for SQLite adapter with extended methods
type SqliteAdapter = DatabaseAdapter & {
  createTable: (tableName: string, columns: string[]) => any;
  dropTable: (tableName: string) => any;
  tableExists: (tableName: string) => boolean;
  getRawDatabase: () => Database;
};

let adapter: DatabaseAdapter;

beforeEach(async () => {
  // Create in-memory SQLite database for each test
  adapter = createSqliteAdapter({
    database: ":memory:",
    options: { create: true }
  });
  
  const connectResult = await adapter.connect();
  if (!connectResult.success) {
    throw new Error(`Failed to connect: ${connectResult.error}`);
  }
});

afterEach(async () => {
  await adapter.disconnect();
});

test("SQLite adapter creation and connection", async () => {
  // Connection should already be established in beforeEach
  expect(adapter).toBeDefined();
  
  // Test if we can run a simple query
  const result = await adapter.query({ sql: "SELECT 1 as test", params: [] });
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toEqual([{ test: 1 }]);
  }
});

test("createTable and tableExists functionality", () => {
  const sqliteAdapter = adapter as SqliteAdapter;
  
  // Table should not exist initially
  expect(sqliteAdapter.tableExists("test_table")).toBe(false);
  
  // Create table
  const createResult = sqliteAdapter.createTable("test_table", [
    "id INTEGER PRIMARY KEY AUTOINCREMENT",
    "name TEXT NOT NULL",
    "age INTEGER"
  ]);
  
  expect(createResult.success).toBe(true);
  expect(sqliteAdapter.tableExists("test_table")).toBe(true);
});

test("execute INSERT operation", async () => {
  const sqliteAdapter = adapter as SqliteAdapter;
  
  // Create table first
  sqliteAdapter.createTable("users", [
    "id INTEGER PRIMARY KEY AUTOINCREMENT",
    "name TEXT NOT NULL",
    "email TEXT"
  ]);
  
  // Insert data
  const insertResult = await adapter.execute({
    sql: "INSERT INTO users (name, email) VALUES (?, ?)",
    params: ["John Doe", "john@example.com"]
  });
  
  expect(insertResult.success).toBe(true);
  if (insertResult.success) {
    expect(insertResult.data.changes).toBe(1);
    expect(insertResult.data.lastInsertRowid).toBe(1);
  }
});

test("query operations with parameters", async () => {
  const sqliteAdapter = adapter as SqliteAdapter;
  
  // Create and populate table
  sqliteAdapter.createTable("products", [
    "id INTEGER PRIMARY KEY AUTOINCREMENT",
    "name TEXT NOT NULL",
    "price REAL",
    "in_stock BOOLEAN DEFAULT 1"
  ]);
  
  // Insert test data
  await adapter.execute({
    sql: "INSERT INTO products (name, price, in_stock) VALUES (?, ?, ?)",
    params: ["Laptop", 999.99, true]
  });
  
  await adapter.execute({
    sql: "INSERT INTO products (name, price, in_stock) VALUES (?, ?, ?)",
    params: ["Mouse", 29.99, false]
  });
  
  // Query with parameters
  const queryResult = await adapter.query({
    sql: "SELECT * FROM products WHERE price > ? AND in_stock = ?",
    params: [50, true]
  });
  
  expect(queryResult.success).toBe(true);
  if (queryResult.success) {
    expect(queryResult.data).toHaveLength(1);
    expect(queryResult.data[0].name).toBe("Laptop");
    expect(queryResult.data[0].price).toBe(999.99);
    expect(queryResult.data[0].in_stock).toBe(1); // SQLite stores boolean as integer
  }
});

test("queryOne operation", async () => {
  const sqliteAdapter = adapter as SqliteAdapter;
  
  // Create and populate table
  sqliteAdapter.createTable("settings", [
    "id INTEGER PRIMARY KEY AUTOINCREMENT",
    "key TEXT UNIQUE NOT NULL",
    "value TEXT"
  ]);
  
  await adapter.execute({
    sql: "INSERT INTO settings (key, value) VALUES (?, ?)",
    params: ["theme", "dark"]
  });
  
  // Query single record
  const queryResult = await adapter.queryOne({
    sql: "SELECT * FROM settings WHERE key = ?",
    params: ["theme"]
  });
  
  expect(queryResult.success).toBe(true);
  if (queryResult.success) {
    expect(queryResult.data).toBeDefined();
    expect(queryResult.data?.key).toBe("theme");
    expect(queryResult.data?.value).toBe("dark");
  }
  
  // Query non-existent record
  const notFoundResult = await adapter.queryOne({
    sql: "SELECT * FROM settings WHERE key = ?",
    params: ["nonexistent"]
  });
  
  expect(notFoundResult.success).toBe(true);
  if (notFoundResult.success) {
    expect(notFoundResult.data).toBe(null);
  }
});

test("UPDATE operations", async () => {
  const sqliteAdapter = adapter as SqliteAdapter;
  
  // Create and populate table
  sqliteAdapter.createTable("counters", [
    "id INTEGER PRIMARY KEY AUTOINCREMENT",
    "name TEXT NOT NULL",
    "count INTEGER DEFAULT 0"
  ]);
  
  const insertResult = await adapter.execute({
    sql: "INSERT INTO counters (name, count) VALUES (?, ?)",
    params: ["clicks", 0]
  });
  
  expect(insertResult.success).toBe(true);
  
  // Update the counter
  const updateResult = await adapter.execute({
    sql: "UPDATE counters SET count = count + ? WHERE name = ?",
    params: [5, "clicks"]
  });
  
  expect(updateResult.success).toBe(true);
  if (updateResult.success) {
    expect(updateResult.data.changes).toBe(1);
  }
  
  // Verify the update
  const queryResult = await adapter.queryOne({
    sql: "SELECT count FROM counters WHERE name = ?",
    params: ["clicks"]
  });
  
  expect(queryResult.success).toBe(true);
  if (queryResult.success) {
    expect(queryResult.data?.count).toBe(5);
  }
});

test("DELETE operations", async () => {
  const sqliteAdapter = adapter as SqliteAdapter;
  
  // Create and populate table
  sqliteAdapter.createTable("temp_data", [
    "id INTEGER PRIMARY KEY AUTOINCREMENT",
    "data TEXT",
    "expires_at DATETIME"
  ]);
  
  // Insert multiple records
  await adapter.execute({
    sql: "INSERT INTO temp_data (data, expires_at) VALUES (?, ?)",
    params: ["data1", "2024-01-01"]
  });
  
  await adapter.execute({
    sql: "INSERT INTO temp_data (data, expires_at) VALUES (?, ?)",
    params: ["data2", "2025-01-01"]
  });
  
  // Delete expired records
  const deleteResult = await adapter.execute({
    sql: "DELETE FROM temp_data WHERE expires_at < ?",
    params: ["2024-12-31"]
  });
  
  expect(deleteResult.success).toBe(true);
  if (deleteResult.success) {
    expect(deleteResult.data.changes).toBe(1);
  }
  
  // Verify remaining records
  const remainingResult = await adapter.query({
    sql: "SELECT COUNT(*) as count FROM temp_data",
    params: []
  });
  
  expect(remainingResult.success).toBe(true);
  if (remainingResult.success) {
    expect(remainingResult.data[0].count).toBe(1);
  }
});

test("transaction support", async () => {
  const sqliteAdapter = adapter as SqliteAdapter;
  
  // Create table
  sqliteAdapter.createTable("accounts", [
    "id INTEGER PRIMARY KEY AUTOINCREMENT",
    "name TEXT NOT NULL",
    "balance REAL DEFAULT 0"
  ]);
  
  // Insert initial accounts
  await adapter.execute({
    sql: "INSERT INTO accounts (name, balance) VALUES (?, ?)",
    params: ["Alice", 100.0]
  });
  
  await adapter.execute({
    sql: "INSERT INTO accounts (name, balance) VALUES (?, ?)",
    params: ["Bob", 50.0]
  });
  
  // Test transaction
  const transactionResult = await adapter.transaction(async () => {
    // Transfer money from Alice to Bob
    await adapter.execute({
      sql: "UPDATE accounts SET balance = balance - ? WHERE name = ?",
      params: [25.0, "Alice"]
    });
    
    await adapter.execute({
      sql: "UPDATE accounts SET balance = balance + ? WHERE name = ?",
      params: [25.0, "Bob"]
    });
    
    return "Transfer completed";
  });
  
  expect(transactionResult.success).toBe(true);
  if (transactionResult.success) {
    expect(transactionResult.data).toBe("Transfer completed");
  }
  
  // Verify balances
  const aliceBalance = await adapter.queryOne({
    sql: "SELECT balance FROM accounts WHERE name = ?",
    params: ["Alice"]
  });
  
  const bobBalance = await adapter.queryOne({
    sql: "SELECT balance FROM accounts WHERE name = ?",
    params: ["Bob"]
  });
  
  expect(aliceBalance.success).toBe(true);
  expect(bobBalance.success).toBe(true);
  
  if (aliceBalance.success && bobBalance.success) {
    expect(aliceBalance.data?.balance).toBe(75.0);
    expect(bobBalance.data?.balance).toBe(75.0);
  }
});

test("error handling for invalid SQL", async () => {
  const invalidQueryResult = await adapter.query({
    sql: "SELECT * FROM nonexistent_table",
    params: []
  });
  
  expect(invalidQueryResult.success).toBe(false);
  if (!invalidQueryResult.success) {
    expect(invalidQueryResult.error.message).toContain("no such table");
  }
});

test("error handling for invalid parameters", async () => {
  const sqliteAdapter = adapter as SqliteAdapter;
  
  sqliteAdapter.createTable("test_params", [
    "id INTEGER PRIMARY KEY AUTOINCREMENT",
    "name TEXT NOT NULL"
  ]);
  
  // Too few parameters
  const invalidParamsResult = await adapter.execute({
    sql: "INSERT INTO test_params (name) VALUES (?)",
    params: [] // Missing parameter
  });
  
  expect(invalidParamsResult.success).toBe(false);
});

test("Date handling in parameters", async () => {
  const sqliteAdapter = adapter as SqliteAdapter;
  
  sqliteAdapter.createTable("events", [
    "id INTEGER PRIMARY KEY AUTOINCREMENT",
    "name TEXT NOT NULL",
    "created_at DATETIME"
  ]);
  
  const now = new Date();
  const insertResult = await adapter.execute({
    sql: "INSERT INTO events (name, created_at) VALUES (?, ?)",
    params: ["Test Event", now.toISOString()]
  });
  
  expect(insertResult.success).toBe(true);
  
  const queryResult = await adapter.queryOne({
    sql: "SELECT * FROM events WHERE name = ?",
    params: ["Test Event"]
  });
  
  expect(queryResult.success).toBe(true);
  if (queryResult.success) {
    expect(queryResult.data?.created_at).toBe(now.toISOString());
  }
});

test("dropTable functionality", () => {
  const sqliteAdapter = adapter as SqliteAdapter;
  
  // Create table
  sqliteAdapter.createTable("temp_table", [
    "id INTEGER PRIMARY KEY AUTOINCREMENT",
    "data TEXT"
  ]);
  
  expect(sqliteAdapter.tableExists("temp_table")).toBe(true);
  
  // Drop table
  const dropResult = sqliteAdapter.dropTable("temp_table");
  expect(dropResult.success).toBe(true);
  expect(sqliteAdapter.tableExists("temp_table")).toBe(false);
});

test("getRawDatabase access", () => {
  const sqliteAdapter = adapter as SqliteAdapter;
  const rawDb = sqliteAdapter.getRawDatabase();
  
  expect(rawDb).toBeDefined();
  expect(typeof rawDb.exec).toBe("function");
  expect(typeof rawDb.prepare).toBe("function");
});

test("foreign key constraints", async () => {
  const sqliteAdapter = adapter as SqliteAdapter;
  
  // Create parent table
  sqliteAdapter.createTable("authors", [
    "id INTEGER PRIMARY KEY AUTOINCREMENT",
    "name TEXT NOT NULL"
  ]);
  
  // Create child table with foreign key
  sqliteAdapter.createTable("books", [
    "id INTEGER PRIMARY KEY AUTOINCREMENT",
    "title TEXT NOT NULL",
    "author_id INTEGER NOT NULL",
    "FOREIGN KEY (author_id) REFERENCES authors (id)"
  ]);
  
  // Insert author
  const authorResult = await adapter.execute({
    sql: "INSERT INTO authors (name) VALUES (?)",
    params: ["J.K. Rowling"]
  });
  
  expect(authorResult.success).toBe(true);
  
  // Insert book with valid foreign key
  const bookResult = await adapter.execute({
    sql: "INSERT INTO books (title, author_id) VALUES (?, ?)",
    params: ["Harry Potter", 1]
  });
  
  expect(bookResult.success).toBe(true);
  
  // Try to insert book with invalid foreign key (should fail due to foreign key constraints)
  const invalidBookResult = await adapter.execute({
    sql: "INSERT INTO books (title, author_id) VALUES (?, ?)",
    params: ["Unknown Book", 999]
  });
  
  expect(invalidBookResult.success).toBe(false);
  if (!invalidBookResult.success) {
    expect(invalidBookResult.error.message).toContain("FOREIGN KEY constraint failed");
  }
});