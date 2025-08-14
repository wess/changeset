# Quickstart Guide

Get up and running with changeset in 5 minutes! This guide will walk you through installation, basic setup, and your first queries.

## Installation

```bash
# Using Bun (recommended)
bun add changeset

# Using npm
npm install changeset

# Using yarn
yarn add changeset
```

## Your First Schema

Let's start by defining a simple user schema:

```typescript
import { schema, f } from "changeset";

// Define a User schema
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { unique: true }),
  age: f.integer("age"),
  active: f.boolean("active", { default: true }),
  createdAt: f.utcDateTime("created_at", { null: false })
});

// TypeScript automatically infers the User type
type User = typeof UserSchema._type;
// Result: { id: number, name: string, email: string, age: number | null, active: boolean, createdAt: Date }
```

## Setting Up the Database

### SQLite (Quick Start)

```typescript
import { createSqliteRepo } from "changeset";

// Create a repository connected to SQLite
const repo = await createSqliteRepo("./myapp.db");

// Check if connection succeeded
if (!repo.success) {
  console.error("Failed to connect:", repo.error);
  process.exit(1);
}

const db = repo.data;
```

### PostgreSQL

```typescript
import { createRepo } from "changeset";

const repo = await createRepo({
  type: "postgresql",
  config: {
    database: "postgresql://user:password@localhost:5432/myapp"
  }
});

if (!repo.success) {
  console.error("Failed to connect:", repo.error);
  process.exit(1);
}

const db = repo.data;
```

## Building Queries

changeset provides an intuitive query builder with full type safety:

```typescript
import { from, and, or } from "changeset";

// Simple query
const allUsers = from(UserSchema);

// Add conditions
const activeUsers = from(UserSchema)
  .where(u => u.active.eq(true));

// Chain multiple conditions
const adultActiveUsers = from(UserSchema)
  .where(u => u.age.gte(18))
  .where(u => u.active.eq(true))
  .orderBy(u => u.name)
  .limit(10);

// Complex conditions with AND/OR
const complexQuery = from(UserSchema)
  .where(u => and(
    u.active.eq(true),
    or(
      u.age.lt(18),
      u.age.gte(65)
    )
  ));
```

## Executing Queries

All database operations return Result types for explicit error handling:

```typescript
// Fetch all records
const result = await db.all(activeUsers);

if (result.success) {
  console.log("Found users:", result.data);
  result.data.forEach(user => {
    console.log(`${user.name} (${user.email})`);
  });
} else {
  console.error("Query failed:", result.error);
}

// Fetch single record
const oneResult = await db.one(
  from(UserSchema).where(u => u.email.eq("john@example.com"))
);

if (oneResult.success) {
  if (oneResult.data) {
    console.log("Found user:", oneResult.data.name);
  } else {
    console.log("User not found");
  }
}
```

## CRUD Operations

### Insert

```typescript
const newUser = await db.insert("users", {
  name: "Alice Johnson",
  email: "alice@example.com",
  age: 28,
  active: true,
  createdAt: new Date()
});

if (newUser.success) {
  console.log("Created user with ID:", newUser.data.id);
}
```

### Update

```typescript
const updated = await db.update("users", {
  age: 29,
  active: false
}, userId); // Update by ID

if (updated.success) {
  console.log("Updated user:", updated.data);
}
```

### Delete

```typescript
const deleted = await db.delete("users", userId);

if (deleted.success) {
  console.log("Deleted user:", deleted.data);
}
```

## Query Operators

changeset provides a rich set of operators for building queries:

```typescript
// Comparison operators
.where(u => u.age.eq(25))        // equals
.where(u => u.age.neq(25))       // not equals
.where(u => u.age.gt(18))        // greater than
.where(u => u.age.gte(18))       // greater than or equal
.where(u => u.age.lt(65))        // less than
.where(u => u.age.lte(65))       // less than or equal

// String operators
.where(u => u.name.like("%john%"))   // SQL LIKE
.where(u => u.name.ilike("%JOHN%"))  // Case insensitive LIKE

// List operators
.where(u => u.status.in(["active", "pending"]))
.where(u => u.status.notIn(["deleted", "banned"]))

// Null checks
.where(u => u.deletedAt.isNull())
.where(u => u.email.isNotNull())
```

## Complete Example

Here's a complete example putting it all together:

```typescript
import { schema, f, from, and, createSqliteRepo } from "changeset";

// Define schemas
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { unique: true }),
  age: f.integer("age"),
  active: f.boolean("active", { default: true })
});

async function main() {
  // Connect to database
  const repoResult = await createSqliteRepo("./app.db");
  if (!repoResult.success) {
    console.error("Database connection failed");
    return;
  }
  
  const db = repoResult.data;
  
  // Insert some users
  await db.insert("users", {
    name: "Alice",
    email: "alice@example.com",
    age: 28,
    active: true
  });
  
  await db.insert("users", {
    name: "Bob",
    email: "bob@example.com",
    age: 35,
    active: false
  });
  
  // Query active adults
  const activeAdults = from(UserSchema)
    .where(u => and(
      u.age.gte(18),
      u.active.eq(true)
    ))
    .orderBy(u => u.name);
  
  const result = await db.all(activeAdults);
  
  if (result.success) {
    console.log(`Found ${result.data.length} active adults`);
    result.data.forEach(user => {
      console.log(`- ${user.name} (${user.age} years old)`);
    });
  }
  
  // Clean up
  await db.close();
}

main().catch(console.error);
```

## Next Steps

Now that you have the basics down, explore:

- [**Core Concepts**](./core-concepts.md) - Understand the library's architecture
- [**Schema Definition Guide**](./guides/schemas.md) - Advanced schema features
- [**Query Building Guide**](./guides/queries.md) - Complex query patterns
- [**Error Handling**](./guides/error-handling.md) - Working with Result types

---

← [Back to Documentation](./README.md) | [Core Concepts](./core-concepts.md) →