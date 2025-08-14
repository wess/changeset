# Migrations

Database migrations in changeset provide version control for your database schema.

## Overview

Migrations allow you to:
- Track database schema changes over time
- Apply changes consistently across environments
- Roll back changes when needed
- Collaborate with team members on schema evolution

## Migration Structure

### Basic Migration Format

```typescript
// migrations/20240101120000_create_users_table.ts
import { Migration } from "changeset";

export const up: Migration = async (db) => {
  await db.execute(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await db.execute(`
    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_username ON users(username);
  `);
};

export const down: Migration = async (db) => {
  await db.execute(`DROP TABLE IF EXISTS users`);
};
```

### Migration with Schema

```typescript
// migrations/20240102100000_create_posts_table.ts
import { Migration } from "changeset";
import { PostSchema } from "../src/schemas/post";

export const up: Migration = async (db) => {
  // Generate SQL from schema definition
  const sql = generateCreateTableSql(PostSchema);
  await db.execute(sql);
  
  // Add indexes
  await db.execute(`
    CREATE INDEX idx_posts_author_id ON posts(author_id);
    CREATE INDEX idx_posts_published_at ON posts(published_at);
    CREATE INDEX idx_posts_status ON posts(status);
  `);
};

export const down: Migration = async (db) => {
  await db.execute(`DROP TABLE IF EXISTS posts`);
};
```

## Migration Commands

### Creating Migrations

```bash
# Generate a new migration file
bun run migrate:create create_users_table

# Generate migration from schema changes
bun run migrate:generate
```

### Running Migrations

```bash
# Run all pending migrations
bun run migrate:up

# Run specific number of migrations
bun run migrate:up --step 1

# Rollback last migration
bun run migrate:down

# Rollback specific number
bun run migrate:down --step 2

# Check migration status
bun run migrate:status
```

## Migration Types

### Schema Migrations

```typescript
// Create table
export const up: Migration = async (db) => {
  await db.execute(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      in_stock BOOLEAN DEFAULT true
    )
  `);
};
```

### Data Migrations

```typescript
// Migrate existing data
export const up: Migration = async (db) => {
  // Add new column
  await db.execute(`
    ALTER TABLE users 
    ADD COLUMN display_name VARCHAR(255)
  `);
  
  // Populate from existing data
  await db.execute(`
    UPDATE users 
    SET display_name = username 
    WHERE display_name IS NULL
  `);
};
```

### Index Migrations

```typescript
export const up: Migration = async (db) => {
  // Add composite index
  await db.execute(`
    CREATE INDEX idx_orders_user_status 
    ON orders(user_id, status)
  `);
  
  // Add unique constraint
  await db.execute(`
    CREATE UNIQUE INDEX idx_users_email_lower 
    ON users(LOWER(email))
  `);
};
```

## Database-Specific Features

### PostgreSQL

```typescript
// PostgreSQL-specific features
export const up: Migration = async (db) => {
  // UUID support
  await db.execute(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  
  // JSONB columns
  await db.execute(`
    ALTER TABLE products 
    ADD COLUMN metadata JSONB DEFAULT '{}'
  `);
  
  // Array columns
  await db.execute(`
    ALTER TABLE posts 
    ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[]
  `);
  
  // Full-text search
  await db.execute(`
    ALTER TABLE posts 
    ADD COLUMN search_vector tsvector;
    
    CREATE INDEX idx_posts_search 
    ON posts USING GIN(search_vector);
  `);
};
```

### SQLite

```typescript
// SQLite-specific features
export const up: Migration = async (db) => {
  // Enable foreign keys
  await db.execute(`PRAGMA foreign_keys = ON`);
  
  // JSON support (SQLite 3.38+)
  await db.execute(`
    ALTER TABLE products 
    ADD COLUMN metadata TEXT DEFAULT '{}'
  `);
  
  // Virtual columns
  await db.execute(`
    ALTER TABLE users 
    ADD COLUMN full_name TEXT GENERATED ALWAYS AS 
    (first_name || ' ' || last_name) VIRTUAL
  `);
};
```

## Migration Best Practices

### 1. Atomic Migrations

```typescript
// ✅ Good: Single concern
export const up: Migration = async (db) => {
  await db.execute(`
    ALTER TABLE users 
    ADD COLUMN last_login_at TIMESTAMP
  `);
};

// ❌ Bad: Multiple unrelated changes
export const up: Migration = async (db) => {
  await db.execute(`ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP`);
  await db.execute(`CREATE TABLE products (...)`);
  await db.execute(`ALTER TABLE orders ADD COLUMN discount DECIMAL`);
};
```

### 2. Reversible Migrations

```typescript
// ✅ Good: Fully reversible
export const up: Migration = async (db) => {
  await db.execute(`ALTER TABLE users ADD COLUMN age INTEGER`);
};

export const down: Migration = async (db) => {
  await db.execute(`ALTER TABLE users DROP COLUMN age`);
};

// ❌ Bad: Data loss in rollback
export const down: Migration = async (db) => {
  await db.execute(`DROP TABLE users`); // Loses all data!
};
```

### 3. Safe Column Operations

```typescript
// Safe column addition with default
export const up: Migration = async (db) => {
  // Add nullable column first
  await db.execute(`
    ALTER TABLE users 
    ADD COLUMN status VARCHAR(50)
  `);
  
  // Populate with default values
  await db.execute(`
    UPDATE users 
    SET status = 'active' 
    WHERE status IS NULL
  `);
  
  // Then add NOT NULL constraint
  await db.execute(`
    ALTER TABLE users 
    ALTER COLUMN status SET NOT NULL
  `);
};
```

### 4. Transaction Safety

```typescript
export const up: Migration = async (db) => {
  await db.transaction(async (tx) => {
    await tx.execute(`ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0`);
    await tx.execute(`UPDATE users SET points = 100 WHERE created_at < '2024-01-01'`);
    await tx.execute(`CREATE INDEX idx_users_points ON users(points)`);
  });
};
```

## Migration Configuration

### Config File

```typescript
// migrate.config.ts
export default {
  // Directory containing migration files
  migrationsDir: './migrations',
  
  // Table to track applied migrations
  migrationsTable: '_migrations',
  
  // Database connection
  database: {
    type: 'postgresql',
    url: process.env.DATABASE_URL
  },
  
  // Migration options
  options: {
    // Run in transaction by default
    transaction: true,
    
    // Lock timeout for migrations
    lockTimeout: 10000,
    
    // Schema to use (PostgreSQL)
    schema: 'public'
  }
};
```

## Advanced Patterns

### Conditional Migrations

```typescript
export const up: Migration = async (db) => {
  // Check if column exists
  const hasColumn = await db.query(`
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'avatar'
  `);
  
  if (!hasColumn.rows.length) {
    await db.execute(`
      ALTER TABLE users 
      ADD COLUMN avatar VARCHAR(500)
    `);
  }
};
```

### Batch Operations

```typescript
export const up: Migration = async (db) => {
  // Process in batches for large tables
  const batchSize = 1000;
  let offset = 0;
  
  while (true) {
    const result = await db.execute(`
      UPDATE users 
      SET normalized_email = LOWER(email)
      WHERE id IN (
        SELECT id FROM users 
        WHERE normalized_email IS NULL 
        LIMIT ${batchSize} 
        OFFSET ${offset}
      )
    `);
    
    if (result.rowCount < batchSize) break;
    offset += batchSize;
  }
};
```

### Schema Versioning

```typescript
export const up: Migration = async (db) => {
  // Add version column for schema evolution
  await db.execute(`
    ALTER TABLE users 
    ADD COLUMN schema_version INTEGER DEFAULT 1
  `);
  
  // Track migration in metadata
  await db.execute(`
    INSERT INTO schema_metadata (table_name, version, migrated_at)
    VALUES ('users', 1, NOW())
  `);
};
```

## Testing Migrations

```typescript
// tests/migrations.test.ts
import { test, expect } from "bun:test";
import { runMigration, rollbackMigration } from "../migrate";

test("user migration creates table correctly", async () => {
  // Run migration
  await runMigration("20240101120000_create_users_table");
  
  // Verify table exists
  const tables = await db.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name = 'users'
  `);
  
  expect(tables.rows).toHaveLength(1);
  
  // Verify columns
  const columns = await db.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'users'
  `);
  
  expect(columns.rows.map(r => r.column_name)).toContain("email");
  
  // Test rollback
  await rollbackMigration("20240101120000_create_users_table");
  
  const tablesAfter = await db.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name = 'users'
  `);
  
  expect(tablesAfter.rows).toHaveLength(0);
});
```

## Migration Tools

### CLI Commands

```bash
# Create migration
bun run migrate:create <name>

# Run migrations
bun run migrate:up
bun run migrate:up --to 20240102100000
bun run migrate:up --step 1

# Rollback
bun run migrate:down
bun run migrate:down --to 20240101000000
bun run migrate:down --step 1

# Status
bun run migrate:status
bun run migrate:pending

# Reset
bun run migrate:reset  # Rollback all
bun run migrate:fresh  # Drop all tables and re-run
```

## Next Steps

- [Associations](./associations.md) - Define relationships
- [Transactions](./transactions.md) - Ensure data consistency
- [Performance](./performance.md) - Optimize migrations
- [Custom Adapters](./custom-adapters.md) - Database-specific migrations

---

← [Back to Documentation](../README.md) | [Associations](./associations.md) →