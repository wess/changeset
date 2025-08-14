# Schema API Reference

Complete API reference for schema definition in changeset.

## Functions

### `schema(tableName, fields)`

Creates a schema definition for a database table.

**Parameters:**
- `tableName: string` - The name of the database table
- `fields: Record<string, FieldDefinition>` - Object defining the schema fields

**Returns:** `Schema<T>` - A schema object with type information

**Example:**
```typescript
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { unique: true })
});
```

---

## Field Builders (`f`)

The `f` namespace provides field builder functions for all supported data types.

### `f.id(name?)`

Creates an auto-incrementing primary key field.

**Parameters:**
- `name?: string` - Field name (default: "id")

**Returns:** `FieldDefinition<"id">`

**Example:**
```typescript
f.id()           // Default: column name "id"
f.id("user_id")  // Custom: column name "user_id"
```

---

### `f.string(name, options?)`

Creates a string/text field.

**Parameters:**
- `name: string` - Database column name
- `options?: FieldOptions & { size?: number }` - Field options

**Options:**
- `null?: boolean` - Allow NULL values (default: true)
- `default?: string` - Default value
- `unique?: boolean` - Unique constraint
- `size?: number` - Maximum length (VARCHAR size)

**Returns:** `FieldDefinition<"string">`

**Example:**
```typescript
f.string("username", { null: false, unique: true })
f.string("bio", { size: 500 })
f.string("status", { default: "active" })
```

---

### `f.integer(name, options?)`

Creates an integer field.

**Parameters:**
- `name: string` - Database column name
- `options?: FieldOptions` - Field options

**Returns:** `FieldDefinition<"integer">`

**Example:**
```typescript
f.integer("age")
f.integer("score", { default: 0 })
f.integer("user_id", { null: false })
```

---

### `f.float(name, options?)`

Creates a floating-point number field.

**Parameters:**
- `name: string` - Database column name
- `options?: FieldOptions & { precision?: number, scale?: number }` - Field options

**Options:**
- `precision?: number` - Total number of digits
- `scale?: number` - Number of decimal places

**Returns:** `FieldDefinition<"float">`

**Example:**
```typescript
f.float("price", { precision: 10, scale: 2 })
f.float("rating", { default: 0.0 })
```

---

### `f.boolean(name, options?)`

Creates a boolean field.

**Parameters:**
- `name: string` - Database column name
- `options?: FieldOptions` - Field options

**Returns:** `FieldDefinition<"boolean">`

**Example:**
```typescript
f.boolean("is_active", { default: true })
f.boolean("verified", { default: false })
f.boolean("deleted")
```

---

### `f.date(name, options?)`

Creates a date-only field (no time component).

**Parameters:**
- `name: string` - Database column name
- `options?: FieldOptions` - Field options

**Returns:** `FieldDefinition<"date">`

**Example:**
```typescript
f.date("birth_date")
f.date("due_date", { null: false })
```

---

### `f.time(name, options?)`

Creates a time-only field (no date component).

**Parameters:**
- `name: string` - Database column name
- `options?: FieldOptions` - Field options

**Returns:** `FieldDefinition<"time">`

**Example:**
```typescript
f.time("opening_time")
f.time("scheduled_time", { null: false })
```

---

### `f.naiveDateTime(name, options?)`

Creates a datetime field without timezone information.

**Parameters:**
- `name: string` - Database column name
- `options?: FieldOptions` - Field options

**Returns:** `FieldDefinition<"naive_datetime">`

**Example:**
```typescript
f.naiveDateTime("logged_at")
f.naiveDateTime("processed_at", { null: false })
```

---

### `f.utcDateTime(name, options?)`

Creates a datetime field with UTC timezone.

**Parameters:**
- `name: string` - Database column name
- `options?: FieldOptions` - Field options

**Returns:** `FieldDefinition<"utc_datetime">`

**Example:**
```typescript
f.utcDateTime("created_at", { null: false })
f.utcDateTime("published_at")
```

---

### `f.binary(name, options?)`

Creates a binary data field (BLOB/BYTEA).

**Parameters:**
- `name: string` - Database column name
- `options?: FieldOptions` - Field options

**Returns:** `FieldDefinition<"binary">`

**Example:**
```typescript
f.binary("file_data")
f.binary("thumbnail", { null: true })
```

---

### `f.array(name, options?)`

Creates an array field (PostgreSQL specific).

**Parameters:**
- `name: string` - Database column name
- `options?: FieldOptions` - Field options

**Returns:** `FieldDefinition<"array">`

**Example:**
```typescript
f.array("tags")
f.array("categories", { default: [] })
```

---

### `f.map(name, options?)`

Creates a JSON/JSONB field for storing objects.

**Parameters:**
- `name: string` - Database column name
- `options?: FieldOptions` - Field options

**Returns:** `FieldDefinition<"map">`

**Example:**
```typescript
f.map("metadata")
f.map("settings", { default: {} })
f.map("config", { null: false })
```

---

## Helper Functions

### `timestamps(options?)`

Creates standard timestamp fields (createdAt and updatedAt).

**Parameters:**
- `options?: { created?: string, updated?: string, type?: "utc_datetime" | "naive_datetime" }`

**Returns:** Object with timestamp field definitions

**Example:**
```typescript
// Default: adds createdAt and updatedAt
const PostSchema = schema("posts", {
  id: f.id(),
  title: f.string("title"),
  ...timestamps()
});

// Custom field names
const ArticleSchema = schema("articles", {
  id: f.id(),
  ...timestamps({
    created: "inserted_at",
    updated: "modified_at"
  })
});

// Custom type
const EventSchema = schema("events", {
  id: f.id(),
  ...timestamps({ type: "naive_datetime" })
});
```

---

### `idField(name?)`

Creates an ID field (alias for `f.id()`).

**Parameters:**
- `name?: string` - Field name (default: "id")

**Returns:** `FieldDefinition<"id">`

**Deprecated:** Use `f.id()` instead

---

## Type Definitions

### `FieldOptions`

Common options for all field types.

```typescript
interface FieldOptions {
  null?: boolean;        // Allow NULL (default: true)
  default?: any;         // Default value
  unique?: boolean;      // Unique constraint
  primaryKey?: boolean;  // Primary key constraint
}
```

### `FieldDefinition<T>`

Field definition structure.

```typescript
interface FieldDefinition<T extends FieldType> {
  name: string;          // Column name
  type: T;              // Field type
  options: FieldOptions; // Field options
}
```

### `FieldType`

Union type of all supported field types.

```typescript
type FieldType = 
  | "id"
  | "string"
  | "integer"
  | "float"
  | "boolean"
  | "date"
  | "time"
  | "naive_datetime"
  | "utc_datetime"
  | "binary"
  | "array"
  | "map";
```

### `Schema<T>`

Schema structure with type information.

```typescript
interface Schema<T> {
  tableName: string;
  fields: Record<string, FieldDefinition>;
  _type: T;  // TypeScript type representation
}
```

## Type Inference

### Automatic Type Generation

Schemas automatically generate TypeScript types:

```typescript
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { null: false }),
  age: f.integer("age"),
  isActive: f.boolean("is_active", { default: true })
});

// Extract the type
type User = typeof UserSchema._type;
// Equivalent to:
// {
//   id: number;
//   name: string;
//   email: string;
//   age: number | null;
//   isActive: boolean;
// }
```

### Field Type Mappings

| Field Type | TypeScript Type | SQL Type (varies by DB) |
|------------|----------------|-------------------------|
| `id` | `number` | `INTEGER PRIMARY KEY` |
| `string` | `string \| null` | `VARCHAR` / `TEXT` |
| `integer` | `number \| null` | `INTEGER` |
| `float` | `number \| null` | `FLOAT` / `DECIMAL` |
| `boolean` | `boolean \| null` | `BOOLEAN` |
| `date` | `Date \| null` | `DATE` |
| `time` | `string \| null` | `TIME` |
| `naive_datetime` | `Date \| null` | `TIMESTAMP` |
| `utc_datetime` | `Date \| null` | `TIMESTAMP WITH TIME ZONE` |
| `binary` | `Buffer \| null` | `BLOB` / `BYTEA` |
| `array` | `any[] \| null` | `ARRAY` (PostgreSQL) |
| `map` | `Record<string, any> \| null` | `JSON` / `JSONB` |

## Examples

### Complete User Schema

```typescript
const UserSchema = schema("users", {
  // Primary key
  id: f.id(),
  
  // Required strings
  username: f.string("username", { null: false, unique: true }),
  email: f.string("email", { null: false, unique: true }),
  passwordHash: f.string("password_hash", { null: false }),
  
  // Optional fields
  firstName: f.string("first_name"),
  lastName: f.string("last_name"),
  bio: f.string("bio", { size: 500 }),
  
  // Numbers
  age: f.integer("age"),
  score: f.integer("score", { default: 0 }),
  
  // Booleans
  isActive: f.boolean("is_active", { default: true }),
  emailVerified: f.boolean("email_verified", { default: false }),
  
  // Dates
  birthDate: f.date("birth_date"),
  lastLoginAt: f.utcDateTime("last_login_at"),
  
  // JSON
  preferences: f.map("preferences", { default: {} }),
  
  // Timestamps
  ...timestamps()
});
```

### Blog Post Schema

```typescript
const PostSchema = schema("posts", {
  id: f.id(),
  
  // Content
  title: f.string("title", { null: false, size: 255 }),
  slug: f.string("slug", { null: false, unique: true }),
  content: f.string("content", { null: false }),
  excerpt: f.string("excerpt", { size: 500 }),
  
  // Metadata
  authorId: f.integer("author_id", { null: false }),
  categoryId: f.integer("category_id"),
  tags: f.array("tags"),
  metadata: f.map("metadata"),
  
  // Status
  status: f.string("status", { 
    default: "draft",
    null: false 
  }),
  publishedAt: f.utcDateTime("published_at"),
  
  // Stats
  viewCount: f.integer("view_count", { default: 0 }),
  likeCount: f.integer("like_count", { default: 0 }),
  
  // Timestamps
  createdAt: f.utcDateTime("created_at", { null: false }),
  updatedAt: f.utcDateTime("updated_at", { null: false })
});
```

## See Also

- [Schema Definition Guide](../guides/schemas.md)
- [Field Types Reference](./field-types.md)
- [Query API](./query.md)
- [TypeScript Types](./types.md)

---

← [API Reference](../README.md#api-reference) | [Query API](./query.md) →