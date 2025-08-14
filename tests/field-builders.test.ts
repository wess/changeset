// Field builders tests for improved syntax

import { test, expect } from "bun:test";
import { f } from "../src/schema/field-builders.ts";

test("f.string() creates string field", () => {
  const nameField = f.string("name", { null: false });
  
  expect(nameField.name).toBe("name");
  expect(nameField.type).toBe("string");
  expect(nameField.options.null).toBe(false);
});

test("f.integer() creates integer field", () => {
  const ageField = f.integer("age");
  
  expect(ageField.name).toBe("age");
  expect(ageField.type).toBe("integer");
  expect(ageField.options.null).toBe(true); // default
});

test("f.id() creates ID field with correct defaults", () => {
  const idField = f.id();
  
  expect(idField.name).toBe("id");
  expect(idField.type).toBe("id");
  expect(idField.options.primaryKey).toBe(true);
  expect(idField.options.null).toBe(false);
});

test("f.id() accepts custom name", () => {
  const userIdField = f.id("user_id");
  
  expect(userIdField.name).toBe("user_id");
  expect(userIdField.type).toBe("id");
});

test("f.boolean() creates boolean field", () => {
  const activeField = f.boolean("active", { default: true });
  
  expect(activeField.name).toBe("active");
  expect(activeField.type).toBe("boolean");
  expect(activeField.options.default).toBe(true);
});

test("f.float() creates float field", () => {
  const priceField = f.float("price", { null: false });
  
  expect(priceField.name).toBe("price");
  expect(priceField.type).toBe("float");
  expect(priceField.options.null).toBe(false);
});

test("f.utcDateTime() creates UTC datetime field", () => {
  const createdAtField = f.utcDateTime("created_at", { null: false });
  
  expect(createdAtField.name).toBe("created_at");
  expect(createdAtField.type).toBe("utc_datetime");
  expect(createdAtField.options.null).toBe(false);
});

test("f.naiveDateTime() creates naive datetime field", () => {
  const eventTimeField = f.naiveDateTime("event_time");
  
  expect(eventTimeField.name).toBe("event_time");
  expect(eventTimeField.type).toBe("naive_datetime");
});

test("f.array() creates array field", () => {
  const tagsField = f.array("tags");
  
  expect(tagsField.name).toBe("tags");
  expect(tagsField.type).toBe("array");
});

test("f.map() creates map field", () => {
  const metadataField = f.map("metadata");
  
  expect(metadataField.name).toBe("metadata");
  expect(metadataField.type).toBe("map");
});

test("f.date() creates date field", () => {
  const birthDateField = f.date("birth_date");
  
  expect(birthDateField.name).toBe("birth_date");
  expect(birthDateField.type).toBe("date");
});

test("f.time() creates time field", () => {
  const startTimeField = f.time("start_time");
  
  expect(startTimeField.name).toBe("start_time");
  expect(startTimeField.type).toBe("time");
});

test("f.binary() creates binary field", () => {
  const imageDataField = f.binary("image_data");
  
  expect(imageDataField.name).toBe("image_data");
  expect(imageDataField.type).toBe("binary");
});