// Result type tests

import { test, expect } from "bun:test";
import { ok, err, isOk, isErr, createDatabaseError, createValidationError, createNotFoundError } from "../src/types/result.ts";

test("ok() creates success result", () => {
  const result = ok("test data");
  
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBe("test data");
  }
});

test("err() creates error result", () => {
  const error = new Error("test error");
  const result = err(error);
  
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBe(error);
  }
});

test("isOk() type guard works", () => {
  const successResult = ok("data");
  const errorResult = err(new Error("error"));
  
  expect(isOk(successResult)).toBe(true);
  expect(isOk(errorResult)).toBe(false);
  
  if (isOk(successResult)) {
    expect(successResult.data).toBe("data");
  }
});

test("isErr() type guard works", () => {
  const successResult = ok("data");
  const errorResult = err(new Error("error"));
  
  expect(isErr(successResult)).toBe(false);
  expect(isErr(errorResult)).toBe(true);
  
  if (isErr(errorResult)) {
    expect(errorResult.error.message).toBe("error");
  }
});

test("DatabaseError includes code and detail", () => {
  const error = createDatabaseError("Connection failed", "ECONNREFUSED", "Connection refused");
  
  expect(error.name).toBe("DatabaseError");
  expect(error.message).toBe("Connection failed");
  expect(error.code).toBe("ECONNREFUSED");
  expect(error.detail).toBe("Connection refused");
});

test("ValidationError includes field", () => {
  const error = createValidationError("Email is required", "email");
  
  expect(error.name).toBe("ValidationError");
  expect(error.message).toBe("Email is required");
  expect(error.field).toBe("email");
});

test("NotFoundError includes resource", () => {
  const error = createNotFoundError("User");
  
  expect(error.name).toBe("NotFoundError");
  expect(error.message).toBe("User not found");
  expect(error.resource).toBe("User");
});

test("NotFoundError accepts custom message", () => {
  const error = createNotFoundError("User", "User with ID 123 not found");
  
  expect(error.message).toBe("User with ID 123 not found");
  expect(error.resource).toBe("User");
});