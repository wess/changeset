// Example of using multiple database adapters in the same application

import { connect, sqlite, postgres, connectSqlite, connectPostgres } from "../src/connection/adapters.ts";
import { createRepo } from "../src/repo/repo.ts";
import { createSchema, f } from "../src/schema/index.ts";
import { from } from "../src/query/index.ts";

// Shared schema that works with both SQLite and PostgreSQL
const UserSchema = createSchema("User", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { null: false }),
  age: f.integer("age"),
  active: f.boolean("active", { default: true }),
  createdAt: f.utcDateTime("created_at", { null: false }),
});

async function demonstrateMultiDatabase() {
  console.log("🗄️  Demonstrating Multi-Database Support");
  
  // Set up adapters for different databases
  const sqliteDb = connectSqlite("./multi-demo.db");
  
  // PostgreSQL connection (optional - skipped if not available)
  const postgresUrl = process.env.POSTGRES_URL;
  const postgresDb = postgresUrl ? connectPostgres(postgresUrl) : null;

  try {
    console.log("\\n1. Connecting to databases:");
    
    // Connect to SQLite
    const sqliteResult = await sqliteDb.connect();
    if (!sqliteResult.success) {
      console.error("❌ SQLite connection failed:", sqliteResult.error);
      return;
    }
    console.log("✅ Connected to SQLite");
    
    // Connect to PostgreSQL (if available)
    let postgresConnected = false;
    if (postgresDb) {
      const postgresResult = await postgresDb.connect();
      if (postgresResult.success) {
        console.log("✅ Connected to PostgreSQL");
        postgresConnected = true;
      } else {
        console.log("⚠️  PostgreSQL not available, using SQLite only");
      }
    } else {
      console.log("⚠️  No POSTGRES_URL provided, using SQLite only");
    }

    console.log("\\n2. Creating repositories for each database:");
    
    // Create repositories
    const sqliteUserRepo = createRepo(UserSchema, sqliteDb);
    const postgresUserRepo = postgresConnected && postgresDb ? createRepo(UserSchema, postgresDb) : null;
    
    console.log("✅ Created SQLite repository");
    if (postgresUserRepo) {
      console.log("✅ Created PostgreSQL repository");
    }

    console.log("\\n3. Setting up tables with database-specific optimizations:");
    
    // Create SQLite table
    await sqliteDb.createTable("users", [
      "id TEXT PRIMARY KEY",
      "name TEXT NOT NULL",
      "email TEXT UNIQUE NOT NULL",
      "age INTEGER",
      "active BOOLEAN DEFAULT 1",
      "created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
    ]);
    console.log("✅ Created SQLite users table");
    
    // Create PostgreSQL table (if available)
    if (postgresConnected && postgresDb) {
      await postgresDb.createTable("users", [
        "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
        "name VARCHAR(255) NOT NULL",
        "email VARCHAR(255) UNIQUE NOT NULL",
        "age INTEGER",
        "active BOOLEAN DEFAULT true",
        "created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
      ]);
      console.log("✅ Created PostgreSQL users table with UUID and timezone support");
    }

    console.log("\\n4. Inserting data using repository pattern:");
    
    // Sample users
    const users = [
      { id: "1", name: "Alice Smith", email: "alice@example.com", age: 28, active: true },
      { id: "2", name: "Bob Johnson", email: "bob@example.com", age: 34, active: true },
      { id: "3", name: "Charlie Brown", email: "charlie@example.com", age: 22, active: false },
    ];
    
    // Insert into SQLite
    for (const user of users) {
      await sqliteUserRepo.insert("users", {
        ...user,
        createdAt: new Date().toISOString(),
      });
    }
    console.log("✅ Inserted users into SQLite");
    
    // Insert into PostgreSQL (if available)
    if (postgresUserRepo) {
      for (const user of users) {
        await postgresUserRepo.insert("users", {
          ...user,
          id: undefined, // Let PostgreSQL generate UUID
          createdAt: new Date(),
        });
      }
      console.log("✅ Inserted users into PostgreSQL");
    }

    console.log("\\n5. Querying with the same API across different databases:");
    
    // Query active users from SQLite
    const sqliteActiveUsers = await sqliteUserRepo.all(
      from(UserSchema)
        .where((u) => u.active.eq(true))
        .orderBy("name")
    );
    console.log("✅ SQLite active users:", sqliteActiveUsers.data?.length);
    
    // Query active users from PostgreSQL (if available)
    if (postgresUserRepo) {
      const postgresActiveUsers = await postgresUserRepo.all(
        from(UserSchema)
          .where((u) => u.active.eq(true))
          .orderBy("name")
      );
      console.log("✅ PostgreSQL active users:", postgresActiveUsers.data?.length);
    }

    console.log("\\n6. Demonstrating database-specific features:");
    
    // SQLite-specific features
    console.log("SQLite-specific operations:");
    const sqliteDb_raw = sqliteDb.getRawDatabase();
    const sqliteVersion = sqliteDb_raw.query("SELECT sqlite_version() as version").get();
    console.log("  - SQLite version:", sqliteVersion?.version);
    
    // Vacuum SQLite database
    await sqliteDb.vacuum();
    console.log("  - ✅ Vacuumed SQLite database");
    
    // PostgreSQL-specific features (if available)
    if (postgresConnected && postgresDb) {
      console.log("PostgreSQL-specific operations:");
      
      // Use raw pool for PostgreSQL-specific query
      const pool = postgresDb.getRawDatabase();
      const pgVersion = await pool.query("SELECT version() as version");
      console.log("  - PostgreSQL version:", pgVersion.rows[0]?.version?.substring(0, 50) + "...");
      
      // Analyze PostgreSQL database
      await postgresDb.analyze();
      console.log("  - ✅ Analyzed PostgreSQL database");
      
      // Demonstrate JSONB (PostgreSQL-specific)
      await pool.query(`
        UPDATE users 
        SET name = 'Alice Smith (Updated)'
        WHERE email = 'alice@example.com'
      `);
      console.log("  - ✅ Updated user with PostgreSQL-specific syntax");
    }

    console.log("\\n7. Transaction example across databases:");
    
    // SQLite transaction
    const sqliteTransactionResult = await sqliteDb.transaction(async () => {
      await sqliteDb.execute({
        sql: "UPDATE users SET age = age + 1 WHERE active = ?",
        params: [true],
      });
      return "SQLite transaction completed";
    });
    console.log("✅", sqliteTransactionResult.data);
    
    // PostgreSQL transaction (if available)
    if (postgresConnected && postgresDb) {
      const postgresTransactionResult = await postgresDb.transaction(async () => {
        await postgresDb.execute({
          sql: "UPDATE users SET age = age + 1 WHERE active = $1",
          params: [true],
        });
        return "PostgreSQL transaction completed";
      });
      console.log("✅", postgresTransactionResult.data);
    }

    console.log("\\n8. Comparing adapter capabilities:");
    
    const capabilities = {
      sqlite: {
        native: "Bun's built-in SQLite support",
        parameters: "? placeholders",
        types: "TEXT, INTEGER, REAL, BLOB",
        features: ["WAL mode", "Foreign keys", "Vacuum"],
        performance: "Excellent for embedded/local apps",
      },
      postgresql: {
        native: "pg package (Node.js compatible)",
        parameters: "$1, $2, $3 placeholders",
        types: "VARCHAR, INTEGER, JSONB, UUID, TIMESTAMP WITH TIME ZONE",
        features: ["Connection pooling", "Advanced types", "Complex queries"],
        performance: "Excellent for server/cloud apps",
      },
    };
    
    console.log("Database capabilities comparison:");
    console.log("  SQLite:", capabilities.sqlite);
    if (postgresConnected) {
      console.log("  PostgreSQL:", capabilities.postgresql);
    }

    console.log("\\n9. Unified repository API benefits:");
    console.log("✅ Same query DSL works across all databases");
    console.log("✅ Same Result<T> error handling pattern");
    console.log("✅ Same functional programming approach");
    console.log("✅ Same transaction and connection management");
    console.log("✅ Database-specific optimizations when needed");

    // Cleanup
    console.log("\\n10. Cleanup:");
    await sqliteDb.dropTable("users");
    console.log("✅ Cleaned up SQLite tables");
    
    if (postgresConnected && postgresDb) {
      await postgresDb.dropTable("users");
      console.log("✅ Cleaned up PostgreSQL tables");
    }

    // Disconnect
    await sqliteDb.disconnect();
    console.log("✅ Disconnected from SQLite");
    
    if (postgresConnected && postgresDb) {
      await postgresDb.disconnect();
      console.log("✅ Disconnected from PostgreSQL");
    }

    console.log("\\n🎉 Multi-database demonstration completed!");

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Cleanup function
async function cleanup() {
  try {
    const { unlink } = await import("node:fs/promises");
    await unlink("./multi-demo.db");
  } catch {
    // Ignore cleanup errors
  }
}

export { demonstrateMultiDatabase, cleanup };

// Run the example if this file is executed directly
if (import.meta.main) {
  demonstrateMultiDatabase().finally(cleanup);
}