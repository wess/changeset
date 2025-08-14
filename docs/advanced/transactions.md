# Transactions

Ensure data consistency and atomicity in your database operations with transactions.

## Overview

Transactions provide:
- **Atomicity** - All operations succeed or all fail
- **Consistency** - Data remains valid after transaction
- **Isolation** - Concurrent transactions don't interfere
- **Durability** - Committed changes persist

## Basic Transactions

### Simple Transaction

```typescript
import { from, createRepo } from "changeset";

const repo = await createRepo(config);

// Execute in transaction
const result = await repo.transaction(async (tx) => {
  // All operations use the transaction connection
  const user = await tx.insert("users", {
    email: "john@example.com",
    name: "John Doe"
  });
  
  if (!user.success) {
    throw new Error("Failed to create user");
  }
  
  const profile = await tx.insert("profiles", {
    userId: user.data.id,
    bio: "Software developer"
  });
  
  if (!profile.success) {
    throw new Error("Failed to create profile");
  }
  
  // Return the final result
  return {
    user: user.data,
    profile: profile.data
  };
});

if (result.success) {
  console.log("Transaction completed:", result.data);
} else {
  console.log("Transaction failed:", result.error);
}
```

### Automatic Rollback

```typescript
// Transaction automatically rolls back on error
const result = await repo.transaction(async (tx) => {
  await tx.insert("accounts", {
    balance: 1000
  });
  
  // This throws an error
  throw new Error("Something went wrong");
  
  // This never executes
  await tx.insert("transactions", {
    amount: 100
  });
});

// result.success === false
// No data was inserted
```

## Transaction Patterns

### Transfer Pattern

```typescript
const transferFunds = async (
  repo: Repo,
  fromAccountId: number,
  toAccountId: number,
  amount: number
) => {
  return await repo.transaction(async (tx) => {
    // Lock and read source account
    const source = await tx.one(
      from(AccountSchema)
        .where(a => a.id.eq(fromAccountId))
        .forUpdate() // Lock row
    );
    
    if (!source.success || !source.data) {
      throw new Error("Source account not found");
    }
    
    if (source.data.balance < amount) {
      throw new Error("Insufficient funds");
    }
    
    // Lock and read destination account
    const dest = await tx.one(
      from(AccountSchema)
        .where(a => a.id.eq(toAccountId))
        .forUpdate()
    );
    
    if (!dest.success || !dest.data) {
      throw new Error("Destination account not found");
    }
    
    // Update balances
    await tx.update("accounts", {
      balance: source.data.balance - amount
    }, fromAccountId);
    
    await tx.update("accounts", {
      balance: dest.data.balance + amount
    }, toAccountId);
    
    // Record transaction
    const record = await tx.insert("transactions", {
      fromAccountId,
      toAccountId,
      amount,
      type: "transfer",
      createdAt: new Date()
    });
    
    return record.data;
  });
};
```

### Batch Insert Pattern

```typescript
const batchImport = async (repo: Repo, records: any[]) => {
  return await repo.transaction(async (tx) => {
    const results = [];
    const errors = [];
    
    for (const [index, record] of records.entries()) {
      try {
        // Validate record
        if (!record.email) {
          errors.push({ index, error: "Missing email" });
          continue;
        }
        
        // Check for duplicates
        const existing = await tx.one(
          from(UserSchema).where(u => u.email.eq(record.email))
        );
        
        if (existing.success && existing.data) {
          errors.push({ index, error: "Duplicate email" });
          continue;
        }
        
        // Insert record
        const result = await tx.insert("users", record);
        if (result.success) {
          results.push(result.data);
        } else {
          errors.push({ index, error: result.error.message });
        }
      } catch (error) {
        errors.push({ index, error: error.message });
      }
    }
    
    // Rollback if too many errors
    if (errors.length > records.length * 0.1) { // > 10% error rate
      throw new Error(`Too many errors: ${errors.length}/${records.length}`);
    }
    
    return { imported: results, errors };
  });
};
```

### Saga Pattern

```typescript
// Multi-step transaction with compensations
const createOrder = async (repo: Repo, orderData: any) => {
  const compensations: Array<() => Promise<void>> = [];
  
  try {
    // Step 1: Reserve inventory
    const reservation = await repo.transaction(async (tx) => {
      for (const item of orderData.items) {
        const product = await tx.one(
          from(ProductSchema)
            .where(p => p.id.eq(item.productId))
            .forUpdate()
        );
        
        if (product.data.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.data.name}`);
        }
        
        await tx.update("products", {
          stock: product.data.stock - item.quantity
        }, item.productId);
      }
      
      return { reservationId: Date.now() };
    });
    
    // Add compensation
    compensations.push(async () => {
      // Restore inventory
      await repo.transaction(async (tx) => {
        for (const item of orderData.items) {
          await tx.execute(`
            UPDATE products 
            SET stock = stock + ? 
            WHERE id = ?
          `, [item.quantity, item.productId]);
        }
      });
    });
    
    // Step 2: Process payment
    const payment = await processPayment(orderData.payment);
    
    // Add compensation
    compensations.push(async () => {
      await refundPayment(payment.id);
    });
    
    // Step 3: Create order
    const order = await repo.transaction(async (tx) => {
      const orderResult = await tx.insert("orders", {
        ...orderData,
        status: "confirmed",
        paymentId: payment.id
      });
      
      // Insert order items
      for (const item of orderData.items) {
        await tx.insert("order_items", {
          orderId: orderResult.data.id,
          ...item
        });
      }
      
      return orderResult.data;
    });
    
    return { success: true, data: order };
    
  } catch (error) {
    // Run compensations in reverse order
    for (const compensate of compensations.reverse()) {
      try {
        await compensate();
      } catch (compError) {
        console.error("Compensation failed:", compError);
      }
    }
    
    return { success: false, error };
  }
};
```

## Isolation Levels

### Setting Isolation Level

```typescript
// PostgreSQL isolation levels
const result = await repo.transaction(async (tx) => {
  // Operations here
}, {
  isolationLevel: "REPEATABLE READ"
  // Options: READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE
});

// SQLite isolation levels
const result = await repo.transaction(async (tx) => {
  // SQLite supports DEFERRED, IMMEDIATE, EXCLUSIVE
}, {
  isolationLevel: "IMMEDIATE"
});
```

### Handling Serialization Failures

```typescript
const retryTransaction = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check for serialization failure (PostgreSQL)
      if (error.code === "40001" || error.code === "40P01") {
        // Wait with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 100)
        );
        continue;
      }
      
      // Non-retryable error
      throw error;
    }
  }
  
  throw lastError;
};

// Usage
const result = await retryTransaction(() => 
  repo.transaction(async (tx) => {
    // Transaction logic
  }, {
    isolationLevel: "SERIALIZABLE"
  })
);
```

## Savepoints

### Nested Transactions with Savepoints

```typescript
const complexOperation = async (repo: Repo) => {
  return await repo.transaction(async (tx) => {
    // Main transaction
    const user = await tx.insert("users", userData);
    
    // Create savepoint
    await tx.savepoint("sp1", async (sp) => {
      try {
        // Try risky operation
        await sp.insert("activities", {
          userId: user.data.id,
          action: "signup"
        });
        
        // Another risky operation
        await sp.update("stats", {
          signups: { increment: 1 }
        });
      } catch (error) {
        // Rollback to savepoint, main transaction continues
        console.log("Activity logging failed, continuing...");
        throw error; // Rollback savepoint
      }
    });
    
    // Continue with main transaction
    await tx.insert("profiles", {
      userId: user.data.id
    });
    
    return user.data;
  });
};
```

### Manual Savepoint Management

```typescript
const manualSavepoints = async (repo: Repo) => {
  return await repo.transaction(async (tx) => {
    // Create savepoint
    await tx.execute("SAVEPOINT my_savepoint");
    
    try {
      // Risky operations
      await tx.insert("logs", logData);
      
      // Release savepoint on success
      await tx.execute("RELEASE SAVEPOINT my_savepoint");
    } catch (error) {
      // Rollback to savepoint
      await tx.execute("ROLLBACK TO SAVEPOINT my_savepoint");
      
      // Continue transaction
    }
    
    // Rest of transaction
    return result;
  });
};
```

## Locking Strategies

### Row-Level Locking

```typescript
// Pessimistic locking - FOR UPDATE
const updateWithLock = async (repo: Repo, userId: number) => {
  return await repo.transaction(async (tx) => {
    // Lock row for update
    const user = await tx.one(
      from(UserSchema)
        .where(u => u.id.eq(userId))
        .forUpdate()
    );
    
    // Row is locked until transaction completes
    await tx.update("users", {
      lastActiveAt: new Date()
    }, userId);
    
    return user.data;
  });
};

// FOR SHARE - allows reads but prevents updates
const readWithSharedLock = async (repo: Repo) => {
  return await repo.transaction(async (tx) => {
    const accounts = await tx.all(
      from(AccountSchema)
        .where(a => a.type.eq("checking"))
        .forShare()
    );
    
    // Calculate total while preventing updates
    const total = accounts.data.reduce(
      (sum, acc) => sum + acc.balance,
      0
    );
    
    return total;
  });
};
```

### Skip Locked

```typescript
// Process queue with SKIP LOCKED
const processNextJob = async (repo: Repo) => {
  return await repo.transaction(async (tx) => {
    // Get next available job, skip locked ones
    const job = await tx.one(
      from(JobSchema)
        .where(j => j.status.eq("pending"))
        .orderBy(j => j.priority, "DESC")
        .limit(1)
        .forUpdate()
        .skipLocked()
    );
    
    if (!job.success || !job.data) {
      return null; // No jobs available
    }
    
    // Mark as processing
    await tx.update("jobs", {
      status: "processing",
      startedAt: new Date()
    }, job.data.id);
    
    return job.data;
  });
};
```

### Advisory Locking

```typescript
// PostgreSQL advisory locks
const withAdvisoryLock = async (
  repo: Repo,
  lockId: number,
  fn: () => Promise<any>
) => {
  return await repo.transaction(async (tx) => {
    // Acquire advisory lock
    const locked = await tx.execute(
      "SELECT pg_try_advisory_lock(?)",
      [lockId]
    );
    
    if (!locked.rows[0].pg_try_advisory_lock) {
      throw new Error("Could not acquire lock");
    }
    
    try {
      return await fn();
    } finally {
      // Release advisory lock
      await tx.execute(
        "SELECT pg_advisory_unlock(?)",
        [lockId]
      );
    }
  });
};
```

## Transaction Options

### Timeout

```typescript
// Set transaction timeout
const result = await repo.transaction(async (tx) => {
  // Long running operations
}, {
  timeout: 30000 // 30 seconds
});
```

### Read-Only Transactions

```typescript
// Optimize read-only transactions
const report = await repo.transaction(async (tx) => {
  const users = await tx.all(from(UserSchema));
  const posts = await tx.all(from(PostSchema));
  
  return generateReport(users.data, posts.data);
}, {
  readOnly: true,
  isolationLevel: "REPEATABLE READ"
});
```

### Deferrable Transactions

```typescript
// PostgreSQL deferrable transactions for long-running reads
const analyze = await repo.transaction(async (tx) => {
  // Complex analytics queries
}, {
  readOnly: true,
  isolationLevel: "SERIALIZABLE",
  deferrable: true
});
```

## Error Handling

### Transaction-Specific Errors

```typescript
const handleTransactionError = (error: any) => {
  // Deadlock detected
  if (error.code === "40P01") {
    return { retry: true, message: "Deadlock detected" };
  }
  
  // Serialization failure
  if (error.code === "40001") {
    return { retry: true, message: "Serialization failure" };
  }
  
  // Lock timeout
  if (error.code === "55P03") {
    return { retry: true, message: "Lock timeout" };
  }
  
  // Unique violation
  if (error.code === "23505") {
    return { retry: false, message: "Duplicate key" };
  }
  
  // Foreign key violation
  if (error.code === "23503") {
    return { retry: false, message: "Foreign key constraint" };
  }
  
  return { retry: false, message: error.message };
};
```

### Retry Logic

```typescript
const withRetry = async <T>(
  operation: () => Promise<T>,
  options = { maxRetries: 3, delay: 100 }
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i < options.maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const { retry } = handleTransactionError(error);
      
      if (!retry) {
        throw error;
      }
      
      // Exponential backoff
      const delay = options.delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};
```

## Testing Transactions

```typescript
import { test, expect } from "bun:test";

test("transaction rollback on error", async () => {
  const countBefore = await repo.count(from(UserSchema));
  
  const result = await repo.transaction(async (tx) => {
    await tx.insert("users", { email: "test@example.com" });
    throw new Error("Rollback test");
  });
  
  expect(result.success).toBe(false);
  
  const countAfter = await repo.count(from(UserSchema));
  expect(countAfter).toBe(countBefore);
});

test("nested transaction with savepoint", async () => {
  const result = await repo.transaction(async (tx) => {
    const user = await tx.insert("users", userData);
    
    // Savepoint that fails
    await tx.savepoint("test", async (sp) => {
      await sp.insert("logs", { message: "test" });
      throw new Error("Savepoint rollback");
    }).catch(() => {}); // Ignore savepoint error
    
    // User should still exist
    const check = await tx.one(
      from(UserSchema).where(u => u.id.eq(user.data.id))
    );
    
    expect(check.data).toBeDefined();
    return user.data;
  });
  
  expect(result.success).toBe(true);
});
```

## Best Practices

### 1. Keep Transactions Short

```typescript
// ✅ Good: Quick transaction
await repo.transaction(async (tx) => {
  await tx.update("users", { active: false }, userId);
  await tx.insert("audit_logs", { action: "deactivate", userId });
});

// ❌ Bad: Long-running transaction
await repo.transaction(async (tx) => {
  const users = await tx.all(from(UserSchema));
  for (const user of users.data) {
    await sendEmail(user.email); // External call in transaction!
    await tx.update("users", { notified: true }, user.id);
  }
});
```

### 2. Handle Deadlocks

```typescript
// Consistent lock ordering prevents deadlocks
const transferWithLockOrder = async (
  account1: number,
  account2: number,
  amount: number
) => {
  // Always lock in same order (by ID)
  const [first, second] = account1 < account2 
    ? [account1, account2] 
    : [account2, account1];
  
  return await repo.transaction(async (tx) => {
    await tx.one(
      from(AccountSchema).where(a => a.id.eq(first)).forUpdate()
    );
    await tx.one(
      from(AccountSchema).where(a => a.id.eq(second)).forUpdate()
    );
    
    // Perform transfer
  });
};
```

### 3. Use Appropriate Isolation

```typescript
// Read-heavy operations
const getStats = () => repo.transaction(async (tx) => {
  // Analytics queries
}, {
  readOnly: true,
  isolationLevel: "READ COMMITTED"
});

// Financial operations
const processPayment = () => repo.transaction(async (tx) => {
  // Payment logic
}, {
  isolationLevel: "SERIALIZABLE"
});
```

## Next Steps

- [Performance](./performance.md) - Optimize transaction performance
- [Migrations](./migrations.md) - Schema changes in transactions
- [Associations](./associations.md) - Maintain referential integrity
- [Custom Adapters](./custom-adapters.md) - Database-specific features

---

← [Associations](./associations.md) | [Back to Documentation](../README.md) | [Performance](./performance.md) →