// Example: validation API

import {
  cast,
  changeset,
  f,
  schema,
  validate,
  type Changeset,
} from "../src/index.ts";

// Define clean TypeScript interfaces
interface User {
  id: string;
  username: string;
  email: string;
  age: number;
  bio?: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  published: boolean;
}

console.log("=== Validation API ===\n");

// Example 1: Basic validation
console.log("1. Basic Validation:");
console.log("===============================");

const userParams = {
  username: "john_doe",
  email: "john@example.com",
  age: 25,
  bio: "Software engineer",
};

const cs = changeset<User>();
const casted = cast(cs, userParams, ["username", "email", "age", "bio"]);

// validation with direct property access
const validated = validate.changeset(casted)
  .required(["username", "email", "age"])
  .email("email")
  .length("username", { min: 3, max: 20 })
  .number("age", { greaterThanOrEqualTo: 18 });

// Access properties directly
console.log("✅ Changeset valid:", validated.valid);
console.log("✅ Is valid (method):", validated.isValid());
console.log("✅ Errors count:", validated.errors.length);
console.log("✅ Changes:", validated.changes);

// Example 2: Validation with errors  error handling)
console.log("\n2. Validation with Errors ):");
console.log("========================================");

const invalidParams = {
  username: "jo", // Too short
  email: "not-valid-email", // Invalid format
  age: 15, // Too young
};

const invalidCasted = cast(changeset<User>(), invalidParams, ["username", "email", "age"]);

const invalidValidated = validate.changeset(invalidCasted)
  .required(["username", "email", "age"])
  .email("email")
  .length("username", { min: 3, max: 20 })
  .number("age", { greaterThanOrEqualTo: 18 });

console.log("❌ Changeset valid:", invalidValidated.valid);
console.log("❌ Is valid (method):", invalidValidated.isValid());
console.log("❌ Error count:", invalidValidated.errors.length);
console.log("❌ Errors:");
invalidValidated.errors.forEach(error => {
  console.log(`   - ${error.field}: ${error.message}`);
});

// Example 3: Working with data  data access)
console.log("\n3. Working with Data ):");
console.log("==================================");

const existingUser: User = {
  id: "user-123",
  username: "existing_user",
  email: "existing@example.com",
  age: 30,
  bio: "Original bio",
};

const updateParams = {
  bio: "Updated bio with new information",
  age: 31,
};

const updateChangeset = changeset(existingUser, "update");
const updateCasted = cast(updateChangeset, updateParams, ["bio", "age"]);
const updateValidated = validate.changeset(updateCasted)
  .length("bio", { max: 500 })
  .number("age", { greaterThanOrEqualTo: 0, lessThanOrEqualTo: 150 });

console.log("✅ Update valid:", updateValidated.valid);
console.log("✅ Original data:", updateValidated.data);
console.log("✅ Changes only:", updateValidated.changes);
console.log("✅ Changed fields:", Object.keys(updateValidated.changes));

// Example 4: Complex validation chains  chaining)
console.log("\n4. Complex Validation Chains:");
console.log("=============================");

const postParams = {
  title: "Understanding Changesets",
  content: "Changesets in are a powerful way to handle data validation...",
  authorId: "user-123",
  published: true,
};

const postValidated = validate.changeset(
  cast(changeset<Post>(), postParams, ["title", "content", "authorId", "published"])
)
  .required(["title", "content", "authorId"])
  .length("title", { min: 5, max: 200 })
  .length("content", { min: 10 })
  .custom("authorId", (value) => {
    if (!String(value).startsWith("user-")) {
      return "Author ID must start with 'user-'";
    }
    return true;
  })
  .custom("published", (value, changeset) => {
    if (value === true && !changeset.changes.title) {
      return "Published posts must have a title";
    }
    return true;
  });

console.log("✅ Post valid:", postValidated.valid);
console.log("✅ Post data available:", !!postValidated.changes.title);
console.log("✅ Post changes:", Object.keys(postValidated.changes));

// Example 5: property access patterns
console.log("\n5. Property Access Patterns:");
console.log("=======================================");

const validationResult = validate.changeset(casted)
  .required(["username", "email"])
  .email("email")
  .length("username", { min: 3 });

// Direct property access (like changeset.valid? in)
if (validationResult.valid) {
  console.log("✅ Validation passed!");
  console.log("📝 User data:", validationResult.changes.username);
  console.log("📧 Email:", validationResult.changes.email);
} else {
  console.log("❌ Validation failed!");
  console.log("🚫 Errors:", validationResult.errors.length);
}

// Method access (like Changeset.valid?(changeset) in)
if (validationResult.isValid()) {
  console.log("✅ Alternative validation check passed!");
}

// Access errors directly (like changeset.errors in)
const errorCount = validationResult.errors.length;
const hasErrors = errorCount > 0;
console.log(`📊 Validation summary: ${hasErrors ? 'Has' : 'No'} errors (${errorCount})`);

// Example 6: Comparison with traditional approaches
console.log("\n6. API Comparison:");
console.log("=================");

console.log("\n📦 Traditional functional approach:");
console.log(`import { pipe, validateRequired, validateEmail } from './changeset';
const result = pipe(
  changeset,
  validateRequired(['email']),
  validateEmail('email')
);
console.log(result.valid, result.errors);`);

console.log("\n🔗 New approach:");
console.log(`import { validate } from './changeset';
const result = validate.changeset(changeset)
  .required(['email'])
  .email('email');
  
// Direct property access like
console.log(result.valid);      // boolean property
console.log(result.errors);     // array property  
console.log(result.changes);    // object property
console.log(result.isValid());  // method call`);

console.log("\n✨ Benefits of API:");
const benefits = [
  "✅ Familiar syntax for developers",
  "✅ Direct property access (changeset.valid)",  
  "✅ Method chaining for validations",
  "✅ No need to call .toChangeset() at the end",
  "✅ Immediate access to validation results",
  "✅ Clean separation of data, changes, and errors",
  "✅ Full TypeScript type safety maintained",
  "✅ Backward compatible with existing code",
];

benefits.forEach(benefit => console.log(`   ${benefit}`));

console.log("\n🎉 Validation API Complete!");
console.log("\nNow you can use familiar patterns in TypeScript:");
console.log("\n```typescript");
console.log("const result = validate.changeset(changeset)");
console.log("  .required(['email', 'username'])");
console.log("  .email('email')");  
console.log("  .length('username', { min: 3 });");
console.log("");
console.log("if (result.valid) {");
console.log("  // Use result.changes, result.data");
console.log("} else {");
console.log("  // Handle result.errors");
console.log("}");
console.log("```");

export { validated, invalidValidated, updateValidated };