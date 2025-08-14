# ecto-ts Examples

This directory contains comprehensive examples showing how to use ecto-ts from basic to advanced scenarios.

## Running the Examples

Each example can be run independently:

```bash
# Basic examples
bun examples/01-basic-schema.ts
bun examples/02-basic-queries.ts
bun examples/03-field-operators.ts

# Intermediate examples
bun examples/04-repository-operations.ts
bun examples/05-associations.ts

# Advanced examples
bun examples/06-complex-queries.ts
bun examples/07-real-world-app.ts

# Database Integration examples
bun examples/08-improved-syntax.ts
bun examples/09-clean-where-syntax.ts
bun examples/10-sqlite-demo.ts
```

## Example Progression

### 📚 **01-basic-schema.ts**
- Schema definition fundamentals
- Field types and options
- Using `idField()` and `timestamps()`
- Basic schema structure

**Key concepts:** `schema()`, `f.string()`, `f.id()`, field types, options

### 🔍 **02-basic-queries.ts**
- Query building with `from()`
- Method chaining syntax
- Basic pagination with `limit()` and `offset()`
- Table aliases
- SQL generation

**Key concepts:** `from()`, `query.toString()`, `query.toSql()`, method chaining

### ⚙️ **03-field-operators.ts**
- Comparison operators (`eq`, `gt`, `like`, etc.)
- String operations (`like`, `ilike`)
- List operations (`in`, `notIn`)
- Null checks (`isNull`, `isNotNull`)
- Logical operators (`and`, `or`, `not`)

**Key concepts:** Field operators, conditions, logical operators

### 🗄️ **04-repository-operations.ts**
- Repository pattern usage
- CRUD operations (Create, Read, Update, Delete)
- Result type handling
- Error management
- Batch operations

**Key concepts:** `createRepo()`, CRUD, `Result<T>` types

### 🔗 **05-associations.ts**
- Association types (`hasMany`, `hasOne`, `belongsTo`, `manyToMany`)
- Foreign key configuration
- Through tables for many-to-many
- Preloading concepts

**Key concepts:** Associations, relationships, preloading

### 🎯 **06-complex-queries.ts**
- Advanced filtering with multiple conditions
- Search functionality
- Date range queries
- Complex business logic
- Location-based filtering
- Aggregation concepts

**Key concepts:** Complex conditions, business logic, advanced filtering

### 🌐 **07-real-world-app.ts**
- Complete blog platform example
- Real-world schema design
- User management and authentication
- Content management system
- Search and analytics
- Complete workflow examples

**Key concepts:** Production patterns, complete application architecture

### ⚡ **08-improved-syntax.ts**
- Enhanced field operator syntax
- Cleaner query building patterns
- Type-safe field access
- Modern TypeScript patterns

**Key concepts:** Improved DX, enhanced syntax, type safety

### 🎯 **09-clean-where-syntax.ts**
- Clean arrow function syntax for queries
- Natural field access patterns
- Proxy-based field operators
- Modern query building

**Key concepts:** `u => u.name.eq("John")`, natural syntax, clean queries

### 💾 **10-sqlite-demo.ts**
- Real SQLite database operations
- Complete integration demo
- CRUD operations with actual database
- Error handling and type safety
- Date object handling

**Key concepts:** SQLite integration, real database operations, CRUD

## Core Patterns Demonstrated

### Schema Definition
```typescript
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { unique: true }),
  ...timestamps(),
});
```

### Query Building
```typescript
const query = from(UserSchema)
  .where(u => u.age.gt(18))
  .limit(10)
  .offset(0);

// Get SQL directly
const sql = query.toString();
const { sql, params } = query.toSql();
```

### Repository Operations
```typescript
const repo = await createRepo({ database: "postgresql://..." });
const result = await repo.all(query);

if (result.success) {
  console.log("Users:", result.data);
} else {
  console.error("Error:", result.error);
}
```

### Associations
```typescript
const userPosts = hasMany(PostSchema, { foreignKey: "user_id" });
const postUser = belongsTo(UserSchema, { foreignKey: "user_id" });
```

### Complex Conditions
```typescript
const conditions = and(
  ageOps.gte(18),
  statusOps.eq("active"),
  or(
    cityOps.eq("New York"),
    cityOps.eq("San Francisco")
  )
);
```

## Learning Path

1. **Start with 01-basic-schema.ts** - Learn schema fundamentals
2. **Move to 02-basic-queries.ts** - Understand query building
3. **Practice with 03-field-operators.ts** - Master conditions
4. **Try 04-repository-operations.ts** - Learn CRUD operations
5. **Explore 05-associations.ts** - Understand relationships
6. **Challenge yourself with 06-complex-queries.ts** - Advanced patterns
7. **Study 07-real-world-app.ts** - See complete application

## Key Features Showcased

- ✅ **Functional Programming** - No classes, pure functions
- ✅ **Type Safety** - Full TypeScript integration
- ✅ **Ecto Compatibility** - Familiar syntax for Elixir developers
- ✅ **Method Chaining** - Fluent query building
- ✅ **Result Types** - Proper error handling
- ✅ **SQL Generation** - Automatic query generation
- ✅ **Associations** - Relationship management
- ✅ **Complex Queries** - Advanced filtering and logic

Each example builds upon the previous ones, creating a comprehensive learning experience that takes you from basic schema definition to building complex, production-ready applications with ecto-ts.