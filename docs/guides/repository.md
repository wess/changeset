# Repository Pattern Guide

The repository pattern in changeset provides a clean interface for database operations, separating query building from execution.

## Repository Basics

### Creating a Repository

```typescript
import { createSqliteRepo, createRepo } from "changeset";

// SQLite repository
const sqliteRepo = await createSqliteRepo("./database.db");

// PostgreSQL repository
const pgRepo = await createRepo({
  type: "postgresql",
  config: {
    database: "postgresql://user:password@localhost:5432/myapp",
    pool: {
      min: 2,
      max: 10
    }
  }
});

// Check connection
if (!pgRepo.success) {
  console.error("Failed to connect:", pgRepo.error);
  process.exit(1);
}

const repo = pgRepo.data;
```

### Repository Interface

```typescript
interface Repo {
  // Query operations
  all<T>(query: Query<T>): Promise<Result<T[]>>;
  one<T>(query: Query<T>): Promise<Result<T | null>>;
  one$<T>(query: Query<T>): Promise<Result<T>>;
  
  // CRUD operations
  insert<T>(table: string, data: Partial<T>): Promise<Result<T>>;
  insertAll<T>(table: string, data: Partial<T>[]): Promise<Result<T[]>>;
  update<T>(table: string, data: Partial<T>, id: any): Promise<Result<T>>;
  updateAll<T>(query: Query<T>, updates: Partial<T>): Promise<Result<{ count: number }>>;
  delete<T>(table: string, id: any): Promise<Result<T>>;
  deleteAll<T>(query: Query<T>): Promise<Result<{ count: number }>>;
  
  // Aggregations
  aggregate<T>(query: Query<T>, operation: string, field: string): Promise<Result<number>>;
  
  // Connection management
  close(): Promise<void>;
}
```

## Query Operations

### Fetching All Records

```typescript
import { from } from "changeset";
import { UserSchema } from "./schemas";

// Fetch all users
const allUsersResult = await repo.all(from(UserSchema));

if (allUsersResult.success) {
  console.log(`Found ${allUsersResult.data.length} users`);
  allUsersResult.data.forEach(user => {
    console.log(`- ${user.name} (${user.email})`);
  });
} else {
  console.error("Query failed:", allUsersResult.error);
}

// With conditions
const activeUsers = await repo.all(
  from(UserSchema).where(u => u.isActive.eq(true))
);
```

### Fetching Single Records

```typescript
// Fetch one record (returns null if not found)
const userResult = await repo.one(
  from(UserSchema).where(u => u.email.eq("alice@example.com"))
);

if (userResult.success) {
  if (userResult.data) {
    console.log("Found user:", userResult.data.name);
  } else {
    console.log("User not found");
  }
}

// Fetch one record (error if not found)
const userRequired = await repo.one$(
  from(UserSchema).where(u => u.id.eq(userId))
);

if (userRequired.success) {
  // TypeScript knows data is not null here
  console.log("User:", userRequired.data.name);
} else {
  // Handle not found error
  console.error("User not found:", userRequired.error);
}
```

## Insert Operations

### Single Insert

```typescript
// Insert a new user
const newUserResult = await repo.insert("users", {
  name: "Alice Johnson",
  email: "alice@example.com",
  age: 28,
  isActive: true,
  createdAt: new Date()
});

if (newUserResult.success) {
  console.log("Created user:", newUserResult.data);
  console.log("New user ID:", newUserResult.data.id);
} else {
  console.error("Insert failed:", newUserResult.error);
}
```

### Batch Insert

```typescript
// Insert multiple records
const users = [
  { name: "Bob", email: "bob@example.com", age: 30 },
  { name: "Carol", email: "carol@example.com", age: 25 },
  { name: "Dave", email: "dave@example.com", age: 35 }
];

const batchResult = await repo.insertAll("users", users);

if (batchResult.success) {
  console.log(`Inserted ${batchResult.data.length} users`);
  batchResult.data.forEach(user => {
    console.log(`- Created user ${user.name} with ID ${user.id}`);
  });
}
```

### Insert with Type Safety

```typescript
// TypeScript ensures type safety
type User = typeof UserSchema._type;

const newUser: Partial<User> = {
  name: "Eve",
  email: "eve@example.com",
  age: 29,
  // TypeScript will error if you add invalid fields
  // invalidField: "value"  // ❌ Type error!
};

const result = await repo.insert<User>("users", newUser);
```

## Update Operations

### Update by ID

```typescript
// Update a single record by ID
const updateResult = await repo.update("users", {
  age: 30,
  isActive: false,
  updatedAt: new Date()
}, userId);

if (updateResult.success) {
  console.log("Updated user:", updateResult.data);
} else {
  console.error("Update failed:", updateResult.error);
}
```

### Bulk Updates

```typescript
// Update multiple records matching a query
const deactivateResult = await repo.updateAll(
  from(UserSchema).where(u => u.lastLoginAt.lt(thirtyDaysAgo)),
  { isActive: false }
);

if (deactivateResult.success) {
  console.log(`Deactivated ${deactivateResult.data.count} inactive users`);
}

// Update with complex conditions
const promoteResult = await repo.updateAll(
  from(UserSchema).where(u => and(
    u.score.gte(1000),
    u.role.eq("member")
  )),
  { role: "premium" }
);
```

### Conditional Updates

```typescript
// Helper function for conditional updates
const updateUserStatus = async (
  userId: number, 
  status: string,
  reason?: string
) => {
  const updates: any = {
    status,
    updatedAt: new Date()
  };
  
  if (reason) {
    updates.statusReason = reason;
  }
  
  return repo.update("users", updates, userId);
};
```

## Delete Operations

### Delete by ID

```typescript
// Delete a single record
const deleteResult = await repo.delete("users", userId);

if (deleteResult.success) {
  console.log("Deleted user:", deleteResult.data);
  // The deleted record is returned
  console.log(`Removed ${deleteResult.data.name} from the system`);
}
```

### Bulk Deletes

```typescript
// Delete multiple records
const cleanupResult = await repo.deleteAll(
  from(UserSchema).where(u => u.status.eq("deleted"))
);

if (cleanupResult.success) {
  console.log(`Permanently deleted ${cleanupResult.data.count} users`);
}

// Delete with complex conditions
const purgeResult = await repo.deleteAll(
  from(PostSchema).where(p => and(
    p.status.eq("draft"),
    p.createdAt.lt(ninetyDaysAgo)
  ))
);
```

### Safe Deletes

```typescript
// Soft delete pattern
const softDelete = async (userId: number) => {
  return repo.update("users", {
    deletedAt: new Date(),
    isActive: false
  }, userId);
};

// Query excluding soft-deleted records
const activeOnly = from(UserSchema)
  .where(u => u.deletedAt.isNull());
```

## Aggregation Operations

### Count, Sum, Avg, Min, Max

```typescript
// Count records
const userCount = await repo.aggregate(
  from(UserSchema).where(u => u.isActive.eq(true)),
  "count",
  "*"
);

if (userCount.success) {
  console.log(`Active users: ${userCount.data}`);
}

// Sum values
const totalRevenue = await repo.aggregate(
  from(OrderSchema).where(o => o.status.eq("completed")),
  "sum",
  "amount"
);

// Average
const avgAge = await repo.aggregate(
  from(UserSchema),
  "avg",
  "age"
);

// Min/Max
const oldestUser = await repo.aggregate(
  from(UserSchema),
  "max",
  "age"
);
```

## Transaction Support

### Basic Transactions

```typescript
// Execute operations in a transaction
const transferFunds = async (fromId: number, toId: number, amount: number) => {
  // Note: Full transaction support coming in future versions
  // For now, use adapter-specific transaction methods
  
  const withdraw = await repo.update("accounts", {
    balance: { $dec: amount }  // Database-specific syntax
  }, fromId);
  
  if (!withdraw.success) {
    return withdraw;
  }
  
  const deposit = await repo.update("accounts", {
    balance: { $inc: amount }  // Database-specific syntax
  }, toId);
  
  return deposit;
};
```

## Error Handling

### Result Type Pattern

```typescript
// All operations return Result types
const handleUserCreation = async (userData: any) => {
  const result = await repo.insert("users", userData);
  
  if (result.success) {
    // Success path - TypeScript knows result.data exists
    console.log("User created:", result.data.id);
    await sendWelcomeEmail(result.data.email);
    return result.data;
  } else {
    // Error path - TypeScript knows result.error exists
    console.error("Failed to create user:", result.error.message);
    
    // Check error type
    if (result.error.name === "ValidationError") {
      // Handle validation error
      return { error: "Invalid user data" };
    } else if (result.error.name === "DatabaseError") {
      // Handle database error
      return { error: "Database unavailable" };
    }
    
    return { error: "Unknown error" };
  }
};
```

### Common Error Patterns

```typescript
// Handle not found
const getUser = async (userId: number) => {
  const result = await repo.one(
    from(UserSchema).where(u => u.id.eq(userId))
  );
  
  if (!result.success) {
    throw new Error("Database error");
  }
  
  if (!result.data) {
    throw new Error("User not found");
  }
  
  return result.data;
};

// Retry on failure
const retryOperation = async <T>(
  operation: () => Promise<Result<T>>,
  maxRetries = 3
): Promise<Result<T>> => {
  for (let i = 0; i < maxRetries; i++) {
    const result = await operation();
    if (result.success) {
      return result;
    }
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
  }
  
  return { success: false, error: new Error("Max retries exceeded") };
};
```

## Connection Management

### Closing Connections

```typescript
// Always close connections when done
const app = async () => {
  const repoResult = await createSqliteRepo("./app.db");
  if (!repoResult.success) {
    return;
  }
  
  const repo = repoResult.data;
  
  try {
    // Do work with repo
    await doApplicationWork(repo);
  } finally {
    // Always close
    await repo.close();
  }
};

// With process handlers
process.on("SIGINT", async () => {
  console.log("Closing database connection...");
  await repo.close();
  process.exit(0);
});
```

### Connection Pooling

```typescript
// PostgreSQL with connection pooling
const repo = await createRepo({
  type: "postgresql",
  config: {
    database: "postgresql://localhost/myapp",
    pool: {
      min: 2,              // Minimum connections
      max: 10,             // Maximum connections
      idleTimeoutMillis: 30000,  // Close idle connections after 30s
      connectionTimeoutMillis: 2000  // Fail if can't connect in 2s
    }
  }
});
```

## Repository Patterns

### Repository Factory

```typescript
// Create specialized repositories
const createUserRepository = (repo: Repo) => ({
  findById: (id: number) => 
    repo.one(from(UserSchema).where(u => u.id.eq(id))),
  
  findByEmail: (email: string) =>
    repo.one(from(UserSchema).where(u => u.email.eq(email))),
  
  findActive: () =>
    repo.all(from(UserSchema).where(u => u.isActive.eq(true))),
  
  create: (data: Partial<User>) =>
    repo.insert("users", data),
  
  updateStatus: (id: number, status: string) =>
    repo.update("users", { status, updatedAt: new Date() }, id),
  
  softDelete: (id: number) =>
    repo.update("users", { deletedAt: new Date() }, id)
});

// Usage
const userRepo = createUserRepository(repo);
const user = await userRepo.findByEmail("alice@example.com");
```

### Unit of Work Pattern

```typescript
// Group related operations
const createOrder = async (
  repo: Repo,
  userId: number,
  items: OrderItem[]
) => {
  // Create order
  const orderResult = await repo.insert("orders", {
    userId,
    status: "pending",
    total: calculateTotal(items),
    createdAt: new Date()
  });
  
  if (!orderResult.success) {
    return orderResult;
  }
  
  const orderId = orderResult.data.id;
  
  // Create order items
  const itemsData = items.map(item => ({
    orderId,
    productId: item.productId,
    quantity: item.quantity,
    price: item.price
  }));
  
  const itemsResult = await repo.insertAll("order_items", itemsData);
  
  if (!itemsResult.success) {
    // Rollback order
    await repo.delete("orders", orderId);
    return itemsResult;
  }
  
  return orderResult;
};
```

## Best Practices

### 1. Handle All Result Cases

```typescript
// ✅ Good: Handle both success and error
const result = await repo.all(query);
if (result.success) {
  processUsers(result.data);
} else {
  logError(result.error);
}

// ❌ Bad: Assuming success
const result = await repo.all(query);
processUsers(result.data);  // TypeScript error!
```

### 2. Use Type Parameters

```typescript
// ✅ Good: Specify types
const users = await repo.all<User>(from(UserSchema));
const newUser = await repo.insert<User>("users", userData);

// The types are usually inferred, but being explicit helps
```

### 3. Close Connections

```typescript
// ✅ Good: Always close when done
try {
  await doWork(repo);
} finally {
  await repo.close();
}
```

### 4. Create Domain-Specific Methods

```typescript
// ✅ Good: Encapsulate business logic
const userService = {
  async registerUser(email: string, password: string) {
    // Check if exists
    const existing = await repo.one(
      from(UserSchema).where(u => u.email.eq(email))
    );
    
    if (existing.success && existing.data) {
      return { success: false, error: "Email already registered" };
    }
    
    // Create user
    return repo.insert("users", {
      email,
      passwordHash: await hashPassword(password),
      createdAt: new Date()
    });
  }
};
```

## Next Steps

- [**Error Handling**](./error-handling.md) - Deep dive into Result types
- [**Database Adapters**](./adapters.md) - Database-specific features
- [**Transactions**](../advanced/transactions.md) - Transaction support
- [**Performance**](../advanced/performance.md) - Optimization tips

---

← [Query Building](./queries.md) | [Back to Documentation](../README.md) | [Error Handling](./error-handling.md) →