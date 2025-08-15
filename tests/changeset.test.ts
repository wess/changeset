// Tests for changeset functionality

import { describe, expect, test } from "bun:test";
import {
  addError,
  applyChanges,
  cast,
  changeset,
  clearErrors,
  deleteChange,
  getChanges,
  getErrors,
  getValue,
  hasChanged,
  isValid,
  merge,
  optional,
  pipe,
  putChange,
  required,
  validate,
  validateConfirmation,
  validateCustom,
  validateEmail,
  validateExclusion,
  validateFormat,
  validateInclusion,
  validateLength,
  validateNumber,
  validateRequired,
} from "../src/changeset/index.ts";

describe("Changeset", () => {
  describe("changeset creation", () => {
    test("creates an empty changeset", () => {
      const cs = changeset<{ name: string; age: number }>();
      expect(cs.data).toEqual({});
      expect(cs.changes).toEqual({});
      expect(cs.errors).toEqual([]);
      expect(cs.valid).toBe(true);
      expect(cs.action).toBe("update");
    });

    test("creates a changeset with initial data", () => {
      const data = { name: "John", age: 30 };
      const cs = changeset(data);
      expect(cs.data).toEqual(data);
      expect(cs.changes).toEqual({});
    });

    test("creates a changeset with specific action", () => {
      const cs = changeset({}, "insert");
      expect(cs.action).toBe("insert");
    });
  });

  describe("cast", () => {
    test("casts allowed fields from params", () => {
      const cs = changeset({ name: "John", age: 30 });
      const params = { name: "Jane", age: 25, extra: "ignored" };
      const result = cast(cs, params, ["name", "age"]);

      expect(result.changes).toEqual({ name: "Jane", age: 25 });
      expect(result.data).toEqual({ name: "John", age: 30 });
    });

    test("trims string values by default", () => {
      const cs = changeset<{ name: string }>({ name: "John" });
      const params = { name: "  Jane  " };
      const result = cast(cs, params, ["name"]);

      expect(result.changes.name).toBe("Jane");
    });

    test("ignores empty strings when configured", () => {
      const cs = changeset({ name: "John" });
      const params = { name: "" };
      const result = cast(cs, params, ["name"], { empty: "ignore" });

      expect(result.changes).toEqual({});
    });
  });

  describe("change management", () => {
    test("checks if field has changed", () => {
      const cs = changeset({ name: "John" });
      const updated = putChange(cs, "name", "Jane");

      expect(hasChanged(updated, "name")).toBe(true);
      expect(hasChanged(cs, "name")).toBe(false);
    });

    test("gets current value (change or original)", () => {
      const cs = changeset({ name: "John", age: 30 });
      const updated = putChange(cs, "name", "Jane");

      expect(getValue(updated, "name")).toBe("Jane");
      expect(getValue(updated, "age")).toBe(30);
    });

    test("applies changes to data", () => {
      const cs = changeset({ name: "John", age: 30 });
      const updated = putChange(putChange(cs, "name", "Jane"), "age", 25);
      const result = applyChanges(updated);

      expect(result).toEqual({ name: "Jane", age: 25 });
    });

    test("deletes a change", () => {
      const cs = changeset({ name: "John" });
      const updated = putChange(cs, "name", "Jane");
      const deleted = deleteChange(updated, "name");

      expect(deleted.changes).toEqual({});
    });

    test("gets all changes", () => {
      const cs = changeset({ name: "John", age: 30 });
      const updated = putChange(putChange(cs, "name", "Jane"), "age", 25);

      expect(getChanges(updated)).toEqual({ name: "Jane", age: 25 });
    });
  });

  describe("error handling", () => {
    test("adds errors to changeset", () => {
      const cs = changeset({ name: "John" });
      const withError = addError(cs, "name", "Name is invalid");

      expect(withError.errors).toHaveLength(1);
      expect(withError.errors[0]).toEqual({
        field: "name",
        message: "Name is invalid",
      });
      expect(withError.valid).toBe(false);
    });

    test("clears all errors", () => {
      const cs = changeset({ name: "John" });
      const withError = addError(cs, "name", "Name is invalid");
      const cleared = clearErrors(withError);

      expect(cleared.errors).toEqual([]);
      expect(cleared.valid).toBe(true);
    });

    test("validates changeset", () => {
      const cs = changeset({ name: "John" });
      const withError = addError(cs, "name", "Name is invalid");
      const errors = getErrors(withError);

      expect(errors).toHaveLength(1);
    });

    test("checks if changeset is valid", () => {
      const cs = changeset({ name: "John" });
      expect(isValid(cs)).toBe(true);

      const withError = addError(cs, "name", "Name is invalid");
      expect(isValid(withError)).toBe(false);
    });
  });

  describe("required and optional fields", () => {
    test("marks fields as required", () => {
      const cs = changeset<{ name: string; age: number }>({
        name: "John",
        age: 30,
      });
      const updated = required(cs, ["name", "age"]);

      expect(updated.required).toEqual(["name", "age"]);
    });

    test("marks fields as optional", () => {
      const cs = changeset<{ bio?: string }>({ bio: undefined });
      const updated = optional(cs, ["bio"]);

      expect(updated.optional).toEqual(["bio"]);
    });
  });

  describe("merge changesets", () => {
    test("merges two changesets", () => {
      const cs1 = changeset({ name: "John", age: 30 });
      const cs2 = changeset({ name: "Jane", city: "NYC" } as any);

      const updated1 = putChange(cs1, "name", "Bob");
      const updated2 = putChange(cs2, "city", "LA");

      const merged = merge(updated1, updated2 as any);

      expect(merged.changes).toEqual({ name: "Bob", city: "LA" });
    });
  });

  describe("validation pipeline", () => {
    test("pipes changeset through validations", () => {
      const cs = changeset({ name: "", age: 15 });
      const updated = cast(cs, { name: "", age: 15 }, ["name", "age"]);

      const validated = pipe(
        updated,
        validateRequired(["name"]),
        validateNumber("age", { greaterThanOrEqualTo: 18 }),
      );

      expect(validated.errors).toHaveLength(2);
      expect(validated.valid).toBe(false);
    });

    test("fluent API produces same results as pipe", () => {
      const cs = changeset({ name: "", age: 15 });
      const updated = cast(cs, { name: "", age: 15 }, ["name", "age"]);

      // Pipe approach
      const pipeValidated = pipe(
        updated,
        validateRequired(["name"]),
        validateNumber("age", { greaterThanOrEqualTo: 18 }),
      );

      // Fluent approach (Elixir-like)
      const fluentValidated = validate.changeset(updated)
        .required(["name"])
        .number("age", { greaterThanOrEqualTo: 18 });

      expect(fluentValidated.errors).toEqual(pipeValidated.errors);
      expect(fluentValidated.valid).toBe(pipeValidated.valid);
      expect(fluentValidated.isValid()).toBe(false); // Should be false due to errors
    });

    test("callback style validation works", () => {
      const cs = changeset({ name: "John", age: 25 });
      const updated = cast(cs, { name: "John", age: 25 }, ["name", "age"]);

      const validated = validate.with(updated, (validator) =>
        validator
          .required(["name"])
          .number("age", { greaterThanOrEqualTo: 18 })
      );

      expect(validated.errors).toHaveLength(0);
      expect(validated.valid).toBe(true);
    });
  });
});

describe("Validations", () => {
  describe("validateRequired", () => {
    test("validates required fields", () => {
      const cs = changeset({ name: null as string | null });
      const updated = cast(cs, { name: null }, ["name"]);
      const validated = validateRequired<{ name: string | null }>(["name"])(updated);

      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("name is required");
    });

    test("validates blank strings", () => {
      const cs = changeset({ name: "" });
      const updated = cast(cs, { name: "" }, ["name"], { empty: "keep" });
      const validated = validateRequired<{ name: string }>(["name"])(updated);

      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("name can't be blank");
    });

    test("allows blank when configured", () => {
      const cs = changeset({ name: "" });
      const updated = cast(cs, { name: "" }, ["name"], { empty: "keep" });
      const validated = validateRequired<{ name: string }>(["name"], {
        allowBlank: true,
      })(updated);

      expect(validated.errors).toHaveLength(0);
    });
  });

  describe("validateFormat", () => {
    test("validates format with regex", () => {
      const cs = changeset({ phone: "123" });
      const updated = cast(cs, { phone: "123" }, ["phone"]);
      const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
      const validated = validateFormat("phone", phoneRegex)(updated);

      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("phone has invalid format");
    });

    test("passes valid format", () => {
      const cs = changeset({ phone: "123-456-7890" });
      const updated = cast(cs, { phone: "123-456-7890" }, ["phone"]);
      const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
      const validated = validateFormat("phone", phoneRegex)(updated);

      expect(validated.errors).toHaveLength(0);
    });
  });

  describe("validateLength", () => {
    test("validates minimum length", () => {
      const cs = changeset({ bio: "Hi" });
      const updated = cast(cs, { bio: "Hi" }, ["bio"]);
      const validated = validateLength("bio", { min: 10 })(updated);

      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("bio should be at least 10 character(s)");
    });

    test("validates maximum length", () => {
      const cs = changeset({ bio: "A very long bio text" });
      const updated = cast(cs, { bio: "A very long bio text" }, ["bio"]);
      const validated = validateLength("bio", { max: 10 })(updated);

      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("bio should be at most 10 character(s)");
    });

    test("validates exact length", () => {
      const cs = changeset({ code: "ABC" });
      const updated = cast(cs, { code: "ABC" }, ["code"]);
      const validated = validateLength("code", { is: 5 })(updated);

      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("code should be 5 character(s)");
    });
  });

  describe("validateNumber", () => {
    test("validates number type", () => {
      const cs = changeset({ age: "not a number" as any });
      const updated = cast(cs, { age: "not a number" }, ["age"]);
      const validated = validateNumber("age", {})(updated);

      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("age must be a number");
    });

    test("validates greater than", () => {
      const cs = changeset({ age: 17 });
      const updated = cast(cs, { age: 17 }, ["age"]);
      const validated = validateNumber("age", { greaterThan: 17 })(updated);

      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("age must be greater than 17");
    });

    test("validates less than or equal to", () => {
      const cs = changeset({ score: 101 });
      const updated = cast(cs, { score: 101 }, ["score"]);
      const validated = validateNumber("score", { lessThanOrEqualTo: 100 })(updated);

      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("score must be less than or equal to 100");
    });
  });

  describe("validateInclusion", () => {
    test("validates value is in list", () => {
      const cs = changeset({ role: "guest" });
      const updated = cast(cs, { role: "guest" }, ["role"]);
      const validated = validateInclusion("role", ["admin", "user"])(updated);

      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("role is not included in the list");
    });

    test("passes when value is in list", () => {
      const cs = changeset({ role: "admin" });
      const updated = cast(cs, { role: "admin" }, ["role"]);
      const validated = validateInclusion("role", ["admin", "user"])(updated);

      expect(validated.errors).toHaveLength(0);
    });
  });

  describe("validateExclusion", () => {
    test("validates value is not in list", () => {
      const cs = changeset({ username: "admin" });
      const updated = cast(cs, { username: "admin" }, ["username"]);
      const validated = validateExclusion("username", ["admin", "root"])(updated);

      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("username is reserved");
    });
  });

  describe("validateConfirmation", () => {
    test("validates fields match", () => {
      const cs = changeset({ password: "secret", passwordConfirm: "different" });
      const updated = cast(
        cs,
        { password: "secret", passwordConfirm: "different" },
        ["password", "passwordConfirm"],
      );
      const validated = validateConfirmation("password", "passwordConfirm")(updated);

      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("password does not match passwordConfirm");
    });

    test("passes when fields match", () => {
      const cs = changeset({ password: "secret", passwordConfirm: "secret" });
      const updated = cast(
        cs,
        { password: "secret", passwordConfirm: "secret" },
        ["password", "passwordConfirm"],
      );
      const validated = validateConfirmation("password", "passwordConfirm")(updated);

      expect(validated.errors).toHaveLength(0);
    });
  });

  describe("validateEmail", () => {
    test("validates email format", () => {
      const cs = changeset({ email: "invalid" });
      const updated = cast(cs, { email: "invalid" }, ["email"]);
      const validated = validateEmail("email")(updated);

      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("email must be a valid email");
    });

    test("passes valid email", () => {
      const cs = changeset({ email: "user@example.com" });
      const updated = cast(cs, { email: "user@example.com" }, ["email"]);
      const validated = validateEmail("email")(updated);

      expect(validated.errors).toHaveLength(0);
    });
  });

  describe("validateCustom", () => {
    test("validates with custom function", () => {
      const cs = changeset({ age: 15 });
      const updated = cast(cs, { age: 15 }, ["age"]);
      const validated = validateCustom("age", (value) => Number(value) >= 18)(updated);

      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("age is invalid");
    });

    test("uses custom error message", () => {
      const cs = changeset({ age: 15 });
      const updated = cast(cs, { age: 15 }, ["age"]);
      const validated = validateCustom(
        "age",
        (value) => (Number(value) >= 18 ? true : "Must be 18 or older"),
      )(updated);

      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("Must be 18 or older");
    });
  });
});