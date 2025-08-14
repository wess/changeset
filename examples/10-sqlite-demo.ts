// SQLite integration demo - real database operations

import { schema, f, from, and, or, createSqliteRepo } from "../src/index.ts";
import { createSqliteAdapter } from "../src/connection/sqlite.ts";
import type { Database } from "bun:sqlite";

console.log("=== SQLite Integration Demo ===\n");

// Define schemas
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

async function demo() {
  console.log("1. Creating SQLite database connection...");
  
  // Create combined repo with table management - using same approach as integration tests
  const createSqliteRepoWithTableManagement = async (database: string) => {
    const { createRepoFunctions } = await import("../src/repo/repo.ts");
    const adapter = createSqliteAdapter({
      database,
      options: { create: true }
    });

    const connectResult = await adapter.connect();
    if (!connectResult.success) {
      throw new Error(`Failed to connect: ${connectResult.error}`);
    }

    const repo = createRepoFunctions(adapter);
    return {
      ...repo,
      createTable: (adapter as any).createTable,
      dropTable: (adapter as any).dropTable,
      tableExists: (adapter as any).tableExists,
      getRawDatabase: (adapter as any).getRawDatabase,
      disconnect: adapter.disconnect,
    };
  };
  
  const repo = await createSqliteRepoWithTableManagement(":memory:");

  console.log("2. Creating tables...");
  (repo as any).createTable("users", [
    "id INTEGER PRIMARY KEY AUTOINCREMENT",
    "name TEXT NOT NULL",
    "email TEXT UNIQUE",
    "age INTEGER",
    "active BOOLEAN DEFAULT 1",
    "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
  ]);

  (repo as any).createTable("posts", [
    "id INTEGER PRIMARY KEY AUTOINCREMENT", 
    "title TEXT NOT NULL",
    "content TEXT",
    "published BOOLEAN DEFAULT 0",
    "views INTEGER DEFAULT 0",
    "user_id INTEGER NOT NULL",
    "FOREIGN KEY (user_id) REFERENCES users (id)"
  ]);

  console.log("3. Inserting sample data...");
  
  // Insert users
  const user1 = await repo.insert("users", {
    name: "Alice Johnson",
    email: "alice@example.com",
    age: 28,
    active: true,
    created_at: new Date(),
  });

  const user2 = await repo.insert("users", {
    name: "Bob Smith",
    email: "bob@example.com", 
    age: 35,
    active: true,
    created_at: new Date(),
  });

  const user3 = await repo.insert("users", {
    name: "Charlie Brown",
    email: "charlie@example.com",
    age: 22,
    active: false,
    created_at: new Date(),
  });

  if (!user1.success || !user2.success || !user3.success) {
    console.error("Failed to insert users");
    return;
  }

  // Insert posts
  await repo.insert("posts", {
    title: "Getting Started with TypeScript",
    content: "TypeScript is a powerful superset of JavaScript...",
    published: true,
    views: 150,
    user_id: user1.data.id,
  });

  await repo.insert("posts", {
    title: "Advanced React Patterns",
    content: "Learn about advanced React patterns...",
    published: true,
    views: 89,
    user_id: user2.data.id,
  });

  await repo.insert("posts", {
    title: "Draft Article",
    content: "This is a draft article...",
    published: false,
    views: 0,
    user_id: user1.data.id,
  });

  console.log("4. Running queries with clean arrow function syntax...\n");

  // Query 1: All active users
  console.log("📋 Active users:");
  const activeUsersQuery = from(UserSchema)
    .where(u => u.active.eq(true));
  
  const activeUsers = await repo.all(activeUsersQuery);
  if (activeUsers.success) {
    activeUsers.data.forEach(user => {
      console.log(`   - ${user.name} (${user.age}) - ${user.email}`);
    });
  }
  console.log();

  // Query 2: Complex conditions with AND
  console.log("🔍 Young active users (age < 30):");
  const youngActiveQuery = from(UserSchema)
    .where(u => and(
      u.active.eq(true),
      u.age.lt(30)
    ));
  
  const youngActive = await repo.all(youngActiveQuery);
  if (youngActive.success) {
    youngActive.data.forEach(user => {
      console.log(`   - ${user.name} (${user.age})`);
    });
  }
  console.log();

  // Query 3: String operations
  console.log("📝 Users with 'alice' in email:");
  const aliceQuery = from(UserSchema)
    .where(u => u.email.like("%alice%"));
  
  const aliceUsers = await repo.all(aliceQuery);
  if (aliceUsers.success) {
    aliceUsers.data.forEach(user => {
      console.log(`   - ${user.name} - ${user.email}`);
    });
  }
  console.log();

  // Query 4: OR conditions
  console.log("👥 Users named Alice or Charlie:");
  const specificUsersQuery = from(UserSchema)
    .where(u => or(
      u.name.like("%Alice%"),
      u.name.like("%Charlie%")
    ));
  
  const specificUsers = await repo.all(specificUsersQuery);
  if (specificUsers.success) {
    specificUsers.data.forEach(user => {
      console.log(`   - ${user.name} (active: ${user.active})`);
    });
  }
  console.log();

  // Query 5: Published posts with high views
  console.log("🔥 Popular published posts (views > 100):");
  const popularPostsQuery = from(PostSchema)
    .where(p => and(
      p.published.eq(true),
      p.views.gt(100)
    ));
  
  const popularPosts = await repo.all(popularPostsQuery);
  if (popularPosts.success) {
    popularPosts.data.forEach(post => {
      console.log(`   - "${post.title}" (${post.views} views)`);
    });
  }
  console.log();

  // Query 6: Posts by specific authors
  console.log("✍️  Posts by Alice or Bob:");
  const authorPostsQuery = from(PostSchema)
    .where(p => p.user_id.in([user1.data.id, user2.data.id]));
  
  const authorPosts = await repo.all(authorPostsQuery);
  if (authorPosts.success) {
    authorPosts.data.forEach(post => {
      console.log(`   - "${post.title}" (published: ${post.published})`);
    });
  }
  console.log();

  // Demonstrate CRUD operations
  console.log("5. CRUD Operations...\n");

  // Update user
  console.log("📝 Updating Charlie's status to active:");
  const updateResult = await repo.update("users", {
    active: true
  }, user3.data.id);

  if (updateResult.success) {
    console.log(`   ✅ ${updateResult.data.name} is now active: ${updateResult.data.active}`);
  }
  console.log();

  // Count queries
  console.log("📊 Final counts:");
  
  const allUsersQuery = from(UserSchema);
  const allUsers = await repo.all(allUsersQuery);
  if (allUsers.success) {
    console.log(`   - Total users: ${allUsers.data.length}`);
  }

  const publishedPostsQuery = from(PostSchema)
    .where(p => p.published.eq(true));
  const publishedPosts = await repo.all(publishedPostsQuery);
  if (publishedPosts.success) {
    console.log(`   - Published posts: ${publishedPosts.data.length}`);
  }

  const activeUsersCount = await repo.all(from(UserSchema).where(u => u.active.eq(true)));
  if (activeUsersCount.success) {
    console.log(`   - Active users: ${activeUsersCount.data.length}`);
  }

  console.log("\n6. Closing database connection...");
  await (repo as any).disconnect();
  
  console.log("\n✅ SQLite integration demo completed successfully!");
  console.log("\nKey features demonstrated:");
  console.log("- 🔄 Real SQLite database operations");
  console.log("- 🎯 Clean arrow function syntax: u => u.name.eq('Alice')");
  console.log("- 🔗 Complex conditions with and() and or()");
  console.log("- 📝 String operations with like()");
  console.log("- 📊 IN queries and comparisons");
  console.log("- 💾 CRUD operations (Create, Read, Update)");
  console.log("- 🛡️  Type-safe queries with full IntelliSense");
  console.log("- 📅 Automatic Date object handling");
}

// Run the demo
demo().catch(console.error);