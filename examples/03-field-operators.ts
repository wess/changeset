// Clean field operators with arrow function syntax examples

import { schema, f, from, and, or, not } from "../src/index.ts";

console.log("=== Clean Field Operators Examples ===\n");

// Define a test schema
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email"),
  age: f.integer("age"),
  status: f.string("status", { default: "active" }),
  city: f.string("city"),
});

// 1. Basic comparison operators
console.log("1. Basic Comparisons:");

const johnQuery = from(UserSchema).where(u => u.name.eq("John"));
console.log("   name equals 'John':");
console.log(`   SQL: ${johnQuery.toString()}`);

const adultQuery = from(UserSchema).where(u => u.age.gt(18));
console.log("   age greater than 18:");
console.log(`   SQL: ${adultQuery.toString()}`);

const seniorQuery = from(UserSchema).where(u => u.age.lte(65));
console.log("   age less than or equal to 65:");
console.log(`   SQL: ${seniorQuery.toString()}`);

const nonAdminQuery = from(UserSchema).where(u => u.name.neq("Admin"));
console.log("   name not equal to 'Admin':");
console.log(`   SQL: ${nonAdminQuery.toString()}`);
console.log();

// 2. String operations
console.log("2. String Operations:");

const nameSearchQuery = from(UserSchema).where(u => u.name.like("%john%"));
console.log("   name like '%john%':");
console.log(`   SQL: ${nameSearchQuery.toString()}`);

const gmailQuery = from(UserSchema).where(u => u.email.ilike("%@GMAIL.COM"));
console.log("   email ilike '%@GMAIL.COM':");
console.log(`   SQL: ${gmailQuery.toString()}`);
console.log();

// 3. List operations
console.log("3. List Operations:");

const ageGroupQuery = from(UserSchema).where(u => u.age.in([18, 25, 30]));
console.log("   age in [18, 25, 30]:");
console.log(`   SQL: ${ageGroupQuery.toString()}`);

const goodStatusQuery = from(UserSchema).where(u => u.status.notIn(["banned", "suspended"]));
console.log("   status not in ['banned', 'suspended']:");
console.log(`   SQL: ${goodStatusQuery.toString()}`);
console.log();

// 4. Null checks
console.log("4. Null Checks:");

const noEmailQuery = from(UserSchema).where(u => u.email.isNull());
console.log("   email is null:");
console.log(`   SQL: ${noEmailQuery.toString()}`);

const hasEmailQuery = from(UserSchema).where(u => u.email.isNotNull());
console.log("   email is not null:");
console.log(`   SQL: ${hasEmailQuery.toString()}`);
console.log();

// 5. Range conditions
console.log("5. Range Conditions:");

const adultMinQuery = from(UserSchema).where(u => u.age.gte(18));
console.log("   age >= 18:");
console.log(`   SQL: ${adultMinQuery.toString()}`);

const preRetirementQuery = from(UserSchema).where(u => u.age.lt(65));
console.log("   age < 65:");
console.log(`   SQL: ${preRetirementQuery.toString()}`);
console.log();

// 6. Logical operators
console.log("6. Logical Operators:");

const adultRangeQuery = from(UserSchema).where(u => and(
  u.age.gt(18),
  u.age.lt(65)
));
console.log("   AND conditions (18 < age < 65):");
console.log(`   SQL: ${adultRangeQuery.toString()}`);

const specialUsersQuery = from(UserSchema).where(u => or(
  u.age.gt(18),
  u.name.like("%john%")
));
console.log("   OR conditions (age > 18 OR name like '%john%'):");
console.log(`   SQL: ${specialUsersQuery.toString()}`);

const notAdultQuery = from(UserSchema).where(u => not(u.age.gt(18)));
console.log("   NOT condition (NOT age > 18):");
console.log(`   SQL: ${notAdultQuery.toString()}`);
console.log();

// 7. Complex example conditions
console.log("7. Complex Conditions:");

const eligibleUsersQuery = from(UserSchema).where(u => and(
  u.age.gte(18),
  u.age.lt(65),
  u.status.eq("active"),
  u.email.isNotNull()
));

console.log("   Eligible user conditions (age 18-64, active, verified email):");
console.log(`   SQL: ${eligibleUsersQuery.toString()}`);

// Show the improvements
console.log("\n8. Syntax Comparison:");
console.log(`
OLD SYNTAX (clunky):
--------------------
const nameOps = createFieldOperators<string>("name");
const ageOps = createFieldOperators<number>("age");
const condition1 = ageOps.gt(18);
const condition2 = nameOps.eq("John");
const conditions = and(condition1, condition2);

NEW SYNTAX (clean):
------------------
const query = from(UserSchema)
  .where(u => and(
    u.age.gt(18),
    u.name.eq("John")
  ));

// Or even simpler with chaining:
const query = from(UserSchema)
  .where(u => u.age.gt(18))
  .where(u => u.name.eq("John"));
`);

console.log("\n✅ Clean field operators demonstrated successfully!");
console.log("\nKey improvements:");
console.log("- 🎯 Natural field access with arrow functions");
console.log("- 🔧 No more createFieldOperators boilerplate");
console.log("- 📦 Type-safe with IntelliSense support");
console.log("- 🚀 Cleaner, more readable query syntax");
console.log("- ✨ Feels like writing natural JavaScript!");