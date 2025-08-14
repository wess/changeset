# Query Building Guide

Learn how to build powerful, type-safe queries with changeset's functional query builder.

## Query Basics

### Starting a Query

Every query begins with the `from` function:

```typescript
import { from } from "changeset";
import { UserSchema } from "./schemas";

// Simple query for all records
const allUsers = from(UserSchema);

// The query is just a data structure at this point
console.log(allUsers);
// {
//   schema: UserSchema,
//   whereConditions: [],
//   orderBy: undefined,
//   limit: undefined,
//   offset: undefined
// }
```

### Query Execution

Queries are executed through a repository:

```typescript
// Build the query
const query = from(UserSchema);

// Execute it
const result = await repo.all(query);

// Handle the result
if (result.success) {
  console.log(`Found ${result.data.length} users`);
}
```

## Filtering with WHERE

### Basic Conditions

```typescript
// Single condition
const activeUsers = from(UserSchema)
  .where(u => u.isActive.eq(true));

// Multiple conditions (implicit AND)
const activeAdults = from(UserSchema)
  .where(u => u.isActive.eq(true))
  .where(u => u.age.gte(18));
```

### Comparison Operators

```typescript
// Equality
.where(u => u.status.eq("active"))       // status = 'active'
.where(u => u.status.neq("deleted"))     // status != 'deleted'

// Numeric comparisons
.where(u => u.age.gt(18))                // age > 18
.where(u => u.age.gte(18))               // age >= 18
.where(u => u.age.lt(65))                // age < 65
.where(u => u.age.lte(65))               // age <= 65

// Range checks
.where(u => and(
  u.age.gte(18),
  u.age.lte(65)
))                                        // age BETWEEN 18 AND 65
```

### String Operations

```typescript
// LIKE patterns
.where(u => u.email.like("%@gmail.com"))     // Ends with @gmail.com
.where(u => u.name.like("John%"))            // Starts with John
.where(u => u.name.like("%smith%"))          // Contains smith

// Case-insensitive LIKE (PostgreSQL)
.where(u => u.name.ilike("%JOHN%"))          // Matches john, John, JOHN, etc.

// String equality
.where(u => u.username.eq("alice123"))
```

### NULL Checks

```typescript
// Check for NULL
.where(u => u.deletedAt.isNull())        // deletedAt IS NULL

// Check for NOT NULL
.where(u => u.email.isNotNull())         // email IS NOT NULL

// Combine with other conditions
.where(u => and(
  u.deletedAt.isNull(),
  u.isActive.eq(true)
))
```

### IN and NOT IN

```typescript
// IN operator
.where(u => u.status.in(["active", "pending", "review"]))

// NOT IN operator
.where(u => u.status.notIn(["deleted", "banned"]))

// With numbers
.where(u => u.id.in([1, 2, 3, 4, 5]))

// Dynamic arrays
const allowedRoles = ["admin", "moderator", "editor"];
const query = from(UserSchema)
  .where(u => u.role.in(allowedRoles));
```

## Logical Operators

### AND Operator

```typescript
import { and } from "changeset";

// Multiple conditions with AND
const query = from(UserSchema)
  .where(u => and(
    u.age.gte(18),
    u.age.lt(65),
    u.isActive.eq(true),
    u.email.isNotNull()
  ));

// Nested AND conditions
const complexQuery = from(UserSchema)
  .where(u => and(
    u.isActive.eq(true),
    and(
      u.age.gte(18),
      u.hasVerifiedEmail.eq(true)
    )
  ));
```

### OR Operator

```typescript
import { or } from "changeset";

// Multiple conditions with OR
const query = from(UserSchema)
  .where(u => or(
    u.role.eq("admin"),
    u.role.eq("moderator"),
    u.isSuperUser.eq(true)
  ));

// Combining OR with AND
const query = from(UserSchema)
  .where(u => and(
    u.isActive.eq(true),
    or(
      u.subscription.eq("premium"),
      u.subscription.eq("enterprise")
    )
  ));
```

### NOT Operator

```typescript
import { not } from "changeset";

// Negate a condition
const query = from(UserSchema)
  .where(u => not(u.status.eq("deleted")));

// Negate complex conditions
const query = from(UserSchema)
  .where(u => not(
    or(
      u.status.eq("banned"),
      u.status.eq("suspended")
    )
  ));
```

## Sorting with ORDER BY

### Basic Sorting

```typescript
// Ascending order (default)
const usersByName = from(UserSchema)
  .orderBy(u => u.name);

// Descending order
const newestFirst = from(PostSchema)
  .orderBy(p => p.createdAt, "DESC");

// Multiple sort fields
const sorted = from(ProductSchema)
  .orderBy(p => p.category)
  .orderBy(p => p.price, "DESC");
```

### Dynamic Sorting

```typescript
type SortField = "name" | "age" | "createdAt";
type SortOrder = "ASC" | "DESC";

const buildSortedQuery = (field: SortField, order: SortOrder = "ASC") => {
  const query = from(UserSchema);
  
  switch (field) {
    case "name":
      return query.orderBy(u => u.name, order);
    case "age":
      return query.orderBy(u => u.age, order);
    case "createdAt":
      return query.orderBy(u => u.createdAt, order);
  }
};
```

## Pagination

### LIMIT and OFFSET

```typescript
// First 10 records
const firstPage = from(UserSchema)
  .limit(10);

// Skip 20, take 10 (page 3 with page size 10)
const thirdPage = from(UserSchema)
  .limit(10)
  .offset(20);

// Pagination helper
const paginate = <T>(query: Query<T>, page: number, pageSize: number) => {
  return query
    .limit(pageSize)
    .offset((page - 1) * pageSize);
};

// Usage
const page2 = paginate(from(UserSchema), 2, 25);
```

### Cursor-Based Pagination

```typescript
// Get next page after a specific ID
const nextPage = from(PostSchema)
  .where(p => p.id.gt(lastSeenId))
  .orderBy(p => p.id)
  .limit(20);

// With timestamp cursors
const nextBatch = from(EventSchema)
  .where(e => e.createdAt.gt(lastTimestamp))
  .orderBy(e => e.createdAt)
  .limit(50);
```

## Field Selection

### Selecting Specific Fields

```typescript
// Select specific fields (coming in future versions)
const namesOnly = from(UserSchema)
  .select(u => ({
    id: u.id,
    name: u.name
  }));

// Transform in application code for now
const result = await repo.all(from(UserSchema));
if (result.success) {
  const names = result.data.map(u => ({
    id: u.id,
    name: u.name
  }));
}
```

## Complex Query Examples

### User Search

```typescript
const searchUsers = (searchTerm: string, filters: {
  isActive?: boolean;
  minAge?: number;
  maxAge?: number;
  roles?: string[];
}) => {
  let query = from(UserSchema);

  // Search term
  if (searchTerm) {
    query = query.where(u => or(
      u.name.like(`%${searchTerm}%`),
      u.email.like(`%${searchTerm}%`),
      u.username.like(`%${searchTerm}%`)
    ));
  }

  // Active filter
  if (filters.isActive !== undefined) {
    query = query.where(u => u.isActive.eq(filters.isActive));
  }

  // Age range
  if (filters.minAge !== undefined) {
    query = query.where(u => u.age.gte(filters.minAge));
  }
  if (filters.maxAge !== undefined) {
    query = query.where(u => u.age.lte(filters.maxAge));
  }

  // Roles
  if (filters.roles && filters.roles.length > 0) {
    query = query.where(u => u.role.in(filters.roles));
  }

  return query.orderBy(u => u.name);
};
```

### Date Range Queries

```typescript
// Posts from last 30 days
const recentPosts = from(PostSchema)
  .where(p => p.createdAt.gte(thirtyDaysAgo))
  .where(p => p.status.eq("published"))
  .orderBy(p => p.createdAt, "DESC");

// Events in date range
const upcomingEvents = from(EventSchema)
  .where(e => and(
    e.startsAt.gte(startDate),
    e.startsAt.lte(endDate),
    e.isCancelled.eq(false)
  ))
  .orderBy(e => e.startsAt);
```

### Statistics Queries

```typescript
// Active users by age group
const getAgeGroups = () => {
  const queries = {
    children: from(UserSchema)
      .where(u => and(u.age.lt(18), u.isActive.eq(true))),
    
    adults: from(UserSchema)
      .where(u => and(
        u.age.gte(18),
        u.age.lt(65),
        u.isActive.eq(true)
      )),
    
    seniors: from(UserSchema)
      .where(u => and(u.age.gte(65), u.isActive.eq(true)))
  };

  return queries;
};
```

## Query Composition

### Reusable Query Fragments

```typescript
// Define reusable conditions
const isActive = <T extends { isActive: any }>(record: T) => 
  record.isActive.eq(true);

const isRecent = <T extends { createdAt: any }>(record: T, days: number) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return record.createdAt.gte(cutoff);
};

// Compose queries
const recentActiveUsers = from(UserSchema)
  .where(u => and(
    isActive(u),
    isRecent(u, 7)
  ));
```

### Query Builders

```typescript
// Create a query builder function
const createUserQuery = () => {
  let query = from(UserSchema);
  
  return {
    withRole: (role: string) => {
      query = query.where(u => u.role.eq(role));
      return this;
    },
    
    active: () => {
      query = query.where(u => u.isActive.eq(true));
      return this;
    },
    
    olderThan: (age: number) => {
      query = query.where(u => u.age.gt(age));
      return this;
    },
    
    build: () => query
  };
};

// Usage
const admins = createUserQuery()
  .withRole("admin")
  .active()
  .olderThan(25)
  .build();
```

## Query Debugging

### Inspecting Generated SQL

```typescript
const query = from(UserSchema)
  .where(u => u.age.gte(18))
  .where(u => u.isActive.eq(true))
  .orderBy(u => u.name)
  .limit(10);

// Get SQL string
const sql = query.toString();
console.log(sql);
// SELECT * FROM users WHERE age >= ? AND is_active = ? ORDER BY name ASC LIMIT 10

// Get SQL with parameters
const { sql: sqlString, params } = query.toSql();
console.log("SQL:", sqlString);
console.log("Params:", params);
// SQL: SELECT * FROM users WHERE age >= ? AND is_active = ? ORDER BY name ASC LIMIT 10
// Params: [18, true]
```

### Query Timing

```typescript
const timeQuery = async <T>(query: Query<T>, repo: Repo) => {
  const start = performance.now();
  const result = await repo.all(query);
  const duration = performance.now() - start;
  
  console.log(`Query executed in ${duration.toFixed(2)}ms`);
  return result;
};
```

## Best Practices

### 1. Build Queries Incrementally

```typescript
// ✅ Good: Clear, incremental building
let query = from(UserSchema);

if (filterActive) {
  query = query.where(u => u.isActive.eq(true));
}

if (minAge) {
  query = query.where(u => u.age.gte(minAge));
}

if (sortBy === "name") {
  query = query.orderBy(u => u.name);
}
```

### 2. Use Type-Safe Conditions

```typescript
// ✅ Good: Let TypeScript help you
const query = from(UserSchema)
  .where(u => u.age.gte(18));  // TypeScript knows age is a number

// ❌ This would cause a type error
const badQuery = from(UserSchema)
  .where(u => u.age.gte("eighteen"));  // Type error!
```

### 3. Prefer Composition

```typescript
// ✅ Good: Compose small functions
const activeUsers = (q: Query<User>) => 
  q.where(u => u.isActive.eq(true));

const adults = (q: Query<User>) => 
  q.where(u => u.age.gte(18));

const activeAdults = adults(activeUsers(from(UserSchema)));
```

### 4. Avoid SQL Injection

```typescript
// ✅ Good: Use parameterized queries
const userInput = "'; DROP TABLE users; --";
const safe = from(UserSchema)
  .where(u => u.name.eq(userInput));  // Automatically parameterized

// ❌ Never build SQL strings manually
// const unsafe = `SELECT * FROM users WHERE name = '${userInput}'`;
```

## Next Steps

- [**Repository Pattern**](./repository.md) - Execute your queries
- [**Error Handling**](./error-handling.md) - Handle query results
- [**Performance**](../advanced/performance.md) - Optimize queries
- [**API Reference**](../api/query.md) - Complete query API

---

← [Schema Definition](./schemas.md) | [Back to Documentation](../README.md) | [Repository Pattern](./repository.md) →