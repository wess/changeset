// Showcase of the new generic schema capabilities

import { schema, createSchema, f } from "../src/index.ts";
import { changeset, cast, pipe, validate, validateRequired, validateEmail, validateLength } from "../src/index.ts";

// Define clean data interfaces without any constraints
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  bio?: string;
  createdAt: Date;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  tags: string[];
  metadata: {
    readTime: number;
    difficulty: "beginner" | "intermediate" | "advanced";
  };
  published: boolean;
  publishedAt?: Date;
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

console.log("🔧 Generic Schema Showcase");
console.log("==========================");

// Example 1: Generic schemas with explicit type mapping
console.log("\\n1. Creating schemas with explicit type mapping:");

const UserSchema = schema<User>("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { null: false, unique: true }),
  age: f.integer("age", { null: false }),
  bio: f.string("bio"),
  createdAt: f.utcDateTime("created_at", { null: false }),
});

const PostSchema = createSchema<Post>("Post", {
  id: f.id(),
  title: f.string("title", { null: false }),
  content: f.string("content", { null: false }),
  authorId: f.string("author_id", { null: false }),
  tags: f.string("tags"), // JSON array in database
  metadata: f.string("metadata"), // JSON object in database
  published: f.boolean("published", { default: false }),
  publishedAt: f.utcDateTime("published_at"),
  createdAt: f.utcDateTime("created_at", { null: false }),
});

const CommentSchema = createSchema<Comment>("Comment", {
  id: f.id(),
  postId: f.string("post_id", { null: false }),
  authorId: f.string("author_id", { null: false }),
  content: f.string("content", { null: false }),
  likes: f.integer("likes", { default: 0 }),
  createdAt: f.utcDateTime("created_at", { null: false }),
});

console.log("✅ User schema table:", UserSchema.tableName);
console.log("✅ Post schema table:", PostSchema.tableName);
console.log("✅ Comment schema table:", CommentSchema.tableName);

// Example 2: Type-safe changeset operations
console.log("\\n2. Type-safe changeset operations:");

// Create a new user changeset with full type safety
const newUserData = {
  name: "Alice Johnson",
  email: "alice@example.com",
  age: 28,
  bio: "Full-stack developer",
};

const userChangeset = changeset<User>({} as User, "insert");
const userCasted = cast(userChangeset, newUserData, ["name", "email", "age", "bio"]);

// TypeScript knows the exact fields and types here
const userValidated = pipe(
  userCasted,
  validateRequired(["name", "email", "age"]),
  validateEmail("email"),
  validateLength("name", { min: 2, max: 100 }),
);

console.log("✅ User changeset valid:", userValidated.valid);
console.log("✅ User changes:", userValidated.changes);

// Example 3: Complex data types
console.log("\\n3. Working with complex data types:");

const newPostData = {
  title: "Advanced TypeScript Patterns",
  content: "In this post, we'll explore advanced TypeScript patterns...",
  authorId: "user-123",
  tags: ["typescript", "programming", "advanced"],
  metadata: {
    readTime: 15,
    difficulty: "advanced" as const,
  },
  published: true,
};

const postChangeset = changeset<Post>({} as Post, "insert");
const postCasted = cast(postChangeset, {
  ...newPostData,
  // Simulate JSON serialization for database storage
  tags: JSON.stringify(newPostData.tags),
  metadata: JSON.stringify(newPostData.metadata),
}, ["title", "content", "authorId", "tags", "metadata", "published"]);

const postValidated = pipe(
  postCasted,
  validateRequired(["title", "content", "authorId"]),
  validateLength("title", { min: 5, max: 200 }),
  validateLength("content", { min: 10 }),
);

console.log("✅ Post changeset valid:", postValidated.valid);
console.log("✅ Post changes:", {
  title: postValidated.changes.title,
  authorId: postValidated.changes.authorId,
  published: postValidated.changes.published,
});

// Example 4: Update operations with type safety
console.log("\\n4. Update operations with type safety:");

const existingUser: User = {
  id: "user-456",
  name: "Bob Smith",
  email: "bob@example.com",
  age: 32,
  bio: "Backend developer",
  createdAt: new Date("2024-01-01"),
};

const updateData = {
  bio: "Senior backend developer specializing in Node.js",
  age: 33,
};

const updateChangeset = changeset<User>(existingUser, "update");
const updateCasted = cast(updateChangeset, updateData, ["bio", "age"]);
const updateValidated = pipe(
  updateCasted,
  validateLength("bio", { max: 500 }),
);

console.log("✅ Update changeset valid:", updateValidated.valid);
console.log("✅ Update changes:", updateValidated.changes);
console.log("✅ Original data preserved:", {
  id: updateValidated.data.id,
  name: updateValidated.data.name,
  email: updateValidated.data.email,
});

// Example 5: Error handling with type safety
console.log("\\n5. Error handling with type safety:");

const invalidData = {
  name: "X", // Too short
  email: "invalid-email", // Invalid format
  age: -5, // Invalid value
};

const errorChangeset = changeset<User>({} as User, "insert");
const errorCasted = cast(errorChangeset, invalidData, ["name", "email", "age"]);
const errorValidated = pipe(
  errorCasted,
  validateRequired(["name", "email"]),
  validateEmail("email"),
  validateLength("name", { min: 2, max: 100 }),
);

console.log("✅ Error changeset valid:", errorValidated.valid);
console.log("✅ Validation errors:");
for (const error of errorValidated.errors) {
  console.log(`   - ${error.field}: ${error.message}`);
}

// Example 6: Schema type inference
console.log("\\n6. Schema type inference benefits:");

// Without generic: TypeScript only knows it's some schema
const schemaWithoutGeneric = schema("users", {
  id: f.id(),
  name: f.string("name"),
});

// With generic: TypeScript knows exactly what data type this represents
const schemaWithGeneric = schema<User>("users", {
  id: f.id(),
  name: f.string("name"),
  email: f.string("email"),
  age: f.integer("age"),
  bio: f.string("bio"),
  createdAt: f.utcDateTime("created_at"),
});

console.log("✅ Schema without generic:", typeof schemaWithoutGeneric.__type);
console.log("✅ Schema with generic maps to User interface");

// Example 7: Repository integration (conceptual)
console.log("\\n7. Repository integration benefits:");

// When used with repositories, the generic type ensures:
// - Insert operations expect User objects
// - Query results return User[] or User | null
// - Update operations work with Partial<User>
// - Type-safe field access in queries

console.log("✅ Repository integration:");
console.log("   - Insert: (user: User) => Promise<Result<User>>");
console.log("   - FindAll: () => Promise<Result<User[]>>");
console.log("   - FindOne: (id: string) => Promise<Result<User | null>>");
console.log("   - Update: (id: string, data: Partial<User>) => Promise<Result<User>>");

// Example 8: Benefits summary
console.log("\\n8. Benefits of Generic Schema Pattern:");

const benefits = [
  "✅ Full TypeScript type safety with clean interfaces",
  "✅ IntelliSense support for field names and types",
  "✅ Compile-time validation of field access",
  "✅ Seamless integration with existing TypeScript interfaces",
  "✅ No need for complex type gymnastics or index signatures",
  "✅ Works with both schema() and createSchema() functions",
  "✅ Backward compatible - existing code continues to work",
  "✅ Better error messages from TypeScript compiler",
  "✅ Type-safe changeset operations",
  "✅ Repository operations are fully typed",
];

for (const benefit of benefits) {
  console.log(`   ${benefit}`);
}

console.log("\\n🎉 Generic Schema Showcase Complete!");
console.log("\\nNow you can use clean TypeScript interfaces with full type safety:");
console.log("\\n```typescript");
console.log("interface User {");
console.log("  id: string;");
console.log("  name: string;");
console.log("  email: string;");
console.log("}");
console.log("");
console.log("const UserSchema = schema<User>('users', {");
console.log("  id: f.id(),");
console.log("  name: f.string('name', { null: false }),");
console.log("  email: f.string('email', { null: false }),");
console.log("});");
console.log("");
console.log("// Full type safety in changesets and repositories!");
console.log("const changeset = changeset<User>(userData);");
console.log("```");

export { UserSchema, PostSchema, CommentSchema };