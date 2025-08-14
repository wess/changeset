# changeset Documentation

**A pure functional TypeScript database toolkit**

Welcome to the changeset documentation! A powerful, type-safe database library built on functional programming principles. Inspired by Elixir's Ecto library.

## 📚 Documentation Structure

### Getting Started
- [**Quickstart Guide**](./quickstart.md) - Get up and running in 5 minutes
- [**Installation**](./installation.md) - Installation and setup instructions
- [**Core Concepts**](./core-concepts.md) - Understand the fundamental concepts

### Guides
- [**Schema Definition**](./guides/schemas.md) - Define your data models
- [**Query Building**](./guides/queries.md) - Build type-safe queries
- [**Repository Pattern**](./guides/repository.md) - Work with the database
- [**Database Adapters**](./guides/adapters.md) - PostgreSQL and SQLite support
- [**Error Handling**](./guides/error-handling.md) - Result types and error management

### Tutorials
- [**Building a Blog**](./tutorials/blog.md) - Complete blog application tutorial
- [**User Authentication**](./tutorials/authentication.md) - Implement user auth
- [**Real-time Features**](./tutorials/realtime.md) - Add real-time capabilities
- [**Testing Strategies**](./tutorials/testing.md) - Test your database layer

### API Reference
- [**Schema API**](./api/schema.md) - Complete schema API reference
- [**Query API**](./api/query.md) - Query builder API reference
- [**Repository API**](./api/repository.md) - Repository operations reference
- [**Field Types**](./api/field-types.md) - All available field types
- [**Operators**](./api/operators.md) - Query operators reference

### Advanced Topics
- [**Migrations**](./advanced/migrations.md) - Database migrations
- [**Associations**](./advanced/associations.md) - Relationships between schemas
- [**Transactions**](./advanced/transactions.md) - Database transactions
- [**Performance**](./advanced/performance.md) - Optimization techniques
- [**Custom Adapters**](./advanced/custom-adapters.md) - Build your own adapter

## 🎯 Key Features

- **🔥 Pure Functional** - No classes, no OOP, just functions
- **⚡ Type-Safe** - Full TypeScript support with automatic type inference
- **🔗 Method Chaining** - Intuitive fluent query building
- **🛡️ Result Types** - Explicit error handling without exceptions
- **🗄️ Multi-Database** - PostgreSQL and SQLite support
- **🎭 No Decorators** - Clean, functional approach without magic

## 🚀 Quick Example

```typescript
import { schema, f, from, createSqliteRepo } from "changeset";

// Define your schema
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { unique: true }),
  age: f.integer("age"),
  active: f.boolean("active", { default: true })
});

// Build queries functionally
const activeAdults = from(UserSchema)
  .where(u => u.age.gte(18))
  .where(u => u.active.eq(true))
  .orderBy(u => u.name);

// Execute with repository
const repo = await createSqliteRepo("./database.db");
const result = await repo.all(activeAdults);

if (result.success) {
  console.log("Active adults:", result.data);
}
```

## 📖 Philosophy

changeset embraces functional programming principles:

- **Immutability** - All operations return new objects
- **Composability** - Build complex queries from simple functions
- **Predictability** - Pure functions with no hidden side effects
- **Type Safety** - Leverage TypeScript's type system fully
- **Explicit Error Handling** - No thrown exceptions, use Result types

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](../LICENSE) for details.

---

Ready to get started? Head to the [**Quickstart Guide**](./quickstart.md) →