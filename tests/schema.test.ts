// Schema system tests

import { test, expect } from "bun:test";
import { field, idField, timestamps, schema } from "../src/schema/index.ts";

test("field() creates basic field definition", () => {
  const nameField = field("name", "string", { null: false });
  
  expect(nameField.name).toBe("name");
  expect(nameField.type).toBe("string");
  expect(nameField.options.null).toBe(false);
});

test("field() has null: true by default", () => {
  const ageField = field("age", "integer");
  
  expect(ageField.options.null).toBe(true);
});

test("idField() creates ID field with correct defaults", () => {
  const id = idField();
  
  expect(id.name).toBe("id");
  expect(id.type).toBe("id");
  expect(id.options.primaryKey).toBe(true);
  expect(id.options.null).toBe(false);
});

test("idField() accepts custom name", () => {
  const userId = idField("user_id");
  
  expect(userId.name).toBe("user_id");
  expect(userId.type).toBe("id");
});

test("timestamps() creates timestamp fields", () => {
  const ts = timestamps();
  
  expect(ts.inserted_at.name).toBe("inserted_at");
  expect(ts.inserted_at.type).toBe("utc_datetime");
  expect(ts.inserted_at.options.null).toBe(false);
  
  expect(ts.updated_at.name).toBe("updated_at");
  expect(ts.updated_at.type).toBe("utc_datetime");
  expect(ts.updated_at.options.null).toBe(false);
});

test("timestamps() accepts custom type", () => {
  const ts = timestamps("naive_datetime");
  
  expect(ts.inserted_at.type).toBe("naive_datetime");
  expect(ts.updated_at.type).toBe("naive_datetime");
});

test("schema() creates schema with table name and fields", () => {
  const UserSchema = schema("users", {
    id: idField(),
    name: field("name", "string", { null: false }),
    email: field("email", "string", { unique: true }),
    ...timestamps(),
  });
  
  expect(UserSchema.tableName).toBe("users");
  expect(UserSchema.fields.id).toBeDefined();
  expect(UserSchema.fields.name).toBeDefined();
  expect(UserSchema.fields.email).toBeDefined();
  expect(UserSchema.fields.inserted_at).toBeDefined();
  expect(UserSchema.fields.updated_at).toBeDefined();
});