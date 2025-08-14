// Query DSL tests

import { test, expect } from "bun:test";
import { schema, field, idField } from "../src/schema/index.ts";
import { from } from "../src/query/index.ts";
import { createFieldOperators } from "../src/query/operators.ts";

// Test schema
const UserSchema = schema("users", {
  id: idField(),
  name: field("name", "string", { null: false }),
  email: field("email", "string"),
  age: field("age", "integer"),
});

test("from() creates initial query", () => {
  const query = from(UserSchema).build();
  
  expect(query.schema.tableName).toBe("users");
  expect(query.whereConditions).toEqual([]);
  expect(query.joins).toEqual([]);
  expect(query.orderByFields).toEqual([]);
});

test("from() accepts alias", () => {
  const query = from(UserSchema, "u").build();
  
  expect(query.alias).toBe("u");
});

test("where() adds condition to query", () => {
  const query = from(UserSchema)
    .where(() => true) // simplified for testing
    .build();
  
  expect(query.whereConditions).toHaveLength(1);
});

test("limit() sets limit value", () => {
  const query = from(UserSchema)
    .limit(10)
    .build();
  
  expect(query.limitValue).toBe(10);
});

test("offset() sets offset value", () => {
  const query = from(UserSchema)
    .offset(20)
    .build();
  
  expect(query.offsetValue).toBe(20);
});

test("query methods are chainable", () => {
  const query = from(UserSchema)
    .where(() => true)
    .limit(10)
    .offset(20)
    .build();
  
  expect(query.whereConditions).toHaveLength(1);
  expect(query.limitValue).toBe(10);
  expect(query.offsetValue).toBe(20);
});

test("createFieldOperators() creates comparison operators", () => {
  const nameOps = createFieldOperators<string>("name");
  
  const eqCondition = nameOps.eq("John");
  expect(eqCondition.field).toBe("name");
  expect(eqCondition.operator).toBe("eq");
  expect(eqCondition.value).toBe("John");
  
  const gtCondition = nameOps.gt("A");
  expect(gtCondition.operator).toBe("gt");
  expect(gtCondition.value).toBe("A");
});

test("createFieldOperators() creates null checks", () => {
  const emailOps = createFieldOperators<string>("email");
  
  const nullCondition = emailOps.isNull();
  expect(nullCondition.field).toBe("email");
  expect(nullCondition.operator).toBe("is_null");
  expect(nullCondition.value).toBeUndefined();
  
  const notNullCondition = emailOps.isNotNull();
  expect(notNullCondition.operator).toBe("is_not_null");
});

test("createFieldOperators() creates IN conditions", () => {
  const ageOps = createFieldOperators<number>("age");
  
  const inCondition = ageOps.in([18, 25, 30]);
  expect(inCondition.field).toBe("age");
  expect(inCondition.operator).toBe("in");
  expect(inCondition.value).toEqual([18, 25, 30]);
  
  const notInCondition = ageOps.notIn([0, 1]);
  expect(notInCondition.operator).toBe("not_in");
  expect(notInCondition.value).toEqual([0, 1]);
});