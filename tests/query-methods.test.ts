// Tests for improved query methods with integrated SQL generation

import { test, expect } from "bun:test";
import { schema, f } from "../src/index.ts";
import { from } from "../src/query/index.ts";

// Test schema using new field syntax
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email"),
  age: f.integer("age"),
});

test("query.toString() returns SQL string", () => {
  const query = from(UserSchema);
  const sql = query.toString();
  
  expect(sql).toBe("SELECT * FROM users");
});

test("query.toString() with limit and offset", () => {
  const query = from(UserSchema).limit(10).offset(20);
  const sql = query.toString();
  
  expect(sql).toBe("SELECT * FROM users LIMIT 10 OFFSET 20");
});

test("query.toString() with alias", () => {
  const query = from(UserSchema, "u").limit(5);
  const sql = query.toString();
  
  expect(sql).toBe("SELECT * FROM users AS u LIMIT 5");
});

test("query.toSql() returns SqlQuery object", () => {
  const query = from(UserSchema).limit(10);
  const sqlQuery = query.toSql();
  
  expect(sqlQuery.sql).toBe("SELECT * FROM users LIMIT 10");
  expect(sqlQuery.params).toEqual([]);
});

test("query.toSql() includes parameters", () => {
  const query = from(UserSchema);
  const sqlQuery = query.toSql();
  
  expect(typeof sqlQuery.sql).toBe("string");
  expect(Array.isArray(sqlQuery.params)).toBe(true);
});

test("query methods are chainable", () => {
  const query = from(UserSchema, "u")
    .limit(10)
    .offset(20);
  
  const sql = query.toString();
  expect(sql).toBe("SELECT * FROM users AS u LIMIT 10 OFFSET 20");
});

test("build() method still works for compatibility", () => {
  const query = from(UserSchema).limit(10).build();
  
  expect(query.schema.tableName).toBe("users");
  expect(query.limitValue).toBe(10);
});