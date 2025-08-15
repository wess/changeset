// Tests for the clean where syntax

import { test, expect } from "bun:test";
import { schema, f, from } from "../src/index.ts";
import { and, or } from "../src/query/where-builder.ts";

// Test schema
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email"),
  age: f.integer("age"),
  active: f.boolean("active", { default: true }),
});

test("where with single condition using arrow function", () => {
  const query = from(UserSchema)
    .where(u => u.name.eq("John"));
  
  const sql = query.toString();
  expect(sql).toContain("WHERE name = ?");
});

test("where with multiple AND conditions", () => {
  const query = from(UserSchema)
    .where(u => and(
      u.age.gte(18),
      u.age.lt(65),
      u.active.eq(true)
    ));
  
  const sql = query.toString();
  expect(sql).toContain("WHERE (age >= ? AND age < ? AND active = ?)");
});

test("where with OR conditions", () => {
  const query = from(UserSchema)
    .where(u => or(
      u.name.eq("John"),
      u.name.eq("Jane")
    ));
  
  const sql = query.toString();
  expect(sql).toContain("WHERE (name = ? OR name = ?)");
});

test("where with LIKE operator", () => {
  const query = from(UserSchema)
    .where(u => u.name.like("%john%"));
  
  const sql = query.toString();
  expect(sql).toContain("WHERE name LIKE ?");
});

test("where with IN operator", () => {
  const query = from(UserSchema)
    .where(u => u.age.in([18, 25, 30]));
  
  const sql = query.toString();
  expect(sql).toContain("WHERE age IN (?, ?, ?)");
});

test("where with NULL check", () => {
  const query = from(UserSchema)
    .where(u => u.email.isNull());
  
  const sql = query.toString();
  expect(sql).toContain("WHERE email IS NULL");
});

test("where with NOT NULL check", () => {
  const query = from(UserSchema)
    .where(u => u.email.isNotNull());
  
  const sql = query.toString();
  expect(sql).toContain("WHERE email IS NOT NULL");
});

test("chaining multiple where clauses", () => {
  const query = from(UserSchema)
    .where(u => u.active.eq(true))
    .where(u => u.age.gte(18));
  
  const sql = query.toString();
  expect(sql).toContain("WHERE active = ? AND age >= ?");
});

test("where with complex nested conditions", () => {
  const query = from(UserSchema)
    .where(u => and(
      u.active.eq(true),
      or(
        u.age.lt(18),
        u.age.gte(65)
      )
    ));
  
  const { sql, params } = query.toSql();
  expect(sql).toContain("WHERE");
  expect(params.length).toBeGreaterThan(0);
});