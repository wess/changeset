# changeset

**A pure functional TypeScript database toolkit** inspired by Elixir's Ecto library.

> ⚡ **Primary Runtime: Bun** - Built for Bun with Node.js compatibility layer

## ✨ Features

- 🔥 **Pure Functional** - No classes, no OOP, just functions
- ⚡ **Type-Safe** - Full TypeScript support with automatic type inference  
- 🔗 **Method Chaining** - Intuitive fluent query building
- 🛡️ **Result Types** - Explicit error handling without exceptions
- 🗄️ **Multi-Database** - PostgreSQL and SQLite support
- 🎭 **No Decorators** - Clean, functional approach without magic

## 📦 Installation

### Recommended (Bun)
```bash
bun add changeset
```

### Node.js (Limited Support)
```bash
npm install changeset
# Note: Full functionality requires Bun runtime
```

## 🚀 Quick Start

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

## 🏗️ Runtime Compatibility

### 🥇 **Primary: Bun**
Full feature support including:
- SQLite with `bun:sqlite`
- PostgreSQL connections
- All query operations
- Type generation
- Test suite

### 🥈 **Secondary: Node.js**
Basic compatibility with limitations:
- TypeScript types available
- Limited runtime functionality
- Requires additional setup for full features

## 📖 Documentation

- 📚 **[Full Documentation](./docs/README.md)**
- ⚡ **[Quick Start Guide](./docs/quickstart.md)**
- 🎯 **[Core Concepts](./docs/core-concepts.md)**
- 🔧 **[API Reference](./docs/api/schema.md)**

## 🎯 Philosophy

changeset embraces functional programming principles:

- **Immutability** - All operations return new objects
- **Composability** - Build complex queries from simple functions  
- **Predictability** - Pure functions with no hidden side effects
- **Type Safety** - Leverage TypeScript's type system fully
- **Explicit Error Handling** - No thrown exceptions, use Result types

## 💻 Development

### Prerequisites
- Bun 1.0+
- TypeScript 5.0+

### Setup
```bash
# Clone and install
git clone https://github.com/username/changeset.git
cd changeset
bun install

# Run tests
bun test

# Build
bun run build
```

## 📝 Examples

### Schema Definition
```typescript
const PostSchema = schema("posts", {
  id: f.id(),
  title: f.string("title", { null: false }),
  content: f.string("content", { null: false }),
  publishedAt: f.utcDateTime("published_at"),
  tags: f.array("tags"),
  metadata: f.map("metadata"),
  ...timestamps()
});
```

### Query Building
```typescript
// Complex conditions
const publishedPosts = from(PostSchema)
  .where(p => and(
    p.publishedAt.isNotNull(),
    p.publishedAt.lte(new Date()),
    or(
      p.tags.contains(["featured"]),
      p.metadata.like('%priority%')
    )
  ))
  .orderBy(p => p.publishedAt, "DESC")
  .limit(10);

// Repository operations
const repo = await createSqliteRepo("./blog.db");
const result = await repo.all(publishedPosts);
```

### CRUD Operations
```typescript
// Insert
const newPost = await repo.insert("posts", {
  title: "Hello World",
  content: "My first post...",
  publishedAt: new Date()
});

// Update  
const updated = await repo.update("posts", {
  title: "Hello Universe"
}, postId);

// Delete
const deleted = await repo.delete("posts", postId);
```

## 🚧 Roadmap

- [x] Core schema & query system
- [x] PostgreSQL & SQLite adapters
- [x] Result types & error handling
- [x] Comprehensive documentation
- [ ] Advanced associations
- [ ] Migration system
- [ ] Connection pooling
- [ ] Query optimization
- [ ] Advanced Node.js support

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

♥ [Sponsor this project](https://github.com/sponsors/wess)
