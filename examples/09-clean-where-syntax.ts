// Clean where syntax examples - no more createFieldOperators!

import { schema, f, timestamps, from, and, or } from "../src/index.ts";

// Define a User schema
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { unique: true }),
  age: f.integer("age"),
  status: f.string("status", { default: "active" }),
  city: f.string("city"),
  role: f.string("role", { default: "user" }),
  ...timestamps(),
});

const PostSchema = schema("posts", {
  id: f.id(),
  title: f.string("title", { null: false }),
  content: f.string("content"),
  published: f.boolean("published", { default: false }),
  views: f.integer("views", { default: 0 }),
  category: f.string("category"),
  featured: f.boolean("featured", { default: false }),
  user_id: f.integer("user_id", { null: false }),
  ...timestamps(),
});

console.log("=== Clean Where Syntax Examples ===\n");

// 1. Basic comparisons - SO MUCH CLEANER!
console.log("1. Basic Comparisons:");

const activeUsers = from(UserSchema)
  .where(u => u.status.eq("active"))
  .limit(10);

console.log("   Active users:");
console.log(`   SQL: ${activeUsers.toString()}`);

const adultUsers = from(UserSchema)
  .where(u => u.age.gte(18))
  .limit(10);

console.log("   Adult users (age >= 18):");
console.log(`   SQL: ${adultUsers.toString()}`);
console.log();

// 2. Multiple conditions
console.log("2. Multiple Conditions:");

const activeAdults = from(UserSchema)
  .where(u => and(
    u.age.gte(18),
    u.age.lt(65),
    u.status.eq("active")
  ))
  .limit(10);

console.log("   Active adults (18-64):");
console.log(`   SQL: ${activeAdults.toString()}`);
console.log();

// 3. String operations
console.log("3. String Operations:");

const johnUsers = from(UserSchema)
  .where(u => u.name.like("%john%"))
  .limit(10);

console.log("   Users with 'john' in name:");
console.log(`   SQL: ${johnUsers.toString()}`);

const gmailUsers = from(UserSchema)
  .where(u => u.email.ilike("%@gmail.com"))
  .limit(10);

console.log("   Gmail users (case insensitive):");
console.log(`   SQL: ${gmailUsers.toString()}`);
console.log();

// 4. IN queries
console.log("4. IN Queries:");

const cityUsers = from(UserSchema)
  .where(u => u.city.in(["New York", "Los Angeles", "Chicago"]))
  .limit(10);

console.log("   Users in major cities:");
console.log(`   SQL: ${cityUsers.toString()}`);

const adminUsers = from(UserSchema)
  .where(u => u.role.in(["admin", "moderator", "editor"]))
  .limit(10);

console.log("   Admin/Moderator/Editor users:");
console.log(`   SQL: ${adminUsers.toString()}`);
console.log();

// 5. Null checks
console.log("5. Null Checks:");

const verifiedUsers = from(UserSchema)
  .where(u => u.email.isNotNull())
  .limit(10);

console.log("   Users with verified emails:");
console.log(`   SQL: ${verifiedUsers.toString()}`);
console.log();

// 6. Complex queries with OR
console.log("6. Complex OR Conditions:");

const specialUsers = from(UserSchema)
  .where(u => or(
    u.role.eq("admin"),
    u.age.gte(65),
    u.city.eq("San Francisco")
  ))
  .limit(10);

console.log("   Admins OR seniors OR SF residents:");
console.log(`   SQL: ${specialUsers.toString()}`);
console.log();

// 7. Post queries
console.log("7. Post Queries:");

const popularPosts = from(PostSchema)
  .where(p => and(
    p.published.eq(true),
    p.views.gte(1000)
  ))
  .limit(10);

console.log("   Popular published posts (1000+ views):");
console.log(`   SQL: ${popularPosts.toString()}`);

const featuredTech = from(PostSchema)
  .where(p => and(
    p.featured.eq(true),
    p.category.in(["tech", "programming", "javascript"])
  ))
  .limit(5);

console.log("   Featured tech posts:");
console.log(`   SQL: ${featuredTech.toString()}`);
console.log();

// 8. Chaining multiple where clauses
console.log("8. Chaining Where Clauses:");

const complexQuery = from(UserSchema)
  .where(u => u.status.eq("active"))
  .where(u => u.age.gte(18))
  .where(u => u.email.isNotNull())
  .limit(10);

console.log("   Active adult users with email:");
console.log(`   SQL: ${complexQuery.toString()}`);
console.log();

// 9. Comparison with old syntax
console.log("9. Syntax Comparison:");
console.log(`
OLD SYNTAX (clunky):
--------------------
import { createFieldOperators } from "../src/query/operators.ts";

const ageOps = createFieldOperators<number>("age");
const statusOps = createFieldOperators<string>("status");

const conditions = and(
  ageOps.gte(18),
  statusOps.eq("active")
);

NEW SYNTAX (clean):
------------------
const query = from(UserSchema)
  .where(u => and(
    u.age.gte(18),
    u.status.eq("active")
  ))
  .limit(10);

// Or even simpler for single conditions:
const query = from(UserSchema)
  .where(u => u.age.gte(18))
  .limit(10);
`);

console.log("✅ Clean where syntax examples completed!");
console.log("\nKey improvements:");
console.log("- 🎯 Natural field access: u.name.eq() instead of createFieldOperators");
console.log("- 🔧 Arrow functions for clean syntax");
console.log("- 📦 Type-safe with IntelliSense");
console.log("- 🚀 No more manual operator creation");
console.log("- ✨ Feels like writing normal JavaScript!");