// Basic query building examples

import { schema, f, timestamps, from } from "../src/index.ts";

// Define schemas
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email"),
  age: f.integer("age"),
  active: f.boolean("active", { default: true }),
  ...timestamps(),
});

const PostSchema = schema("posts", {
  id: f.id(),
  title: f.string("title", { null: false }),
  content: f.string("content"),
  published: f.boolean("published", { default: false }),
  user_id: f.integer("user_id", { null: false }),
  ...timestamps(),
});

// Basic queries
console.log("=== Basic Query Examples ===\n");

// 1. Simple select all
const allUsersQuery = from(UserSchema);
console.log("1. All users:");
console.log(`   SQL: ${allUsersQuery.toString()}`);
console.log(`   Params: ${JSON.stringify(allUsersQuery.toSql().params)}\n`);

// 2. With limit
const limitedUsersQuery = from(UserSchema).limit(10);
console.log("2. Limited users:");
console.log(`   SQL: ${limitedUsersQuery.toString()}`);
console.log(`   Params: ${JSON.stringify(limitedUsersQuery.toSql().params)}\n`);

// 3. With limit and offset (pagination)
const paginatedQuery = from(UserSchema).limit(10).offset(20);
console.log("3. Paginated users:");
console.log(`   SQL: ${paginatedQuery.toString()}`);
console.log(`   Params: ${JSON.stringify(paginatedQuery.toSql().params)}\n`);

// 4. With alias
const aliasedQuery = from(UserSchema, "u").limit(5);
console.log("4. Users with alias:");
console.log(`   SQL: ${aliasedQuery.toString()}`);
console.log(`   Params: ${JSON.stringify(aliasedQuery.toSql().params)}\n`);

// 5. Posts query
const recentPostsQuery = from(PostSchema, "p").limit(5).offset(0);
console.log("5. Recent posts:");
console.log(`   SQL: ${recentPostsQuery.toString()}`);
console.log(`   Params: ${JSON.stringify(recentPostsQuery.toSql().params)}\n`);

console.log("✅ Basic queries generated successfully!");