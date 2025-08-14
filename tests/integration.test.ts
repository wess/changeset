// Integration tests with real SQLite database

import { test, expect, beforeEach, afterEach } from "bun:test";
import { schema, f, from, and, or } from "../src/index.ts";
import type { Repo } from "../src/repo/repo.ts";
import { createSqliteAdapter } from "../src/connection/sqlite.ts";
import { createRepoFunctions } from "../src/repo/repo.ts";
import type { Database } from "bun:sqlite";

// Create a combined SQLite repo with table management capabilities
const createSqliteRepoWithTableManagement = async (database: string) => {
  const adapter = createSqliteAdapter({
    database,
    options: { create: true }
  });

  const connectResult = await adapter.connect();
  if (!connectResult.success) {
    throw new Error(`Failed to connect: ${connectResult.error}`);
  }

  // Create repo functions using the same adapter
  const repo = (createRepoFunctions as any)(adapter);

  // Return repo with table management methods attached
  return {
    ...repo,
    createTable: (adapter as any).createTable,
    dropTable: (adapter as any).dropTable,
    tableExists: (adapter as any).tableExists,
    getRawDatabase: (adapter as any).getRawDatabase,
    disconnect: adapter.disconnect,
  };
};

// Test schemas
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { unique: true }),
  age: f.integer("age"),
  active: f.boolean("active", { default: true }),
  created_at: f.utcDateTime("created_at", { null: false }),
});

const PostSchema = schema("posts", {
  id: f.id(),
  title: f.string("title", { null: false }),
  content: f.string("content"),
  published: f.boolean("published", { default: false }),
  views: f.integer("views", { default: 0 }),
  user_id: f.integer("user_id", { null: false }),
});

let repo: any; // Combined repo with table management

beforeEach(async () => {
  // Create combined repo with table management capabilities
  repo = await createSqliteRepoWithTableManagement(":memory:");

  // Create tables
  repo.createTable("users", [
    "id INTEGER PRIMARY KEY AUTOINCREMENT",
    "name TEXT NOT NULL",
    "email TEXT UNIQUE",
    "age INTEGER",
    "active BOOLEAN DEFAULT 1",
    "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
  ]);

  repo.createTable("posts", [
    "id INTEGER PRIMARY KEY AUTOINCREMENT", 
    "title TEXT NOT NULL",
    "content TEXT",
    "published BOOLEAN DEFAULT 0",
    "views INTEGER DEFAULT 0",
    "user_id INTEGER NOT NULL",
    "FOREIGN KEY (user_id) REFERENCES users (id)"
  ]);
});

afterEach(async () => {
  await repo.disconnect();
});

test("insert and query users", async () => {
  // Insert test users
  const user1Result = await repo.insert("users", {
    name: "John Doe",
    email: "john@example.com",
    age: 30,
    created_at: new Date(),
  });
  
  expect(user1Result.success).toBe(true);
  if (!user1Result.success) return;
  
  const user2Result = await repo.insert("users", {
    name: "Jane Smith", 
    email: "jane@example.com",
    age: 25,
    created_at: new Date(),
  });
  
  expect(user2Result.success).toBe(true);
  if (!user2Result.success) return;

  // Query all users
  const allUsersQuery = from(UserSchema).limit(10);
  const allUsersResult = await repo.all(allUsersQuery);
  
  expect(allUsersResult.success).toBe(true);
  if (!allUsersResult.success) return;
  
  expect(allUsersResult.data).toHaveLength(2);
  expect(allUsersResult.data[0].name).toBe("John Doe");
  expect(allUsersResult.data[1].name).toBe("Jane Smith");
});

test("where conditions with clean syntax", async () => {
  // Insert test data
  await repo.insert("users", {
    name: "Alice Johnson",
    email: "alice@example.com", 
    age: 28,
    active: true,
    created_at: new Date(),
  });
  
  await repo.insert("users", {
    name: "Bob Wilson",
    email: "bob@example.com",
    age: 35,
    active: false,
    created_at: new Date(),
  });

  await repo.insert("users", {
    name: "Charlie Brown",
    email: "charlie@example.com",
    age: 22,
    active: true,
    created_at: new Date(),
  });

  // Test single condition
  const activeUsersQuery = from(UserSchema)
    .where(u => u.active.eq(true));
  
  const activeUsersResult = await repo.all(activeUsersQuery);
  expect(activeUsersResult.success).toBe(true);
  if (!activeUsersResult.success) return;
  
  expect(activeUsersResult.data).toHaveLength(2);
  expect(activeUsersResult.data.every(user => user.active)).toBe(true);

  // Test AND conditions
  const youngActiveUsersQuery = from(UserSchema)
    .where(u => and(
      u.active.eq(true),
      u.age.lt(30)
    ));
  
  const youngActiveResult = await repo.all(youngActiveUsersQuery);
  expect(youngActiveResult.success).toBe(true);
  if (!youngActiveResult.success) return;
  
  expect(youngActiveResult.data).toHaveLength(2); // Alice (28) and Charlie (22)

  // Test OR conditions
  const specificUsersQuery = from(UserSchema)
    .where(u => or(
      u.name.eq("Alice Johnson"),
      u.age.gte(35)
    ));
  
  const specificUsersResult = await repo.all(specificUsersQuery);
  expect(specificUsersResult.success).toBe(true);
  if (!specificUsersResult.success) return;
  
  expect(specificUsersResult.data).toHaveLength(2); // Alice and Bob
});

test("LIKE and IN operators", async () => {
  // Insert test data
  await repo.insert("users", {
    name: "John Smith",
    email: "john.smith@gmail.com",
    age: 30,
    created_at: new Date(),
  });
  
  await repo.insert("users", {
    name: "Johnny Walker",
    email: "johnny@example.com", 
    age: 25,
    created_at: new Date(),
  });

  await repo.insert("users", {
    name: "Sarah Connor",
    email: "sarah@gmail.com",
    age: 35,
    created_at: new Date(),
  });

  // Test LIKE operator
  const johnUsersQuery = from(UserSchema)
    .where(u => u.name.like("%John%"));
  
  const johnUsersResult = await repo.all(johnUsersQuery);
  expect(johnUsersResult.success).toBe(true);
  if (!johnUsersResult.success) return;
  
  expect(johnUsersResult.data).toHaveLength(2);

  // Test IN operator  
  const specificAgesQuery = from(UserSchema)
    .where(u => u.age.in([25, 35]));
  
  const specificAgesResult = await repo.all(specificAgesQuery);
  expect(specificAgesResult.success).toBe(true);
  if (!specificAgesResult.success) return;
  
  expect(specificAgesResult.data).toHaveLength(2); // Johnny (25) and Sarah (35)
});

test("NULL checks", async () => {
  // Insert user with and without email
  await repo.insert("users", {
    name: "User With Email",
    email: "user@example.com",
    age: 30,
    created_at: new Date(),
  });
  
  await repo.insert("users", {
    name: "User Without Email", 
    email: null,
    age: 25,
    created_at: new Date(),
  });

  // Test IS NOT NULL
  const usersWithEmailQuery = from(UserSchema)
    .where(u => u.email.isNotNull());
  
  const usersWithEmailResult = await repo.all(usersWithEmailQuery);
  expect(usersWithEmailResult.success).toBe(true);
  if (!usersWithEmailResult.success) return;
  
  expect(usersWithEmailResult.data).toHaveLength(1);
  expect(usersWithEmailResult.data[0].name).toBe("User With Email");

  // Test IS NULL
  const usersWithoutEmailQuery = from(UserSchema)
    .where(u => u.email.isNull());
  
  const usersWithoutEmailResult = await repo.all(usersWithoutEmailQuery);
  expect(usersWithoutEmailResult.success).toBe(true);
  if (!usersWithoutEmailResult.success) return;
  
  expect(usersWithoutEmailResult.data).toHaveLength(1);
  expect(usersWithoutEmailResult.data[0].name).toBe("User Without Email");
});

test("update and delete operations", async () => {
  // Insert test user
  const insertResult = await repo.insert("users", {
    name: "Test User",
    email: "test@example.com",
    age: 30,
    created_at: new Date(),
  });
  
  expect(insertResult.success).toBe(true);
  if (!insertResult.success) return;
  
  const userId = insertResult.data.id;

  // Update user
  const updateResult = await repo.update("users", {
    name: "Updated User",
    age: 31,
  }, userId);
  
  expect(updateResult.success).toBe(true);
  if (!updateResult.success) return;
  
  expect(updateResult.data.name).toBe("Updated User");
  expect(updateResult.data.age).toBe(31);

  // Delete user
  const deleteResult = await repo.delete("users", userId);
  expect(deleteResult.success).toBe(true);
  if (!deleteResult.success) return;
  
  expect(deleteResult.data.name).toBe("Updated User");

  // Verify user is deleted
  const findUserQuery = from(UserSchema).where(u => u.id.eq(userId));
  const findUserResult = await repo.all(findUserQuery);
  expect(findUserResult.success).toBe(true);
  if (!findUserResult.success) return;
  
  expect(findUserResult.data).toHaveLength(0);
});

test("limit and offset", async () => {
  // Insert multiple users
  for (let i = 1; i <= 10; i++) {
    await repo.insert("users", {
      name: `User ${i}`,
      email: `user${i}@example.com`,
      age: 20 + i,
      created_at: new Date(),
    });
  }

  // Test limit
  const limitedQuery = from(UserSchema).limit(5);
  const limitedResult = await repo.all(limitedQuery);
  expect(limitedResult.success).toBe(true);
  if (!limitedResult.success) return;
  
  expect(limitedResult.data).toHaveLength(5);

  // Test offset
  const offsetQuery = from(UserSchema).limit(3).offset(5);
  const offsetResult = await repo.all(offsetQuery);
  expect(offsetResult.success).toBe(true);
  if (!offsetResult.success) return;
  
  expect(offsetResult.data).toHaveLength(3);
  // Note: Exact ordering depends on database, but we should get 3 records
});

test("complex queries with posts and users", async () => {
  // Insert test user
  const userResult = await repo.insert("users", {
    name: "Author User",
    email: "author@example.com",
    age: 30,
    created_at: new Date(),
  });
  
  expect(userResult.success).toBe(true);
  if (!userResult.success) return;
  
  const userId = userResult.data.id;

  // Insert posts
  await repo.insert("posts", {
    title: "First Post",
    content: "This is the first post",
    published: true,
    views: 100,
    user_id: userId,
  });

  await repo.insert("posts", {
    title: "Second Post", 
    content: "This is the second post",
    published: false,
    views: 50,
    user_id: userId,
  });

  await repo.insert("posts", {
    title: "Popular Post",
    content: "This is a popular post",
    published: true,
    views: 1000,
    user_id: userId,
  });

  // Query published posts
  const publishedPostsQuery = from(PostSchema)
    .where(p => p.published.eq(true));
  
  const publishedPostsResult = await repo.all(publishedPostsQuery);
  expect(publishedPostsResult.success).toBe(true);
  if (!publishedPostsResult.success) return;
  
  expect(publishedPostsResult.data).toHaveLength(2);

  // Query popular posts (views >= 500)
  const popularPostsQuery = from(PostSchema)
    .where(p => and(
      p.published.eq(true),
      p.views.gte(500)
    ));
  
  const popularPostsResult = await repo.all(popularPostsQuery);
  expect(popularPostsResult.success).toBe(true);
  if (!popularPostsResult.success) return;
  
  expect(popularPostsResult.data).toHaveLength(1);
  expect(popularPostsResult.data[0].title).toBe("Popular Post");
});