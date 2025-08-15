// Example: Clean schema creation patterns

import { f, createSchema, schema } from "../src/index.ts";

// Define your TypeScript interfaces
interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  published: boolean;
  createdAt: Date;
}

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  likes: number;
  createdAt: Date;
}

console.log("=== Clean Schema Creation ===");

// Method 1: Explicit table names (traditional, full control)
const UserSchema = schema("users", {
  id: f.id(),
  username: f.string("username", { null: false }),
  email: f.string("email", { null: false }),
  password: f.string("password", { null: false }),
  createdAt: f.utcDateTime("created_at", { null: false }),
  updatedAt: f.utcDateTime("updated_at", { null: false }),
});

// Method 2: Simplified with automatic table name inference
// "User" -> "users", "Post" -> "posts", "Comment" -> "comments"  
const PostSchema = createSchema("Post", {
  id: f.id(),
  title: f.string("title", { null: false }),
  content: f.string("content", { null: false }),
  authorId: f.string("author_id", { null: false }),
  published: f.boolean("published", { default: false }),
  createdAt: f.utcDateTime("created_at", { null: false }),
});

const CommentSchema = createSchema("Comment", {
  id: f.id(),
  postId: f.string("post_id", { null: false }),
  authorId: f.string("author_id", { null: false }),
  content: f.string("content", { null: false }),
  likes: f.integer("likes", { default: 0 }),
  createdAt: f.utcDateTime("created_at", { null: false }),
});

console.log("\n=== Generated Table Names ===");
console.log("User ->", UserSchema.tableName);       // users
console.log("Post ->", PostSchema.tableName);       // posts  
console.log("Comment ->", CommentSchema.tableName); // comments

console.log("\n=== Pluralization Examples ===");
// The createSchema function handles various pluralization rules:

const PersonSchema = createSchema("Person", {
  id: f.id(),
  name: f.string("name", { null: false }),
});

const CategorySchema = createSchema("Category", {
  id: f.id(), 
  name: f.string("name", { null: false }),
});

const CompanySchema = createSchema("Company", {
  id: f.id(),
  name: f.string("name", { null: false }),
});

console.log("Person ->", PersonSchema.tableName);     // people (irregular)
console.log("Category ->", CategorySchema.tableName); // categories (y -> ies)
console.log("Company ->", CompanySchema.tableName);   // companies (y -> ies)

console.log("\n=== Benefits of Simplified Approach ===");
console.log("✅ Less typing - no need to repeat table names");
console.log("✅ Consistent naming - automatic pluralization");
console.log("✅ Type safety - full generic support");
console.log("✅ Flexibility - multiple syntax options");
console.log("✅ Convention over configuration");

console.log("\n=== When to Use Each Approach ===");
console.log("• createSchema('TypeName', fields) - When you want automatic pluralization");
console.log("• schema('custom_table', fields) - When you need custom table names");

console.log("\n=== Real-world Example ===");

// This is how you might use it in a real application:
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  authorId: string;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  metadata: {
    readTime: number;
    featuredImage?: string;
    seoTitle?: string;
    seoDescription?: string;
  };
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Clean, simple, and type-safe!
const BlogPostSchema = createSchema("BlogPost", {
  id: f.id(),
  title: f.string("title", { null: false }),
  slug: f.string("slug", { null: false, unique: true }),
  content: f.string("content", { null: false }),
  authorId: f.string("author_id", { null: false }),
  status: f.string("status", { null: false, default: "draft" }),
  tags: f.array("tags"),
  metadata: f.map("metadata"),
  publishedAt: f.utcDateTime("published_at"),
  createdAt: f.utcDateTime("created_at", { null: false }),
  updatedAt: f.utcDateTime("updated_at", { null: false }),
});

console.log("BlogPost ->", BlogPostSchema.tableName); // blogposts

console.log("\n🎉 The schema creation is now much cleaner and more intuitive!");