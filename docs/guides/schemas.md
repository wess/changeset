# Schema Definition Guide

Schemas are the foundation of changeset. They define your data structure, provide type safety, and map to database tables.

## Basic Schema Definition

### Creating a Schema

```typescript
import { schema, f } from "changeset";

const UserSchema = schema("users", {
  id: f.id(),
  username: f.string("username", { null: false, unique: true }),
  email: f.string("email", { null: false, unique: true }),
  password: f.string("password_hash", { null: false }),
  age: f.integer("age"),
  isActive: f.boolean("is_active", { default: true }),
  createdAt: f.utcDateTime("created_at", { null: false }),
  updatedAt: f.utcDateTime("updated_at", { null: false })
});
```

### Schema Components

1. **Table Name**: First argument (`"users"`)
2. **Field Definitions**: Object with field configurations
3. **Type Inference**: Automatic TypeScript type generation

## Field Types

### Numeric Types

```typescript
const ProductSchema = schema("products", {
  id: f.id(),                        // Auto-incrementing primary key
  quantity: f.integer("quantity"),   // Integer
  price: f.float("price", {          // Floating point
    precision: 10,                   // Total digits
    scale: 2                         // Decimal places
  }),
  rating: f.float("rating")          // Simple float
});
```

### String Types

```typescript
const ArticleSchema = schema("articles", {
  title: f.string("title", { 
    null: false,
    size: 255        // VARCHAR(255)
  }),
  slug: f.string("slug", { 
    unique: true     // Unique constraint
  }),
  content: f.string("content"),  // TEXT field (no size limit)
  tags: f.string("tags")          // Can store JSON strings
});
```

### Date and Time Types

```typescript
const EventSchema = schema("events", {
  scheduledDate: f.date("scheduled_date"),           // Date only
  scheduledTime: f.time("scheduled_time"),           // Time only
  startsAt: f.naiveDateTime("starts_at"),           // DateTime without timezone
  createdAt: f.utcDateTime("created_at"),           // DateTime with UTC timezone
  publishedAt: f.utcDateTime("published_at", {
    null: true,                                     // Nullable timestamp
    default: null
  })
});
```

### Boolean Type

```typescript
const SettingsSchema = schema("settings", {
  emailNotifications: f.boolean("email_notifications", { 
    default: true 
  }),
  isPublic: f.boolean("is_public", { 
    default: false 
  }),
  verified: f.boolean("verified")  // No default, nullable
});
```

### Binary Type

```typescript
const FileSchema = schema("files", {
  id: f.id(),
  filename: f.string("filename", { null: false }),
  data: f.binary("data"),          // BLOB/BYTEA
  thumbnail: f.binary("thumbnail", { null: true })
});
```

### Complex Types

```typescript
const ConfigSchema = schema("configs", {
  settings: f.map("settings"),      // JSON/JSONB field
  tags: f.array("tags"),           // Array field (PostgreSQL)
  metadata: f.map("metadata", {     // Structured JSON
    null: true
  })
});
```

## Field Options

### Common Options

All field types support these options:

```typescript
interface FieldOptions {
  null?: boolean;        // Allow NULL values (default: true)
  default?: any;         // Default value
  unique?: boolean;      // Unique constraint
  primaryKey?: boolean;  // Primary key constraint
}
```

### Type-Specific Options

```typescript
// String options
f.string("name", {
  size: 100,            // VARCHAR(100)
  null: false,
  default: "Anonymous"
})

// Numeric options
f.float("price", {
  precision: 10,        // Total digits
  scale: 2,            // Decimal places
  null: false,
  default: 0.00
})

// Integer with constraints
f.integer("age", {
  null: true,
  default: null
})
```

## Primary Keys

### Simple Primary Key

```typescript
const UserSchema = schema("users", {
  id: f.id(),  // Default: auto-incrementing integer
  // ... other fields
});
```

### Custom Primary Key

```typescript
const AccountSchema = schema("accounts", {
  accountNumber: f.string("account_number", { 
    primaryKey: true,
    null: false 
  }),
  // ... other fields
});

// UUID primary key
const SessionSchema = schema("sessions", {
  id: f.string("id", { 
    primaryKey: true,
    null: false,
    default: "gen_random_uuid()" // PostgreSQL UUID
  }),
  // ... other fields
});
```

### Composite Primary Keys

```typescript
const UserRoleSchema = schema("user_roles", {
  userId: f.integer("user_id", { null: false }),
  roleId: f.integer("role_id", { null: false }),
  assignedAt: f.utcDateTime("assigned_at", { null: false })
  // Note: Composite keys need to be defined at migration level
});
```

## Timestamps

### Manual Timestamps

```typescript
const PostSchema = schema("posts", {
  id: f.id(),
  title: f.string("title", { null: false }),
  createdAt: f.utcDateTime("created_at", { null: false }),
  updatedAt: f.utcDateTime("updated_at", { null: false })
});
```

### Using Timestamp Helpers

```typescript
import { schema, f, timestamps } from "changeset";

const PostSchema = schema("posts", {
  id: f.id(),
  title: f.string("title", { null: false }),
  ...timestamps()  // Adds createdAt and updatedAt
});

// Custom field names
const ArticleSchema = schema("articles", {
  id: f.id(),
  title: f.string("title", { null: false }),
  ...timestamps({
    created: "inserted_at",
    updated: "modified_at"
  })
});
```

## Indexes and Constraints

### Unique Constraints

```typescript
const UserSchema = schema("users", {
  email: f.string("email", { 
    unique: true,
    null: false 
  }),
  username: f.string("username", { 
    unique: true,
    null: false 
  })
});
```

### Indexes (defined in migrations)

```typescript
// Schemas define the structure
const ProductSchema = schema("products", {
  name: f.string("name", { null: false }),
  category: f.string("category", { null: false }),
  price: f.float("price", { null: false })
});

// Indexes are added via migrations
// CREATE INDEX idx_products_category ON products(category);
// CREATE INDEX idx_products_price ON products(price);
```

## Schema Inheritance and Composition

### Shared Field Sets

```typescript
// Common fields
const auditFields = () => ({
  createdBy: f.string("created_by", { null: false }),
  createdAt: f.utcDateTime("created_at", { null: false }),
  updatedBy: f.string("updated_by"),
  updatedAt: f.utcDateTime("updated_at")
});

// Use in multiple schemas
const DocumentSchema = schema("documents", {
  id: f.id(),
  title: f.string("title", { null: false }),
  content: f.string("content"),
  ...auditFields()
});

const CommentSchema = schema("comments", {
  id: f.id(),
  text: f.string("text", { null: false }),
  ...auditFields()
});
```

### Schema Extension

```typescript
// Base fields
const baseFields = {
  id: f.id(),
  uuid: f.string("uuid", { unique: true, null: false }),
  ...timestamps()
};

// Extended schemas
const UserSchema = schema("users", {
  ...baseFields,
  email: f.string("email", { unique: true, null: false }),
  username: f.string("username", { unique: true, null: false })
});

const AdminSchema = schema("admins", {
  ...baseFields,
  email: f.string("email", { unique: true, null: false }),
  permissions: f.map("permissions")
});
```

## Virtual Fields

Virtual fields exist in your schema but not in the database:

```typescript
const UserSchema = schema("users", {
  id: f.id(),
  firstName: f.string("first_name", { null: false }),
  lastName: f.string("last_name", { null: false }),
  email: f.string("email", { null: false })
});

// Computed in application code
interface UserWithFullName {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;  // Virtual field
}

const addVirtualFields = (user: User): UserWithFullName => ({
  ...user,
  fullName: `${user.firstName} ${user.lastName}`
});
```

## Schema Validation

### Type Validation

TypeScript provides compile-time validation:

```typescript
const UserSchema = schema("users", {
  age: f.integer("age")
});

// Type error at compile time
const invalidInsert = await repo.insert("users", {
  age: "not a number"  // ❌ Type error!
});
```

### Runtime Validation (via Changesets)

```typescript
import { changeset, validateRequired, validateFormat } from "changeset";

const userChangeset = (data: any) => 
  changeset(UserSchema, data)
    .validateRequired(["email", "username"])
    .validateFormat("email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    .validateLength("username", { min: 3, max: 20 });
```

## Schema Naming Conventions

### Database Conventions

```typescript
// Snake_case for database columns
const UserSchema = schema("users", {
  id: f.id(),
  firstName: f.string("first_name"),    // JS: firstName, DB: first_name
  lastName: f.string("last_name"),      // JS: lastName, DB: last_name
  isActive: f.boolean("is_active"),     // JS: isActive, DB: is_active
  createdAt: f.utcDateTime("created_at") // JS: createdAt, DB: created_at
});
```

### Table Naming

```typescript
// Plural table names (convention)
const UserSchema = schema("users", { /* ... */ });
const PostSchema = schema("posts", { /* ... */ });
const CommentSchema = schema("comments", { /* ... */ });

// Junction tables for many-to-many
const UserRoleSchema = schema("user_roles", { /* ... */ });
const PostTagSchema = schema("post_tags", { /* ... */ });
```

## Best Practices

### 1. Keep Schemas Focused

```typescript
// ✅ Good: Single responsibility
const UserSchema = schema("users", {
  id: f.id(),
  email: f.string("email", { null: false, unique: true }),
  username: f.string("username", { null: false, unique: true })
});

const UserProfileSchema = schema("user_profiles", {
  userId: f.integer("user_id", { null: false }),
  bio: f.string("bio"),
  avatar: f.string("avatar_url")
});
```

### 2. Use Appropriate Field Types

```typescript
// ✅ Good: Specific types
const ProductSchema = schema("products", {
  price: f.float("price", { precision: 10, scale: 2 }),
  quantity: f.integer("quantity"),
  inStock: f.boolean("in_stock")
});

// ❌ Bad: Everything as strings
const BadProductSchema = schema("products", {
  price: f.string("price"),      // Should be float
  quantity: f.string("quantity"), // Should be integer
  inStock: f.string("in_stock")   // Should be boolean
});
```

### 3. Be Explicit About Nullability

```typescript
// ✅ Good: Clear nullability
const PostSchema = schema("posts", {
  title: f.string("title", { null: false }),     // Required
  subtitle: f.string("subtitle", { null: true }), // Optional
  publishedAt: f.utcDateTime("published_at")      // Optional (default)
});
```

### 4. Use Constraints Wisely

```typescript
// ✅ Good: Appropriate constraints
const UserSchema = schema("users", {
  email: f.string("email", { 
    null: false, 
    unique: true,
    size: 255 
  }),
  age: f.integer("age", {
    null: true  // Age might not be provided
  })
});
```

## Next Steps

- [**Query Building Guide**](./queries.md) - Build queries with your schemas
- [**Repository Pattern**](./repository.md) - Execute operations on schemas
- [**Associations**](../advanced/associations.md) - Define relationships
- [**Migrations**](../advanced/migrations.md) - Create database tables

---

← [Core Concepts](../core-concepts.md) | [Back to Documentation](../README.md) | [Query Building](./queries.md) →