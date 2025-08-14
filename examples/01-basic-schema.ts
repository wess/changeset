// Basic schema definition example

import { schema, f, timestamps } from "../src/index.ts";

// Define a simple User schema
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { unique: true }),
  age: f.integer("age"),
});

// Define a schema with timestamps
const PostSchema = schema("posts", {
  id: f.id(),
  title: f.string("title", { null: false }),
  content: f.string("content"),
  published: f.boolean("published", { default: false }),
  ...timestamps(), // Adds inserted_at and updated_at
});

// Define a schema with different field types
const ProductSchema = schema("products", {
  id: f.id(),
  name: f.string("name", { null: false }),
  price: f.float("price", { null: false }),
  in_stock: f.boolean("in_stock", { default: true }),
  tags: f.array("tags"), // Array field (PostgreSQL)
  metadata: f.map("metadata"), // JSON field
  created_at: f.utcDateTime("created_at", { null: false }),
});

console.log("✅ Schema definitions created successfully!");
console.log("User table:", UserSchema.tableName);
console.log("User fields:", Object.keys(UserSchema.fields));
console.log("Post fields:", Object.keys(PostSchema.fields));
console.log("Product fields:", Object.keys(ProductSchema.fields));