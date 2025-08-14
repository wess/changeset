// Improved syntax examples - cleaner field definitions and SQL generation

import { schema, f, timestamps } from "../src/index.ts";

console.log("=== Improved Syntax Examples ===\n");

// 1. Improved field syntax - much cleaner!
console.log("1. Improved Field Syntax:");

const UserSchema = schema("users", {
  id: f.id(),
  username: f.string("username", { null: false, unique: true }),
  email: f.string("email", { null: false, unique: true }),
  password_hash: f.string("password_hash", { null: false }),
  first_name: f.string("first_name"),
  last_name: f.string("last_name"),
  age: f.integer("age"),
  height: f.float("height"), // in meters
  active: f.boolean("active", { default: true }),
  email_verified: f.boolean("email_verified", { default: false }),
  birth_date: f.date("birth_date"),
  last_login_at: f.utcDateTime("last_login_at"),
  preferences: f.map("preferences"), // JSON field
  tags: f.array("tags"), // Array field (PostgreSQL)
  ...timestamps(),
});

console.log("   ✅ User schema with improved field syntax:");
console.log(`   Table: ${UserSchema.tableName}`);
console.log(`   Fields: ${Object.keys(UserSchema.fields).join(", ")}`);
console.log();

// 2. More field examples
console.log("2. More Field Type Examples:");

const ProductSchema = schema("products", {
  id: f.id(),
  name: f.string("name", { null: false }),
  description: f.string("description"),
  price: f.float("price", { null: false }),
  weight: f.float("weight"), // in kg
  in_stock: f.boolean("in_stock", { default: true }),
  category_id: f.integer("category_id"),
  sku: f.string("sku", { unique: true }),
  barcode: f.string("barcode"),
  image_data: f.binary("image_data"),
  metadata: f.map("metadata"),
  tags: f.array("tags"),
  created_date: f.date("created_date"),
  manufactured_at: f.naiveDateTime("manufactured_at"),
  ...timestamps(),
});

console.log("   ✅ Product schema with various field types:");
console.log(`   Fields: ${Object.keys(ProductSchema.fields).join(", ")}`);
console.log();

// 3. Integrated SQL generation - no more manual generateSql calls!
console.log("3. Integrated SQL Generation:");

import { from } from "../src/index.ts";

// Create queries and get SQL directly
const allUsersQuery = from(UserSchema);
console.log("   All users query:");
console.log(`   SQL: ${allUsersQuery.toString()}`);
console.log(`   Full SQL data:`, allUsersQuery.toSql());
console.log();

const paginatedQuery = from(UserSchema)
  .limit(10)
  .offset(20);

console.log("   Paginated users query:");
console.log(`   SQL: ${paginatedQuery.toString()}`);
console.log();

const limitedProductsQuery = from(ProductSchema, "p")
  .limit(5);

console.log("   Limited products query:");
console.log(`   SQL: ${limitedProductsQuery.toString()}`);
console.log();

// 4. Comparison: Old vs New syntax
console.log("4. Syntax Comparison:");

console.log(`
   OLD SYNTAX (still works):
   -------------------------
   const UserSchema = schema("users", {
     id: idField(),
     name: field("name", "string", { null: false }),
     email: field("email", "string", { unique: true }),
     age: field("age", "integer"),
     active: field("active", "boolean", { default: true }),
     created_at: field("created_at", "utc_datetime", { null: false }),
   });
   
   const query = from(UserSchema).limit(10).build();
   const { sql, params } = generateSql(query);

   NEW SYNTAX (cleaner):
   --------------------
   const UserSchema = schema("users", {
     id: field.id(),
     name: field.string("name", { null: false }),
     email: field.string("email", { unique: true }),
     age: field.integer("age"),
     active: field.boolean("active", { default: true }),
     created_at: field.utcDateTime("created_at", { null: false }),
   });
   
   const query = from(UserSchema).limit(10);
   const sql = query.toString();
   const { sql, params } = query.toSql();
`);

// 5. Advanced schema example with new syntax
console.log("5. Advanced Schema Example:");

const BlogPostSchema = schema("blog_posts", {
  id: f.id(),
  title: f.string("title", { null: false }),
  slug: f.string("slug", { null: false, unique: true }),
  excerpt: f.string("excerpt"),
  content: f.string("content", { null: false }),
  featured_image_url: f.string("featured_image_url"),
  status: f.string("status", { default: "draft" }),
  published_at: f.utcDateTime("published_at"),
  scheduled_at: f.utcDateTime("scheduled_at"),
  view_count: f.integer("view_count", { default: 0 }),
  like_count: f.integer("like_count", { default: 0 }),
  comment_count: f.integer("comment_count", { default: 0 }),
  reading_time: f.integer("reading_time"), // minutes
  word_count: f.integer("word_count"),
  featured: f.boolean("featured", { default: false }),
  allow_comments: f.boolean("allow_comments", { default: true }),
  seo_title: f.string("seo_title"),
  seo_description: f.string("seo_description"),
  tags: f.array("tags"),
  metadata: f.map("metadata"),
  author_id: f.integer("author_id", { null: false }),
  category_id: f.integer("category_id"),
  ...timestamps(),
});

console.log("   ✅ Blog post schema with comprehensive fields:");
console.log(`   Total fields: ${Object.keys(BlogPostSchema.fields).length}`);
console.log(`   Field types used: ${[...new Set(Object.values(BlogPostSchema.fields).map(f => f.type))].join(", ")}`);
console.log();

// 6. Query chaining with new syntax
console.log("6. Query Chaining Examples:");

const recentPostsQuery = from(BlogPostSchema, "bp")
  .limit(10)
  .offset(0);

const popularPostsQuery = from(BlogPostSchema, "bp")
  .limit(5);

const featuredPostsQuery = from(BlogPostSchema, "bp")
  .limit(3);

console.log("   Recent posts SQL:", recentPostsQuery.toString());
console.log("   Popular posts SQL:", popularPostsQuery.toString());
console.log("   Featured posts SQL:", featuredPostsQuery.toString());
console.log();

console.log("✅ Improved syntax examples completed!");
console.log("\nKey improvements:");
console.log("- 🎯 Cleaner field syntax: field.string() vs field('name', 'string')");
console.log("- 🔧 Integrated SQL generation: query.toString() vs generateSql(query)");
console.log("- 📦 Better developer experience with IntelliSense");
console.log("- 🚀 Less boilerplate code");
console.log("- 📝 More readable schema definitions");