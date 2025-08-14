# Core Concepts

Understanding the core concepts of changeset will help you leverage its full power. This guide covers the fundamental building blocks and architectural principles.

## Functional Programming Foundation

changeset is built on pure functional programming principles:

### No Classes, Just Functions

```typescript
// ❌ Traditional OOP approach (NOT used in changeset)
class UserRepository {
  private db: Database;
  
  async findById(id: number) {
    // ...
  }
}

// ✅ Functional approach (changeset way)
const createUserQueries = (schema: Schema) => ({
  findById: (id: number) => 
    from(schema).where(u => u.id.eq(id))
});
```

### Immutability

Every operation returns a new object, never modifying the original:

```typescript
const baseQuery = from(UserSchema);
const filtered = baseQuery.where(u => u.active.eq(true));
const sorted = filtered.orderBy(u => u.name);

// baseQuery remains unchanged
// Each operation creates a new query object
```

### Function Composition

Build complex operations from simple functions:

```typescript
// Compose conditions
const isAdult = (u: any) => u.age.gte(18);
const isActive = (u: any) => u.active.eq(true);
const isPremium = (u: any) => u.subscription.eq("premium");

// Combine them
const premiumAdults = from(UserSchema)
  .where(u => and(
    isAdult(u),
    isActive(u),
    isPremium(u)
  ));
```

## Schemas

Schemas define the structure of your data and provide type safety:

### Schema Definition

```typescript
const ProductSchema = schema("products", {
  id: f.id(),
  name: f.string("name", { null: false }),
  price: f.float("price", { precision: 10, scale: 2 }),
  inStock: f.boolean("in_stock", { default: true }),
  category: f.string("category"),
  createdAt: f.utcDateTime("created_at", { null: false })
});
```

### Type Inference

TypeScript automatically infers types from your schema:

```typescript
// Automatic type inference
type Product = typeof ProductSchema._type;
// {
//   id: number;
//   name: string;
//   price: number;
//   inStock: boolean;
//   category: string | null;
//   createdAt: Date;
// }
```

### Schema as Single Source of Truth

Your schema definition drives:
- TypeScript types
- Query building
- Validation rules
- Database constraints

## Query Building

The query builder provides a fluent, type-safe interface:

### Query Structure

Every query has these components:

```typescript
interface Query<T> {
  schema: Schema<T>;           // The schema being queried
  whereConditions: Condition[]; // Filter conditions
  orderBy?: OrderBy[];         // Sort order
  limit?: number;              // Result limit
  offset?: number;             // Result offset
  selectFields?: string[];     // Selected fields
}
```

### Method Chaining

Build queries step by step:

```typescript
const query = from(UserSchema)    // Start with schema
  .where(/* condition */)         // Add filters
  .orderBy(/* field */)          // Add sorting
  .limit(10)                     // Limit results
  .offset(20);                   // Skip results
```

### Lazy Evaluation

Queries are not executed until you call a repository method:

```typescript
// This just builds the query structure
const query = from(UserSchema).where(u => u.age.gt(18));

// This executes the query
const result = await repo.all(query);
```

## Repository Pattern

The repository pattern separates query building from execution:

### Repository Interface

```typescript
interface Repo {
  all<T>(query: Query<T>): Promise<Result<T[]>>;
  one<T>(query: Query<T>): Promise<Result<T | null>>;
  insert<T>(table: string, data: Partial<T>): Promise<Result<T>>;
  update<T>(table: string, data: Partial<T>, id: any): Promise<Result<T>>;
  delete<T>(table: string, id: any): Promise<Result<T>>;
  // ... more operations
}
```

### Adapter Pattern

Repositories use adapters to support different databases:

```typescript
// SQLite
const sqliteRepo = await createSqliteRepo("./app.db");

// PostgreSQL
const pgRepo = await createRepo({
  type: "postgresql",
  config: { database: "postgresql://..." }
});

// Same interface, different implementations
```

## Result Types

changeset uses Result types for explicit error handling:

### Result Type Definition

```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
```

### Working with Results

```typescript
const result = await repo.all(query);

if (result.success) {
  // TypeScript knows result.data exists here
  console.log("Users:", result.data);
} else {
  // TypeScript knows result.error exists here
  console.error("Error:", result.error.message);
}
```

### No Exceptions

Functions never throw exceptions, always returning Results:

```typescript
// ❌ Traditional approach with exceptions
try {
  const users = await db.query("SELECT * FROM users");
  console.log(users);
} catch (error) {
  console.error(error);
}

// ✅ changeset approach with Results
const result = await repo.all(from(UserSchema));
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

## Field Operators

Field operators provide a natural way to build conditions:

### Operator Types

```typescript
interface FieldOperators {
  eq: (value: any) => WhereCondition;      // equals
  neq: (value: any) => WhereCondition;     // not equals
  gt: (value: any) => WhereCondition;      // greater than
  gte: (value: any) => WhereCondition;     // greater than or equal
  lt: (value: any) => WhereCondition;      // less than
  lte: (value: any) => WhereCondition;     // less than or equal
  like: (pattern: string) => WhereCondition;
  in: (values: any[]) => WhereCondition;
  isNull: () => WhereCondition;
  isNotNull: () => WhereCondition;
}
```

### Proxy-Based Field Access

Fields are accessed through proxies for type safety:

```typescript
// The arrow function receives a proxy object
.where(u => u.name.eq("Alice"))

// u.name returns FieldOperators
// .eq("Alice") creates a WhereCondition
```

## Logical Operators

Combine conditions with logical operators:

### AND Operator

```typescript
import { and } from "changeset";

const query = from(UserSchema)
  .where(u => and(
    u.age.gte(18),
    u.age.lt(65),
    u.active.eq(true)
  ));
```

### OR Operator

```typescript
import { or } from "changeset";

const query = from(UserSchema)
  .where(u => or(
    u.role.eq("admin"),
    u.role.eq("moderator")
  ));
```

### Combining Operators

```typescript
const query = from(UserSchema)
  .where(u => and(
    u.active.eq(true),
    or(
      u.age.lt(18),        // Minors
      u.age.gte(65)        // Seniors
    )
  ));
```

## SQL Generation

Queries are converted to SQL at execution time:

### Query to SQL

```typescript
const query = from(UserSchema)
  .where(u => u.age.gte(18))
  .where(u => u.active.eq(true))
  .orderBy(u => u.name)
  .limit(10);

// Generates:
// SELECT * FROM users 
// WHERE age >= ? AND active = ?
// ORDER BY name ASC
// LIMIT 10

// With parameters: [18, true]
```

### Parameter Binding

All values are parameterized to prevent SQL injection:

```typescript
const userInput = "'; DROP TABLE users; --";
const query = from(UserSchema)
  .where(u => u.name.eq(userInput));

// Safe SQL with parameter binding:
// SELECT * FROM users WHERE name = ?
// Parameters: ["'; DROP TABLE users; --"]
```

## Type Safety

TypeScript ensures type safety throughout:

### Compile-Time Checking

```typescript
const query = from(UserSchema)
  .where(u => u.age.eq("not a number")); // ❌ Type error!

const result = await repo.all(query);
if (result.success) {
  result.data.forEach(user => {
    console.log(user.nonExistent); // ❌ Type error!
  });
}
```

### Inference Through Operations

```typescript
const query = from(UserSchema)
  .select(u => ({ name: u.name, age: u.age }));

const result = await repo.all(query);
if (result.success) {
  // TypeScript knows the shape
  // result.data: Array<{ name: string, age: number | null }>
}
```

## Performance Considerations

### Query Building is Cheap

Query building just creates objects, no database calls:

```typescript
// These are all just object creation, very fast
const q1 = from(UserSchema);
const q2 = q1.where(u => u.active.eq(true));
const q3 = q2.orderBy(u => u.name);
const q4 = q3.limit(100);
```

### Execution is Explicit

Database calls only happen when you explicitly execute:

```typescript
// Only this line hits the database
const result = await repo.all(q4);
```

### Connection Pooling

Both PostgreSQL and SQLite adapters support connection management:

```typescript
const repo = await createRepo({
  type: "postgresql",
  config: {
    database: "postgresql://...",
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000
    }
  }
});
```

## Next Steps

Now that you understand the core concepts:

- [**Schema Definition Guide**](./guides/schemas.md) - Deep dive into schemas
- [**Query Building Guide**](./guides/queries.md) - Advanced query techniques
- [**Repository Pattern**](./guides/repository.md) - Repository operations
- [**Error Handling**](./guides/error-handling.md) - Working with Results

---

← [Quickstart](./quickstart.md) | [Back to Documentation](./README.md) | [Schema Definition](./guides/schemas.md) →