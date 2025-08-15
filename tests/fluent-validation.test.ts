// Tests for fluent validation API

import { describe, expect, test } from "bun:test";
import {
  cast,
  changeset,
  pipe,
  validate,
  validateRequired,
  validateEmail,
  validateLength,
  validateNumber,
  validateFormat,
  validateInclusion,
  validateExclusion,
  validateConfirmation,
  validateCustom,
  type Changeset,
} from "../src/changeset/index.ts";

interface User {
  id: string;
  username: string;
  email: string;
  age: number;
  bio?: string;
}

interface RegistrationForm {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  age: number;
  termsAccepted: boolean;
}

describe("Fluent Validation API", () => {
  describe("validate.changeset", () => {
    test("creates a fluent validator from changeset", () => {
      const cs = changeset<User>();
      const casted = cast(cs, { username: "john", email: "john@example.com" }, ["username", "email"]);
      
      const validator = validate.changeset(casted);
      expect(validator).toBeDefined();
      expect(typeof validator.required).toBe("function");
      expect(typeof validator.email).toBe("function");
      expect(typeof validator.toChangeset).toBe("function");
      
      // Test Elixir-like properties and methods
      expect(typeof validator.valid).toBe("boolean");
      expect(typeof validator.isValid).toBe("function");
      expect(Array.isArray(validator.errors)).toBe(true);
      expect(typeof validator.changes).toBe("object");
    });

    test("chains validation methods with Elixir-like access", () => {
      const cs = changeset<User>();
      const casted = cast(cs, { 
        username: "john", 
        email: "john@example.com",
        age: 25 
      }, ["username", "email", "age"]);
      
      const validated = validate.changeset(casted)
        .required(["username", "email"])
        .email("email")
        .length("username", { min: 3, max: 20 })
        .number("age", { greaterThanOrEqualTo: 18 });
      
      expect(validated.valid).toBe(true);
      expect(validated.isValid()).toBe(true);
      expect(validated.errors).toHaveLength(0);
      expect(validated.changes).toEqual({
        username: "john",
        email: "john@example.com", 
        age: 25
      });
    });

    test("accumulates validation errors", () => {
      const cs = changeset<User>();
      const casted = cast(cs, { 
        username: "jo", // Too short
        email: "invalid-email", // Invalid format
        age: 15 // Too young
      }, ["username", "email", "age"]);
      
      const validated = validate.changeset(casted)
        .required(["username", "email", "age"])
        .email("email")
        .length("username", { min: 3, max: 20 })
        .number("age", { greaterThanOrEqualTo: 18 })
        .toChangeset();
      
      expect(validated.valid).toBe(false);
      expect(validated.errors).toHaveLength(3);
      
      const errorMessages = validated.errors.map(e => e.message);
      expect(errorMessages).toContain("email must be a valid email");
      expect(errorMessages).toContain("username should be at least 3 character(s)");
      expect(errorMessages).toContain("age must be greater than or equal to 18");
    });

    test("produces same result as pipe approach", () => {
      const userParams = { username: "john", email: "john@example.com", age: 25 };
      const cs = changeset<User>();
      const casted = cast(cs, userParams, ["username", "email", "age"]);
      
      // Pipe approach
      const pipeValidated = pipe(
        casted,
        validateRequired(["username", "email"]),
        validateEmail("email"),
        validateLength("username", { min: 3, max: 20 }),
        validateNumber("age", { greaterThanOrEqualTo: 18 }),
      );
      
      // Fluent approach
      const fluentValidated = validate.changeset(casted)
        .required(["username", "email"])
        .email("email")
        .length("username", { min: 3, max: 20 })
        .number("age", { greaterThanOrEqualTo: 18 })
        .toChangeset();
      
      expect(fluentValidated.valid).toBe(pipeValidated.valid);
      expect(fluentValidated.errors).toEqual(pipeValidated.errors);
      expect(fluentValidated.changes).toEqual(pipeValidated.changes);
    });
  });

  describe("individual validation methods", () => {
    test("required() validates required fields", () => {
      const cs = changeset<User>();
      const casted = cast(cs, { username: "", email: null }, ["username", "email"]);
      
      const validated = validate.changeset(casted)
        .required(["username", "email"])
        .toChangeset();
      
      expect(validated.valid).toBe(false);
      expect(validated.errors).toHaveLength(2);
      expect(validated.errors[0].message).toBe("username can't be blank");
      expect(validated.errors[1].message).toBe("email is required");
    });

    test("email() validates email format", () => {
      const cs = changeset<User>();
      const casted = cast(cs, { email: "invalid-email" }, ["email"]);
      
      const validated = validate.changeset(casted)
        .email("email")
        .toChangeset();
      
      expect(validated.valid).toBe(false);
      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("email must be a valid email");
    });

    test("length() validates string length", () => {
      const cs = changeset<User>();
      const casted = cast(cs, { username: "ab", bio: "a".repeat(501) }, ["username", "bio"]);
      
      const validated = validate.changeset(casted)
        .length("username", { min: 3 })
        .length("bio", { max: 500 })
        .toChangeset();
      
      expect(validated.valid).toBe(false);
      expect(validated.errors).toHaveLength(2);
      expect(validated.errors[0].message).toBe("username should be at least 3 character(s)");
      expect(validated.errors[1].message).toBe("bio should be at most 500 character(s)");
    });

    test("number() validates number constraints", () => {
      const cs = changeset<User>();
      const casted = cast(cs, { age: 15 }, ["age"]);
      
      const validated = validate.changeset(casted)
        .number("age", { greaterThanOrEqualTo: 18 })
        .toChangeset();
      
      expect(validated.valid).toBe(false);
      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("age must be greater than or equal to 18");
    });

    test("format() validates regex pattern", () => {
      const cs = changeset<{ phone: string }>();
      const casted = cast(cs, { phone: "123-456" }, ["phone"]);
      
      const validated = validate.changeset(casted)
        .format("phone", /^\d{3}-\d{3}-\d{4}$/)
        .toChangeset();
      
      expect(validated.valid).toBe(false);
      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("phone has invalid format");
    });

    test("inclusion() validates allowed values", () => {
      const cs = changeset<{ role: string }>();
      const casted = cast(cs, { role: "guest" }, ["role"]);
      
      const validated = validate.changeset(casted)
        .inclusion("role", ["admin", "user"])
        .toChangeset();
      
      expect(validated.valid).toBe(false);
      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("role is not included in the list");
    });

    test("exclusion() validates forbidden values", () => {
      const cs = changeset<{ username: string }>();
      const casted = cast(cs, { username: "admin" }, ["username"]);
      
      const validated = validate.changeset(casted)
        .exclusion("username", ["admin", "root"])
        .toChangeset();
      
      expect(validated.valid).toBe(false);
      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("username is reserved");
    });

    test("confirmation() validates field matching", () => {
      const cs = changeset<RegistrationForm>();
      const casted = cast(cs, { 
        password: "secret123", 
        passwordConfirm: "different123" 
      }, ["password", "passwordConfirm"]);
      
      const validated = validate.changeset(casted)
        .confirmation("password", "passwordConfirm")
        .toChangeset();
      
      expect(validated.valid).toBe(false);
      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("password does not match passwordConfirm");
    });

    test("custom() validates with custom function", () => {
      const cs = changeset<User>();
      const casted = cast(cs, { age: 15 }, ["age"]);
      
      const validated = validate.changeset(casted)
        .custom("age", (value) => {
          const age = Number(value);
          if (age < 13) return "Too young for platform";
          if (age < 18) return "Parental consent required";
          return true;
        })
        .toChangeset();
      
      expect(validated.valid).toBe(false);
      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0].message).toBe("Parental consent required");
    });
  });

  describe("result() method", () => {
    test("returns validation result object", () => {
      const cs = changeset<User>();
      const casted = cast(cs, { username: "john", email: "invalid" }, ["username", "email"]);
      
      const result = validate.changeset(casted)
        .required(["username", "email"])
        .email("email")
        .result();
      
      expect(result).toHaveProperty("changeset");
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("errors");
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe("email must be a valid email");
    });
  });

  describe("complex validation scenarios", () => {
    test("registration form validation", () => {
      const registrationParams = {
        username: "alice",
        email: "alice@example.com",
        password: "secretpass123",
        passwordConfirm: "secretpass123",
        age: 21,
        termsAccepted: true,
      };
      
      const cs = changeset<RegistrationForm>();
      const casted = cast(cs, registrationParams, [
        "username", "email", "password", "passwordConfirm", "age", "termsAccepted"
      ]);
      
      const validated = validate.changeset(casted)
        .required(["username", "email", "password", "passwordConfirm", "termsAccepted"])
        .email("email")
        .length("username", { min: 3, max: 20 })
        .length("password", { min: 8 })
        .confirmation("password", "passwordConfirm")
        .number("age", { greaterThanOrEqualTo: 13 })
        .toChangeset();
      
      expect(validated.valid).toBe(true);
      expect(validated.errors).toHaveLength(0);
      expect(validated.changes).toEqual(registrationParams);
    });

    test("failed registration validation", () => {
      const invalidParams = {
        username: "ab", // Too short
        email: "not-an-email", // Invalid format
        age: 12, // Too young
        password: "short", // Too short
        passwordConfirm: "different", // Doesn't match
      };
      
      const cs = changeset<RegistrationForm>();
      const casted = cast(cs, invalidParams, [
        "username", "email", "password", "passwordConfirm", "age"
      ]);
      
      const validated = validate.changeset(casted)
        .required(["username", "email", "password"])
        .email("email")
        .length("username", { min: 3 })
        .length("password", { min: 8 })
        .confirmation("password", "passwordConfirm")
        .number("age", { greaterThanOrEqualTo: 18 })
        .toChangeset();
      
      expect(validated.valid).toBe(false);
      expect(validated.errors.length).toBeGreaterThan(0);
      
      const errorFields = validated.errors.map(e => e.field);
      expect(errorFields).toContain("email");
      expect(errorFields).toContain("username");
      expect(errorFields).toContain("password");
      expect(errorFields).toContain("age");
    });
  });
});

describe("validateWith callback API", () => {
  test("validates using callback style", () => {
    const cs = changeset<User>();
    const casted = cast(cs, { 
      username: "john", 
      email: "john@example.com",
      age: 25 
    }, ["username", "email", "age"]);
    
    const validated = validate.with(casted, (validator) =>
      validator
        .required(["username", "email"])
        .email("email")
        .length("username", { min: 3, max: 20 })
        .number("age", { greaterThanOrEqualTo: 18 })
    );
    
    expect(validated.valid).toBe(true);
    expect(validated.errors).toHaveLength(0);
  });

  test("handles validation errors in callback", () => {
    const cs = changeset<User>();
    const casted = cast(cs, { 
      username: "jo", // Too short
      email: "invalid", // Invalid email
      age: 15 // Too young
    }, ["username", "email", "age"]);
    
    const validated = validate.with(casted, (validator) =>
      validator
        .required(["username", "email", "age"])
        .email("email")
        .length("username", { min: 3 })
        .number("age", { greaterThanOrEqualTo: 18 })
    );
    
    expect(validated.valid).toBe(false);
    expect(validated.errors).toHaveLength(3);
  });

  test("produces same result as direct fluent approach", () => {
    const userParams = { username: "john", email: "john@example.com", age: 25 };
    const cs = changeset<User>();
    const casted = cast(cs, userParams, ["username", "email", "age"]);
    
    // Direct fluent approach
    const directValidated = validate.changeset(casted)
      .required(["username", "email"])
      .email("email")
      .length("username", { min: 3, max: 20 })
      .number("age", { greaterThanOrEqualTo: 18 })
      .toChangeset();
    
    // Callback approach
    const callbackValidated = validate.with(casted, (validator) =>
      validator
        .required(["username", "email"])
        .email("email")
        .length("username", { min: 3, max: 20 })
        .number("age", { greaterThanOrEqualTo: 18 })
    );
    
    expect(callbackValidated.valid).toBe(directValidated.valid);
    expect(callbackValidated.errors).toEqual(directValidated.errors);
    expect(callbackValidated.changes).toEqual(directValidated.changes);
  });
});

describe("API consistency tests", () => {
  test("all three approaches produce identical results", () => {
    const userParams = { 
      username: "john_doe", 
      email: "john@example.com", 
      age: 25,
      bio: "Software developer" 
    };
    const cs = changeset<User>();
    const casted = cast(cs, userParams, ["username", "email", "age", "bio"]);
    
    // Traditional pipe approach
    const pipeValidated = pipe(
      casted,
      validateRequired(["username", "email", "age"]),
      validateEmail("email"),
      validateLength("username", { min: 3, max: 20 }),
      validateNumber("age", { greaterThanOrEqualTo: 18 }),
    );
    
    // Direct fluent approach
    const fluentValidated = validate.changeset(casted)
      .required(["username", "email", "age"])
      .email("email")
      .length("username", { min: 3, max: 20 })
      .number("age", { greaterThanOrEqualTo: 18 })
      .toChangeset();
    
    // Callback fluent approach
    const callbackValidated = validate.with(casted, validator =>
      validator
        .required(["username", "email", "age"])
        .email("email")
        .length("username", { min: 3, max: 20 })
        .number("age", { greaterThanOrEqualTo: 18 })
    );
    
    // All should produce identical results
    expect(fluentValidated.valid).toBe(pipeValidated.valid);
    expect(fluentValidated.errors).toEqual(pipeValidated.errors);
    expect(fluentValidated.changes).toEqual(pipeValidated.changes);
    
    expect(callbackValidated.valid).toBe(pipeValidated.valid);
    expect(callbackValidated.errors).toEqual(pipeValidated.errors);
    expect(callbackValidated.changes).toEqual(pipeValidated.changes);
  });
});