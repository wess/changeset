# Associations

Define and work with relationships between your schemas in changeset.

## Overview

Associations allow you to:
- Define relationships between schemas
- Load related data efficiently
- Maintain referential integrity
- Build complex queries across relationships

## Association Types

### belongs_to

A `belongs_to` association sets up a one-to-one connection with another schema, where the foreign key is in the source schema.

```typescript
import { schema, f, belongsTo } from "changeset";

const PostSchema = schema("posts", {
  id: f.id(),
  title: f.string("title", { null: false }),
  content: f.string("content"),
  authorId: f.integer("author_id", { null: false }),
  
  // Association
  author: belongsTo("author", {
    schema: UserSchema,
    foreignKey: "author_id"
  })
});

// Usage
const postsWithAuthors = from(PostSchema)
  .preload(p => p.author)
  .where(p => p.authorId.eq(userId));
```

### has_many

A `has_many` association indicates a one-to-many connection with another schema.

```typescript
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { unique: true }),
  
  // Associations
  posts: hasMany("posts", {
    schema: PostSchema,
    foreignKey: "author_id"
  }),
  
  comments: hasMany("comments", {
    schema: CommentSchema,
    foreignKey: "user_id"
  })
});

// Usage
const usersWithPosts = from(UserSchema)
  .preload(u => u.posts)
  .where(u => u.active.eq(true));
```

### has_one

A `has_one` association sets up a one-to-one connection with another schema, where the foreign key is in the target schema.

```typescript
const UserSchema = schema("users", {
  id: f.id(),
  email: f.string("email", { unique: true }),
  
  // Association
  profile: hasOne("profile", {
    schema: ProfileSchema,
    foreignKey: "user_id"
  })
});

const ProfileSchema = schema("profiles", {
  id: f.id(),
  userId: f.integer("user_id", { unique: true, null: false }),
  bio: f.string("bio"),
  avatar: f.string("avatar_url")
});
```

### many_to_many

A `many_to_many` association creates a many-to-many connection through a join table.

```typescript
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  
  // Association through join table
  roles: manyToMany("roles", {
    schema: RoleSchema,
    joinTable: "user_roles",
    foreignKey: "user_id",
    associationForeignKey: "role_id"
  })
});

const RoleSchema = schema("roles", {
  id: f.id(),
  name: f.string("name", { null: false, unique: true }),
  permissions: f.map("permissions"),
  
  // Reverse association
  users: manyToMany("users", {
    schema: UserSchema,
    joinTable: "user_roles",
    foreignKey: "role_id",
    associationForeignKey: "user_id"
  })
});

// Join table schema
const UserRoleSchema = schema("user_roles", {
  id: f.id(),
  userId: f.integer("user_id", { null: false }),
  roleId: f.integer("role_id", { null: false }),
  assignedAt: f.utcDateTime("assigned_at", { null: false }),
  assignedBy: f.integer("assigned_by")
});
```

## Loading Associations

### Preloading

Load associations eagerly with your query:

```typescript
// Preload single association
const postsWithAuthors = await repo.all(
  from(PostSchema)
    .preload(p => p.author)
);

// Preload multiple associations
const usersComplete = await repo.all(
  from(UserSchema)
    .preload(u => u.profile)
    .preload(u => u.posts)
    .preload(u => u.roles)
);

// Nested preloading
const postsWithComments = await repo.all(
  from(PostSchema)
    .preload(p => p.author.profile) // Load author and their profile
    .preload(p => p.comments.author) // Load comments and their authors
);
```

### Conditional Preloading

```typescript
// Preload with conditions
const usersWithRecentPosts = await repo.all(
  from(UserSchema)
    .preload(u => u.posts, {
      where: p => p.createdAt.gte(thirtyDaysAgo),
      orderBy: p => p.createdAt,
      order: "DESC",
      limit: 5
    })
);

// Preload specific fields
const usersWithPostTitles = await repo.all(
  from(UserSchema)
    .preload(u => u.posts, {
      select: ["id", "title", "publishedAt"]
    })
);
```

### Lazy Loading

Load associations on demand:

```typescript
// Get user first
const userResult = await repo.one(
  from(UserSchema).where(u => u.id.eq(userId))
);

if (userResult.success && userResult.data) {
  // Load posts separately
  const postsResult = await repo.all(
    from(PostSchema).where(p => p.authorId.eq(userResult.data.id))
  );
  
  // Combine manually
  const userWithPosts = {
    ...userResult.data,
    posts: postsResult.success ? postsResult.data : []
  };
}
```

## Querying Associations

### Join Queries

```typescript
// Inner join
const postsWithAuthors = from(PostSchema)
  .join(p => p.author)
  .where(p => p.author.active.eq(true))
  .select(p => ({
    title: p.title,
    authorName: p.author.name
  }));

// Left join
const usersWithPostCount = from(UserSchema)
  .leftJoin(u => u.posts)
  .groupBy(u => u.id)
  .select(u => ({
    name: u.name,
    postCount: count(u.posts.id)
  }));
```

### Filtering by Associations

```typescript
// Users who have posts
const activeAuthors = from(UserSchema)
  .where(u => exists(
    from(PostSchema).where(p => p.authorId.eq(u.id))
  ));

// Posts by specific authors
const teamPosts = from(PostSchema)
  .where(p => p.author.role.in(["admin", "editor"]));

// Users without profiles
const incompleteUsers = from(UserSchema)
  .where(u => notExists(
    from(ProfileSchema).where(pr => pr.userId.eq(u.id))
  ));
```

### Aggregating Associations

```typescript
// Count related records
const userStats = from(UserSchema)
  .select(u => ({
    id: u.id,
    name: u.name,
    postCount: subquery(
      from(PostSchema)
        .where(p => p.authorId.eq(u.id))
        .count()
    ),
    commentCount: subquery(
      from(CommentSchema)
        .where(c => c.userId.eq(u.id))
        .count()
    )
  }));
```

## Association Options

### Foreign Keys

```typescript
// Custom foreign key names
const PostSchema = schema("posts", {
  id: f.id(),
  writerId: f.integer("writer_id", { null: false }),
  
  author: belongsTo("author", {
    schema: UserSchema,
    foreignKey: "writer_id" // Custom FK column
  })
});

// Composite foreign keys
const OrderItemSchema = schema("order_items", {
  orderId: f.integer("order_id", { null: false }),
  productId: f.integer("product_id", { null: false }),
  
  order: belongsTo("order", {
    schema: OrderSchema,
    foreignKey: ["order_id", "customer_id"]
  })
});
```

### Cascading

```typescript
// Cascade deletes
const UserSchema = schema("users", {
  id: f.id(),
  
  posts: hasMany("posts", {
    schema: PostSchema,
    foreignKey: "author_id",
    onDelete: "cascade", // Delete posts when user is deleted
    onUpdate: "cascade"  // Update foreign keys when user ID changes
  })
});

// Set null on delete
const PostSchema = schema("posts", {
  categoryId: f.integer("category_id"),
  
  category: belongsTo("category", {
    schema: CategorySchema,
    foreignKey: "category_id",
    onDelete: "setNull" // Set to null when category is deleted
  })
});
```

### Polymorphic Associations

```typescript
// Polymorphic comments (can belong to posts or videos)
const CommentSchema = schema("comments", {
  id: f.id(),
  content: f.string("content", { null: false }),
  commentableId: f.integer("commentable_id", { null: false }),
  commentableType: f.string("commentable_type", { null: false }),
  
  // Polymorphic association
  commentable: polymorphic("commentable", {
    types: {
      "Post": PostSchema,
      "Video": VideoSchema
    }
  })
});

// Usage
const postComments = from(CommentSchema)
  .where(c => and(
    c.commentableType.eq("Post"),
    c.commentableId.eq(postId)
  ));
```

## Working with Associated Data

### Creating with Associations

```typescript
// Create user with profile
const createUserWithProfile = async (userData: any, profileData: any) => {
  return await repo.transaction(async (tx) => {
    // Create user
    const userResult = await tx.insert("users", userData);
    if (!userResult.success) return userResult;
    
    // Create profile with user ID
    const profileResult = await tx.insert("profiles", {
      ...profileData,
      userId: userResult.data.id
    });
    
    if (!profileResult.success) {
      throw new Error("Failed to create profile");
    }
    
    return {
      success: true,
      data: {
        ...userResult.data,
        profile: profileResult.data
      }
    };
  });
};
```

### Updating Associations

```typescript
// Update user's roles (many-to-many)
const updateUserRoles = async (userId: number, roleIds: number[]) => {
  return await repo.transaction(async (tx) => {
    // Remove existing roles
    await tx.deleteAll(
      from(UserRoleSchema).where(ur => ur.userId.eq(userId))
    );
    
    // Add new roles
    const assignments = roleIds.map(roleId => ({
      userId,
      roleId,
      assignedAt: new Date()
    }));
    
    return await tx.insertAll("user_roles", assignments);
  });
};
```

### Deleting with Associations

```typescript
// Safe delete with association check
const deleteUser = async (userId: number) => {
  // Check for dependent records
  const posts = await repo.one(
    from(PostSchema).where(p => p.authorId.eq(userId))
  );
  
  if (posts.success && posts.data) {
    return {
      success: false,
      error: new Error("Cannot delete user with existing posts")
    };
  }
  
  // Safe to delete
  return await repo.delete("users", userId);
};
```

## Association Patterns

### Through Associations

```typescript
// User has many subscriptions through user_subscriptions
const UserSchema = schema("users", {
  id: f.id(),
  
  subscriptions: hasMany("subscriptions", {
    through: "user_subscriptions",
    schema: SubscriptionSchema
  })
});

// Access nested associations
const usersWithPlans = from(UserSchema)
  .preload(u => u.subscriptions.plan);
```

### Self-Referential Associations

```typescript
// Employee hierarchy
const EmployeeSchema = schema("employees", {
  id: f.id(),
  name: f.string("name", { null: false }),
  managerId: f.integer("manager_id"),
  
  // Self-referential associations
  manager: belongsTo("manager", {
    schema: EmployeeSchema,
    foreignKey: "manager_id"
  }),
  
  subordinates: hasMany("subordinates", {
    schema: EmployeeSchema,
    foreignKey: "manager_id"
  })
});

// Query organization hierarchy
const orgChart = from(EmployeeSchema)
  .where(e => e.managerId.isNull()) // Top level
  .preload(e => e.subordinates.subordinates); // Two levels deep
```

### Virtual Associations

```typescript
// Computed associations
const UserSchema = schema("users", {
  id: f.id(),
  createdAt: f.utcDateTime("created_at", { null: false }),
  
  // Virtual association based on time
  recentPosts: virtual(hasMany("recent_posts", {
    schema: PostSchema,
    foreignKey: "author_id",
    where: p => p.createdAt.gte(thirtyDaysAgo)
  }))
});
```

## Performance Optimization

### N+1 Query Prevention

```typescript
// ❌ Bad: N+1 queries
const users = await repo.all(from(UserSchema));
for (const user of users.data) {
  const posts = await repo.all(
    from(PostSchema).where(p => p.authorId.eq(user.id))
  );
  user.posts = posts.data;
}

// ✅ Good: Single query with preload
const usersWithPosts = await repo.all(
  from(UserSchema).preload(u => u.posts)
);
```

### Selective Loading

```typescript
// Load only needed associations
const getUserForEdit = (userId: number) => {
  return repo.one(
    from(UserSchema)
      .where(u => u.id.eq(userId))
      .preload(u => u.profile)
      // Don't load posts, comments, etc.
  );
};

const getUserForProfile = (userId: number) => {
  return repo.one(
    from(UserSchema)
      .where(u => u.id.eq(userId))
      .preload(u => u.profile)
      .preload(u => u.posts, { limit: 10 })
      .preload(u => u.followers, { limit: 20 })
  );
};
```

### Batch Loading

```typescript
// Load associations in batches
const loadUserPosts = async (userIds: number[]) => {
  const posts = await repo.all(
    from(PostSchema)
      .where(p => p.authorId.in(userIds))
      .orderBy(p => p.createdAt, "DESC")
  );
  
  // Group by user
  const postsByUser = posts.data.reduce((acc, post) => {
    if (!acc[post.authorId]) acc[post.authorId] = [];
    acc[post.authorId].push(post);
    return acc;
  }, {} as Record<number, Post[]>);
  
  return postsByUser;
};
```

## Testing Associations

```typescript
import { test, expect } from "bun:test";

test("user has many posts association", async () => {
  // Create user
  const user = await repo.insert("users", {
    name: "Test User",
    email: "test@example.com"
  });
  
  // Create posts
  await repo.insertAll("posts", [
    { title: "Post 1", authorId: user.data.id },
    { title: "Post 2", authorId: user.data.id }
  ]);
  
  // Load with association
  const userWithPosts = await repo.one(
    from(UserSchema)
      .where(u => u.id.eq(user.data.id))
      .preload(u => u.posts)
  );
  
  expect(userWithPosts.data.posts).toHaveLength(2);
  expect(userWithPosts.data.posts[0].authorId).toBe(user.data.id);
});
```

## Next Steps

- [Transactions](./transactions.md) - Ensure data consistency
- [Performance](./performance.md) - Optimize association queries
- [Migrations](./migrations.md) - Create association tables
- [Custom Adapters](./custom-adapters.md) - Database-specific associations

---

← [Migrations](./migrations.md) | [Back to Documentation](../README.md) | [Transactions](./transactions.md) →