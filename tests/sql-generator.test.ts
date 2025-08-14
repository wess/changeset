// SQL generation tests

import { test, expect } from "bun:test";
import { schema, field, idField } from "../src/schema/index.ts";
import { from } from "../src/query/index.ts";
import { 
  generateSql, 
  generateInsertSql, 
  generateUpdateSql, 
  generateDeleteSql 
} from "../src/repo/sql-generator.ts";

// Test schema
const UserSchema = schema("users", {
  id: idField(),
  name: field("name", "string", { null: false }),
  email: field("email", "string"),
  age: field("age", "integer"),
});

test("generateSql() creates basic SELECT", () => {
  const query = from(UserSchema).build();
  const { sql, params } = generateSql(query);
  
  expect(sql).toBe("SELECT * FROM users");
  expect(params).toEqual([]);
});

test("generateSql() includes alias", () => {
  const query = from(UserSchema, "u").build();
  const { sql, params } = generateSql(query);
  
  expect(sql).toBe("SELECT * FROM users AS u");
});

test("generateSql() includes LIMIT", () => {
  const query = from(UserSchema).limit(10).build();
  const { sql, params } = generateSql(query);
  
  expect(sql).toBe("SELECT * FROM users LIMIT 10");
});

test("generateSql() includes OFFSET", () => {
  const query = from(UserSchema).offset(20).build();
  const { sql, params } = generateSql(query);
  
  expect(sql).toBe("SELECT * FROM users OFFSET 20");
});

test("generateSql() includes LIMIT and OFFSET", () => {
  const query = from(UserSchema).limit(10).offset(20).build();
  const { sql, params } = generateSql(query);
  
  expect(sql).toBe("SELECT * FROM users LIMIT 10 OFFSET 20");
});

test("generateInsertSql() creates INSERT statement", () => {
  const data = { name: "John", email: "john@example.com", age: 25 };
  const { sql, params } = generateInsertSql("users", data);
  
  expect(sql).toBe("INSERT INTO users (name, email, age) VALUES ($1, $2, $3) RETURNING *");
  expect(params).toEqual(["John", "john@example.com", 25]);
});

test("generateUpdateSql() creates UPDATE statement", () => {
  const data = { name: "Jane", age: 26 };
  const whereConditions = [{ field: "id", operator: "eq" as const, value: 1 }];
  const { sql, params } = generateUpdateSql("users", data, whereConditions);
  
  expect(sql).toBe("UPDATE users SET name = $1, age = $2 WHERE id = $3 RETURNING *");
  expect(params).toEqual(["Jane", 26, 1]);
});

test("generateDeleteSql() creates DELETE statement", () => {
  const whereConditions = [{ field: "id", operator: "eq" as const, value: 1 }];
  const { sql, params } = generateDeleteSql("users", whereConditions);
  
  expect(sql).toBe("DELETE FROM users WHERE id = $1");
  expect(params).toEqual([1]);
});

test("generateDeleteSql() creates DELETE ALL without WHERE", () => {
  const { sql, params } = generateDeleteSql("users", []);
  
  expect(sql).toBe("DELETE FROM users");
  expect(params).toEqual([]);
});