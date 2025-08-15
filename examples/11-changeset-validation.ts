// Example: Using changesets for data validation and transformation

import {
  cast,
  changeset,
  f,
  pipe,
  schema,
  validate,
  validateConfirmation,
  validateEmail,
  validateLength,
  validateNumber,
  validateRequired,
  type Changeset,
} from "../src/index.ts";

// Define User interface for type safety
interface User {
  id: string;
  username: string;
  email: string;
  age: number;
  bio?: string;
}

// Create schema with generic type parameter that maps to the User interface
const UserSchema = schema<User>("users", {
  id: f.id(),
  username: f.string("username", { null: false, unique: true }),
  email: f.string("email", { null: false, unique: true }),
  age: f.integer("age", { null: false }),
  bio: f.string("bio"),
});

// Example 1: Basic changeset with validation
console.log("=== Example 1: Basic Validation ===");

const userParams = {
  username: "john_doe",
  email: "john@example.com",
  age: 25,
  bio: "Software developer",
};

// Create changeset and cast parameters
const userChangeset = changeset<User>();
const casted = cast(userChangeset, userParams, ["username", "email", "age", "bio"]);

// Apply validations using traditional pipe approach
const validated = pipe(
  casted,
  validateRequired(["username", "email", "age"]),
  validateEmail("email"),
  validateLength("username", { min: 3, max: 20 }),
  validateNumber("age", { greaterThanOrEqualTo: 18 }),
);

console.log("Valid (pipe):", validated.valid);
console.log("Changes (pipe):", validated.changes);
console.log("Errors (pipe):", validated.errors);

// Alternative: Apply validations using fluent API (Elixir-like)
const fluentValidated = validate.changeset(casted)
  .required(["username", "email", "age"])
  .email("email")
  .length("username", { min: 3, max: 20 })
  .number("age", { greaterThanOrEqualTo: 18 });

console.log("Valid (fluent):", fluentValidated.valid);
console.log("IsValid (fluent):", fluentValidated.isValid());
console.log("Changes (fluent):", fluentValidated.changes);
console.log("Errors (fluent):", fluentValidated.errors);

// Example 2: Registration form with password confirmation
console.log("\n=== Example 2: Registration Form ===");

interface RegistrationForm {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  age: number;
  termsAccepted: boolean;
}

const registrationParams = {
  username: "alice",
  email: "alice@example.com",
  password: "secretpass123",
  passwordConfirm: "secretpass123",
  age: 21,
  termsAccepted: true,
};

const registrationChangeset = changeset<RegistrationForm>();
const registrationCasted = cast(
  registrationChangeset,
  registrationParams,
  ["username", "email", "password", "passwordConfirm", "age", "termsAccepted"],
);

const registrationValidated = pipe(
  registrationCasted,
  validateRequired(["username", "email", "password", "passwordConfirm", "termsAccepted"]),
  validateEmail("email"),
  validateLength("username", { min: 3, max: 20 }),
  validateLength("password", { min: 8 }),
  validateConfirmation("password", "passwordConfirm"),
  validateNumber("age", { greaterThanOrEqualTo: 13 }),
);

console.log("Registration Valid (pipe):", registrationValidated.valid);
console.log("Registration Changes (pipe):", registrationValidated.changes);

// Alternative: Using fluent API for registration (Elixir-like)
const registrationFluentValidated = validate.changeset(registrationCasted)
  .required(["username", "email", "password", "passwordConfirm", "termsAccepted"])
  .email("email")
  .length("username", { min: 3, max: 20 })
  .length("password", { min: 8 })
  .confirmation("password", "passwordConfirm")
  .number("age", { greaterThanOrEqualTo: 13 });

console.log("Registration Valid (fluent):", registrationFluentValidated.valid);
console.log("Registration IsValid (fluent):", registrationFluentValidated.isValid());
console.log("Registration Changes (fluent):", registrationFluentValidated.changes);

// Example 3: Failed validation
console.log("\n=== Example 3: Failed Validation ===");

const invalidParams = {
  username: "ab", // Too short
  email: "not-an-email", // Invalid format
  age: 12, // Too young
  password: "short", // Too short
  passwordConfirm: "different", // Doesn't match
};

const invalidChangeset = changeset<RegistrationForm>();
const invalidCasted = cast(
  invalidChangeset,
  invalidParams,
  ["username", "email", "password", "passwordConfirm", "age"],
);

const invalidValidated = pipe(
  invalidCasted,
  validateRequired(["username", "email", "password"]),
  validateEmail("email"),
  validateLength("username", { min: 3 }),
  validateLength("password", { min: 8 }),
  validateConfirmation("password", "passwordConfirm"),
  validateNumber("age", { greaterThanOrEqualTo: 18 }),
);

console.log("Invalid Form Valid:", invalidValidated.valid);
console.log("Validation Errors:");
for (const error of invalidValidated.errors) {
  console.log(`  - ${error.field}: ${error.message}`);
}

// Example 4: Using changeset with repository operations
console.log("\n=== Example 4: Changeset with Repository ===");

import { applyChanges, isValid } from "../src/changeset/changeset.ts";

// Function to save user with validation
const saveUser = async (params: Record<string, unknown>): Promise<void> => {
  const cs = changeset<User>();
  const casted = cast(cs, params, ["username", "email", "age", "bio"]);
  
  const validated = pipe(
    casted,
    validateRequired(["username", "email", "age"]),
    validateEmail("email"),
    validateLength("username", { min: 3, max: 20 }),
    validateNumber("age", { greaterThanOrEqualTo: 18 }),
  );

  if (isValid(validated)) {
    const userData = applyChanges(validated);
    console.log("Would save user:", userData);
    // In real app: await repo.insert("users", userData);
  } else {
    console.log("Validation failed:");
    for (const error of validated.errors) {
      console.log(`  - ${error.field}: ${error.message}`);
    }
  }
};

await saveUser({
  username: "bob_smith",
  email: "bob@example.com",
  age: 30,
  bio: "Engineer and hobbyist",
});

// Example 5: Update operations with partial data
console.log("\n=== Example 5: Update with Changeset ===");

const existingUser: User = {
  id: "user-123",
  username: "existing_user",
  email: "existing@example.com",
  age: 25,
  bio: "Original bio",
};

const updateParams = {
  bio: "Updated bio text",
  age: 26,
};

const updateChangeset = changeset(existingUser, "update");
const updateCasted = cast(updateChangeset, updateParams, ["bio", "age"]);

const updateValidated = pipe(
  updateCasted,
  validateNumber("age", { greaterThanOrEqualTo: 0, lessThanOrEqualTo: 150 }),
  validateLength("bio", { max: 500 }),
);

if (isValid(updateValidated)) {
  const updatedUser = applyChanges(updateValidated);
  console.log("Updated user:", updatedUser);
}

console.log("\n✅ Changeset examples completed!");