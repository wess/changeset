// Example: Using generic type parameters with schema

import { f, from, schema, createSchema } from "../src/index.ts";

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
  tags: string[];
  metadata: Record<string, unknown>;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  likes: number;
  createdAt: Date;
}

// Method 1: Traditional explicit approach (best when you want full control)
const UserSchema = schema("users", {
  id: f.id(),
  username: f.string("username", { null: false, unique: true }),
  email: f.string("email", { null: false, unique: true }),
  password: f.string("password", { null: false }),
  createdAt: f.utcDateTime("created_at", { null: false }),
  updatedAt: f.utcDateTime("updated_at", { null: false }),
});

// Method 2: Simplified with automatic table name inference (User -> users)
const PostSchema = createSchema("Post", {
  id: f.id(),
  title: f.string("title", { null: false }),
  content: f.string("content", { null: false }),
  authorId: f.string("author_id", { null: false }),
  published: f.boolean("published", { default: false }),
  tags: f.array("tags"),
  metadata: f.map("metadata"),
  publishedAt: f.utcDateTime("published_at"),
  createdAt: f.utcDateTime("created_at", { null: false }),
  updatedAt: f.utcDateTime("updated_at", { null: false }),
});

// Method 3: Simple explicit approach for comments
const CommentSchema = schema("comments", {
  id: f.id(),
  postId: f.string("post_id", { null: false }),
  authorId: f.string("author_id", { null: false }),
  content: f.string("content", { null: false }),
  likes: f.integer("likes", { default: 0 }),
  createdAt: f.utcDateTime("created_at", { null: false }),
});

// The generic type parameter provides better IntelliSense and type checking
console.log("=== Schema Definitions ===");
console.log("User table:", UserSchema.tableName);
console.log("Post table:", PostSchema.tableName);
console.log("Comment table:", CommentSchema.tableName);

// Build type-safe queries (examples - some queries may need repository to execute)
console.log("\n=== Query Examples ===");

// Query examples showing both string and function syntax for orderBy
const activeUsersQuery = from(UserSchema)
  .where((u) => u.createdAt.gte(new Date("2024-01-01")))
  .orderBy("username"); // Simple string syntax

const publishedPostsQuery = from(PostSchema)
  .where((p) => p.published.eq(true))
  .where((p) => p.publishedAt.isNotNull())
  .orderBy((p) => "publishedAt", "desc"); // Arrow function syntax

const popularCommentsQuery = from(CommentSchema)
  .where((c) => c.likes.gte(10))
  .orderBy("likes", "desc") // String syntax with direction
  .limit(20);

console.log("Active users query for table:", UserSchema.tableName);
console.log("Published posts query for table:", PostSchema.tableName);
console.log("Popular comments query for table:", CommentSchema.tableName);

// Demonstrate query usage (in a real app, these would be executed via repository)
console.log("Query examples created successfully:");
console.log("- Active users query:", typeof activeUsersQuery);
console.log("- Published posts query:", typeof publishedPostsQuery);
console.log("- Popular comments query:", typeof popularCommentsQuery);

// Example: Type-safe data creation with schema types
const createUser = (data: Omit<User, "id" | "createdAt" | "updatedAt">): User => {
  const now = new Date();
  return {
    id: `user-${Date.now()}`,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
};

const createPost = (
  data: Omit<Post, "id" | "createdAt" | "updatedAt">,
): Post => {
  const now = new Date();
  return {
    id: `post-${Date.now()}`,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
};

// Create sample data
const newUser = createUser({
  username: "john_doe",
  email: "john@example.com",
  password: "hashed_password_here",
});

const newPost = createPost({
  title: "Getting Started with TypeScript",
  content: "TypeScript is a typed superset of JavaScript...",
  authorId: newUser.id,
  published: true,
  publishedAt: new Date(),
  tags: ["typescript", "javascript", "programming"],
  metadata: {
    readTime: "5 min",
    difficulty: "beginner",
  },
});

console.log("\n=== Sample Data ===");
console.log("New User:", newUser);
console.log("New Post:", newPost);

// Example: Working with schema field definitions
console.log("\n=== Schema Field Information ===");

// Access field definitions
const userFields = UserSchema.fields;
console.log("User fields:", Object.keys(userFields));

const postFields = PostSchema.fields;
console.log("Post fields:", Object.keys(postFields));

// Check field properties
const emailField = userFields.email;
console.log("Email field type:", emailField.type);
console.log("Email field options:", emailField.options);

// Example: Creating a type-safe repository wrapper
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Omit<T, "id">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

// This would be implemented with actual database operations
const createRepository = <T>(schemaInstance: { tableName: string }): Repository<T> => {
  console.log(`Creating repository for table: ${schemaInstance.tableName}`);
  
  // Placeholder implementation
  return {
    async findById(id: string) {
      console.log(`Finding ${schemaInstance.tableName} by id:`, id);
      return null;
    },
    async findAll() {
      console.log(`Finding all ${schemaInstance.tableName}`);
      return [];
    },
    async create(data) {
      console.log(`Creating ${schemaInstance.tableName}:`, data);
      return { id: `new-id`, ...data } as T;
    },
    async update(id, data) {
      console.log(`Updating ${schemaInstance.tableName} ${id}:`, data);
      return { id, ...data } as T;
    },
    async delete(id) {
      console.log(`Deleting ${schemaInstance.tableName}:`, id);
      return true;
    },
  };
};

// Create type-safe repositories
console.log("\n=== Repository Creation ===");
createRepository<User>(UserSchema);
createRepository<Post>(PostSchema);
createRepository<Comment>(CommentSchema);

console.log("\n✅ Generic schema examples completed!");

console.log("\n=== Schema Creation Methods Summary ===");
console.log("1. Explicit: schema('users', { ... })");
console.log("2. Simplified: createSchema('User', { ... }) -> 'users'");

console.log("\n=== Table Names Generated ===");
console.log("UserSchema:", UserSchema.tableName);
console.log("PostSchema:", PostSchema.tableName); 
console.log("CommentSchema:", CommentSchema.tableName);

console.log("\n=== Query Builder Features ===");
console.log("✅ Flexible orderBy syntax - string OR arrow function");
console.log("✅ Type-safe where conditions with proxy objects");
console.log("✅ Method chaining for readable queries");
console.log("✅ Support for limit, offset, select, etc.");

console.log("\n=== Benefits of Clean Schema API ===");
console.log("✅ Simple schema creation - no complex generics");
console.log("✅ Better type inference and IntelliSense");
console.log("✅ Compile-time type checking for data operations");
console.log("✅ Cleaner integration with existing TypeScript interfaces");
console.log("✅ Multiple syntax options for different preferences");
console.log("✅ Automatic pluralization for table names");