// Example of using the new adapter pattern for database connections

import { connect, sqlite, postgres, connectPostgres } from "../src/connection/adapters.ts";
import { createRepo } from "../src/repo/repo.ts";
import { createSchema, f } from "../src/schema/index.ts";

// Define a schema
const UserSchema = createSchema("User", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { null: false }),
  age: f.integer("age"),
});

// Example 1: Simple path-based connection
const db1 = connect(sqlite("./users.db"));

// Example 2: Configuration-based connection
const db2 = connect(sqlite({
  database: "./users-config.db",
  options: {
    create: true,
    readwrite: true,
    strict: true,
  },
}));

// Example 3: PostgreSQL connection with URL
const pgDb1 = connect(postgres("postgresql://user:pass@localhost/dbname"));

// Example 4: PostgreSQL connection with configuration
const pgDb2 = connect(postgres({
  host: "localhost",
  port: 5432,
  database: "myapp",
  user: "admin",
  password: "secret",
}));

// Example 5: Convenience function for PostgreSQL
const pgDb3 = connectPostgres("postgresql://user:pass@localhost/testdb");

async function demonstrateAdapterPattern() {
  try {
    // Connect to database
    const connectResult = await db1.connect();
    if (!connectResult.success) {
      console.error("Connection failed:", connectResult.error);
      return;
    }

    // Create a repository using the connected adapter
    const userRepo = createRepo(UserSchema, db1);

    // Create the users table
    db1.createTable?.("users", [
      "id TEXT PRIMARY KEY",
      "name TEXT NOT NULL",
      "email TEXT NOT NULL",
      "age INTEGER",
    ]);

    // Use the repository
    const newUser = await userRepo.create({
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      age: 30,
    });

    console.log("Created user:", newUser);

    const allUsers = await userRepo.all();
    console.log("All users:", allUsers);

    // Clean up
    await db1.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

// The new pattern provides a clean, composable API:
// - sqlite("path") for simple cases
// - sqlite({...}) for advanced configuration  
// - postgres("url") or postgres({...}) for PostgreSQL
// - connect() to create the adapter
// - Convenience functions: connectSqlite(), connectPostgres()
// - Future support for mysql(), etc.

export { demonstrateAdapterPattern };