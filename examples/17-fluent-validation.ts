// Example: Fluent API for changeset validation with method chaining

import {
  cast,
  changeset,
  f,
  pipe,
  schema,
  validate,
  validateRequired,
  validateEmail,
  validateLength,
  validateNumber,
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

interface RegistrationForm {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  age: number;
  termsAccepted: boolean;
}

console.log("=== Fluent Validation API Examples ===\n");

// Example 1: Comparing pipe() vs fluent API
console.log("1. Pipe vs Fluent API Comparison:");
console.log("================================");

const userParams = {
  username: "john_doe",
  email: "john@example.com",
  age: 25,
  bio: "Software developer",
};

const userChangeset = changeset<User>();
const casted = cast(userChangeset, userParams, ["username", "email", "age", "bio"]);

// Traditional pipe approach
console.log("\n📦 Traditional pipe() approach:");
const pipeValidated = pipe(
  casted,
  validateRequired(["username", "email", "age"]),
  validateEmail("email"),
  validateLength("username", { min: 3, max: 20 }),
  validateNumber("age", { greaterThanOrEqualTo: 18 }),
);

console.log("Valid:", pipeValidated.valid);
console.log("Changes:", pipeValidated.changes);

// New fluent API approach (Elixir-like)
console.log("\n🔗 New fluent API approach (Elixir-like):");
const fluentValidated = validate.changeset(casted)
  .required(["username", "email", "age"])
  .email("email")
  .length("username", { min: 3, max: 20 })
  .number("age", { greaterThanOrEqualTo: 18 });

console.log("Valid:", fluentValidated.valid);
console.log("Changes:", fluentValidated.changes);
console.log("IsValid():", fluentValidated.isValid());

// Example 2: Registration form with fluent validation
console.log("\n\n2. Registration Form with Fluent API:");
console.log("===================================");

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

const registrationValidated = validate.changeset(registrationCasted)
  .required(["username", "email", "password", "passwordConfirm", "termsAccepted"])
  .email("email")
  .length("username", { min: 3, max: 20 })
  .length("password", { min: 8 })
  .confirmation("password", "passwordConfirm")
  .number("age", { greaterThanOrEqualTo: 13 });

console.log("Registration Valid:", registrationValidated.valid);
console.log("Registration IsValid():", registrationValidated.isValid());
console.log("Registration Changes:", {
  username: registrationValidated.changes.username,
  email: registrationValidated.changes.email,
  age: registrationValidated.changes.age,
});

// Example 3: Using validate.with callback style
console.log("\n\n3. Callback Style Validation:");
console.log("============================");

const callbackValidated = validate.with(casted, (validator) =>
  validator
    .required(["username", "email"])
    .email("email")
    .length("username", { min: 2 })
    .custom("age", (value) => {
      const age = Number(value);
      if (age < 18) return "Must be 18 or older";
      if (age > 120) return "Age seems unrealistic";
      return true;
    }),
);

console.log("Callback Valid:", callbackValidated.valid);
console.log("Callback Changes:", callbackValidated.changes);

// Example 4: Error handling with fluent API
console.log("\n\n4. Error Handling:");
console.log("==================");

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

const invalidResult = validate.changeset(invalidCasted)
  .required(["username", "email", "password"])
  .email("email")
  .length("username", { min: 3 })
  .length("password", { min: 8 })
  .confirmation("password", "passwordConfirm")
  .number("age", { greaterThanOrEqualTo: 18 });

console.log("Invalid Form Valid:", invalidResult.valid);
console.log("Invalid Form IsValid():", invalidResult.isValid());
console.log("Validation Errors:");
for (const error of invalidResult.errors) {
  console.log(`  - ${error.field}: ${error.message}`);
}

// Example 5: Complex validation chains
console.log("\n\n5. Complex Validation Chains:");
console.log("=============================");

interface ProductForm {
  name: string;
  price: number;
  category: string;
  tags: string[];
  description?: string;
}

const productParams = {
  name: "Gaming Mouse",
  price: 59.99,
  category: "electronics",
  tags: ["gaming", "mouse", "peripheral"],
  description: "High-performance gaming mouse with RGB lighting",
};

const productChangeset = changeset<ProductForm>();
const productCasted = cast(productChangeset, {
  ...productParams,
  tags: JSON.stringify(productParams.tags), // Simulate JSON storage
}, ["name", "price", "category", "tags", "description"]);

const productValidated = validate.changeset(productCasted)
  .required(["name", "price", "category"])
  .length("name", { min: 2, max: 100 })
  .number("price", { greaterThan: 0, lessThanOrEqualTo: 10000 })
  .inclusion("category", ["electronics", "clothing", "books", "home"])
  .length("description", { max: 500 })
  .custom("tags", (value) => {
    if (!value) return true;
    try {
      const parsed = JSON.parse(String(value));
      if (!Array.isArray(parsed)) return "Tags must be an array";
      if (parsed.length === 0) return "At least one tag is required";
      if (parsed.length > 10) return "Maximum 10 tags allowed";
      return true;
    } catch {
      return "Invalid tags format";
    }
  })
  .toChangeset();

console.log("Product Valid:", productValidated.valid);
console.log("Product Changes:", {
  name: productValidated.changes.name,
  price: productValidated.changes.price,
  category: productValidated.changes.category,
});

// Example 6: Performance comparison
console.log("\n\n6. Benefits of Fluent API:");
console.log("=========================");

const benefits = [
  "✅ More readable and intuitive syntax",
  "✅ Method chaining feels natural in JavaScript/TypeScript",
  "✅ No need to import individual validation functions",
  "✅ Better IDE autocompletion and method discovery",
  "✅ Consistent API surface with other fluent libraries",
  "✅ Easier to read validation chains in complex forms",
  "✅ Maintains all the type safety of the original approach",
  "✅ Can still fall back to pipe() for functional composition",
];

for (const benefit of benefits) {
  console.log(`   ${benefit}`);
}

console.log("\n\n7. API Comparison:");
console.log("=================");

console.log("\n📦 Traditional pipe() approach:");
console.log(`const validated = pipe(
  changeset,
  validateRequired(["username", "email"]),
  validateEmail("email"),
  validateLength("username", { min: 3, max: 20 }),
);`);

console.log("\n🔗 New fluent API approach (Elixir-like):");
console.log(`const validated = validate.changeset(changeset)
  .required(["username", "email"])
  .email("email")
  .length("username", { min: 3, max: 20 });
  
// Access validation results directly
console.log(validated.valid);     // boolean
console.log(validated.errors);    // array
console.log(validated.changes);   // object
console.log(validated.isValid()); // method`);

console.log("\n🔄 Callback style approach:");
console.log(`const validated = validate.with(changeset, validator =>
  validator
    .required(["username", "email"])
    .email("email")
    .length("username", { min: 3, max: 20 })
);`);

console.log("\n✅ All three approaches produce identical results!");
console.log("Use whichever style fits your team's preferences.\n");

export { registrationValidated, productValidated };