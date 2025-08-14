// Example usage tests - demonstrating the full API

import { test, expect } from "bun:test";
import { schema, field, idField, timestamps } from "../src/schema/index.ts";
import { from } from "../src/query/index.ts";
import { generateSql } from "../src/repo/sql-generator.ts";

test("complete example: define schema and query", () => {
  // Define a schema like Ecto
  const UserSchema = schema("users", {
    id: idField(),
    name: field("name", "string", { null: false }),
    email: field("email", "string", { unique: true }),
    age: field("age", "integer"),
    active: field("active", "boolean", { default: true }),
    ...timestamps(),
  });

  // Verify schema structure
  expect(UserSchema.tableName).toBe("users");
  expect(UserSchema.fields.id.type).toBe("id");
  expect(UserSchema.fields.name.options.null).toBe(false);
  expect(UserSchema.fields.email.options.unique).toBe(true);
  expect(UserSchema.fields.active.options.default).toBe(true);

  // Build a query like Ecto
  const query = from(UserSchema, "u")
    .limit(10)
    .offset(20)
    .build();

  expect(query.schema.tableName).toBe("users");
  expect(query.alias).toBe("u");
  expect(query.limitValue).toBe(10);
  expect(query.offsetValue).toBe(20);

  // Generate SQL
  const { sql, params } = generateSql(query);
  expect(sql).toBe("SELECT * FROM users AS u LIMIT 10 OFFSET 20");
  expect(params).toEqual([]);
});

test("field types match expected TypeScript types", () => {
  const TestSchema = schema("test", {
    id: field("id", "id"),
    name: field("name", "string"),
    count: field("count", "integer"),
    price: field("price", "float"),
    active: field("active", "boolean"),
    created: field("created", "utc_datetime"),
    tags: field("tags", "array"),
    metadata: field("metadata", "map"),
  });

  // All field types should be properly defined
  expect(TestSchema.fields.id.type).toBe("id");
  expect(TestSchema.fields.name.type).toBe("string");
  expect(TestSchema.fields.count.type).toBe("integer");
  expect(TestSchema.fields.price.type).toBe("float");
  expect(TestSchema.fields.active.type).toBe("boolean");
  expect(TestSchema.fields.created.type).toBe("utc_datetime");
  expect(TestSchema.fields.tags.type).toBe("array");
  expect(TestSchema.fields.metadata.type).toBe("map");
});

test("complex schema with associations structure", () => {
  // User schema
  const UserSchema = schema("users", {
    id: idField(),
    name: field("name", "string", { null: false }),
    email: field("email", "string", { unique: true }),
    ...timestamps(),
  });

  // Post schema  
  const PostSchema = schema("posts", {
    id: idField(),
    title: field("title", "string", { null: false }),
    content: field("content", "string"),
    published: field("published", "boolean", { default: false }),
    user_id: field("user_id", "integer", { null: false }),
    ...timestamps(),
  });

  // Both schemas should be properly structured
  expect(UserSchema.tableName).toBe("users");
  expect(PostSchema.tableName).toBe("posts");
  expect(PostSchema.fields.user_id.type).toBe("integer");
  expect(PostSchema.fields.published.options.default).toBe(false);
});