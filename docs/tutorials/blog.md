# Tutorial: Building a Blog Application

This tutorial walks through building a complete blog application with changeset, demonstrating real-world patterns and best practices.

## Project Setup

### Installation

```bash
# Initialize project
mkdir my-blog && cd my-blog
bun init -y

# Install dependencies
bun add changeset
bun add -d @types/node typescript
```

### Project Structure

```
my-blog/
├── src/
│   ├── schemas/
│   │   ├── user.ts
│   │   ├── post.ts
│   │   └── comment.ts
│   ├── repositories/
│   │   ├── user-repository.ts
│   │   ├── post-repository.ts
│   │   └── comment-repository.ts
│   ├── services/
│   │   ├── auth-service.ts
│   │   ├── blog-service.ts
│   │   └── comment-service.ts
│   ├── database.ts
│   └── app.ts
├── package.json
└── tsconfig.json
```

## Step 1: Define Schemas

### User Schema

```typescript
// src/schemas/user.ts
import { schema, f, timestamps } from "changeset";

export const UserSchema = schema("users", {
  id: f.id(),
  
  // Authentication
  email: f.string("email", { null: false, unique: true }),
  username: f.string("username", { null: false, unique: true }),
  passwordHash: f.string("password_hash", { null: false }),
  
  // Profile
  displayName: f.string("display_name", { null: false }),
  bio: f.string("bio"),
  avatar: f.string("avatar_url"),
  website: f.string("website"),
  
  // Status
  role: f.string("role", { default: "user", null: false }),
  isActive: f.boolean("is_active", { default: true }),
  emailVerified: f.boolean("email_verified", { default: false }),
  
  // Stats
  postCount: f.integer("post_count", { default: 0 }),
  followerCount: f.integer("follower_count", { default: 0 }),
  
  // Timestamps
  lastLoginAt: f.utcDateTime("last_login_at"),
  ...timestamps()
});

export type User = typeof UserSchema._type;
```

### Post Schema

```typescript
// src/schemas/post.ts
import { schema, f, timestamps } from "changeset";

export const PostSchema = schema("posts", {
  id: f.id(),
  
  // Content
  title: f.string("title", { null: false }),
  slug: f.string("slug", { null: false, unique: true }),
  content: f.string("content", { null: false }),
  excerpt: f.string("excerpt"),
  coverImage: f.string("cover_image"),
  
  // Relations
  authorId: f.integer("author_id", { null: false }),
  categoryId: f.integer("category_id"),
  
  // Metadata
  tags: f.array("tags"),
  metadata: f.map("metadata"),
  
  // Status
  status: f.string("status", { default: "draft", null: false }),
  publishedAt: f.utcDateTime("published_at"),
  featuredAt: f.utcDateTime("featured_at"),
  
  // SEO
  metaTitle: f.string("meta_title"),
  metaDescription: f.string("meta_description"),
  
  // Stats
  viewCount: f.integer("view_count", { default: 0 }),
  likeCount: f.integer("like_count", { default: 0 }),
  commentCount: f.integer("comment_count", { default: 0 }),
  
  // Settings
  allowComments: f.boolean("allow_comments", { default: true }),
  
  ...timestamps()
});

export type Post = typeof PostSchema._type;
```

### Comment Schema

```typescript
// src/schemas/comment.ts
import { schema, f, timestamps } from "changeset";

export const CommentSchema = schema("comments", {
  id: f.id(),
  
  // Content
  content: f.string("content", { null: false }),
  
  // Relations
  postId: f.integer("post_id", { null: false }),
  authorId: f.integer("author_id", { null: false }),
  parentId: f.integer("parent_id"), // For nested comments
  
  // Status
  status: f.string("status", { default: "pending", null: false }),
  
  // Stats
  likeCount: f.integer("like_count", { default: 0 }),
  
  // Moderation
  flagCount: f.integer("flag_count", { default: 0 }),
  moderatedAt: f.utcDateTime("moderated_at"),
  moderatedBy: f.integer("moderated_by"),
  
  ...timestamps()
});

export type Comment = typeof CommentSchema._type;
```

## Step 2: Database Connection

```typescript
// src/database.ts
import { createSqliteRepo, createRepo } from "changeset";
import type { Repo } from "changeset";

let repository: Repo | null = null;

export const connectDatabase = async (): Promise<Repo> => {
  if (repository) {
    return repository;
  }

  // Use SQLite for development
  if (process.env.NODE_ENV === "development") {
    const result = await createSqliteRepo("./blog.db");
    if (!result.success) {
      throw new Error(`Database connection failed: ${result.error.message}`);
    }
    repository = result.data;
  } else {
    // Use PostgreSQL for production
    const result = await createRepo({
      type: "postgresql",
      config: {
        database: process.env.DATABASE_URL!,
        pool: {
          min: 2,
          max: 10
        }
      }
    });
    
    if (!result.success) {
      throw new Error(`Database connection failed: ${result.error.message}`);
    }
    repository = result.data;
  }

  return repository;
};

export const getRepo = (): Repo => {
  if (!repository) {
    throw new Error("Database not connected. Call connectDatabase() first.");
  }
  return repository;
};

export const closeDatabase = async (): Promise<void> => {
  if (repository) {
    await repository.close();
    repository = null;
  }
};
```

## Step 3: Repository Layer

### User Repository

```typescript
// src/repositories/user-repository.ts
import { from, and } from "changeset";
import { UserSchema, type User } from "../schemas/user";
import { getRepo } from "../database";

export const userRepository = {
  async findById(id: number) {
    const repo = getRepo();
    return repo.one(
      from(UserSchema).where(u => u.id.eq(id))
    );
  },

  async findByEmail(email: string) {
    const repo = getRepo();
    return repo.one(
      from(UserSchema).where(u => u.email.eq(email))
    );
  },

  async findByUsername(username: string) {
    const repo = getRepo();
    return repo.one(
      from(UserSchema).where(u => u.username.eq(username))
    );
  },

  async create(userData: Partial<User>) {
    const repo = getRepo();
    return repo.insert("users", {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  },

  async update(id: number, updates: Partial<User>) {
    const repo = getRepo();
    return repo.update("users", {
      ...updates,
      updatedAt: new Date()
    }, id);
  },

  async updateLoginTime(id: number) {
    const repo = getRepo();
    return repo.update("users", {
      lastLoginAt: new Date()
    }, id);
  },

  async search(query: string, limit = 10) {
    const repo = getRepo();
    return repo.all(
      from(UserSchema)
        .where(u => and(
          u.isActive.eq(true),
          u.displayName.like(`%${query}%`)
        ))
        .limit(limit)
    );
  }
};
```

### Post Repository

```typescript
// src/repositories/post-repository.ts
import { from, and, or } from "changeset";
import { PostSchema, type Post } from "../schemas/post";
import { getRepo } from "../database";

export const postRepository = {
  async findById(id: number) {
    const repo = getRepo();
    return repo.one(
      from(PostSchema).where(p => p.id.eq(id))
    );
  },

  async findBySlug(slug: string) {
    const repo = getRepo();
    return repo.one(
      from(PostSchema).where(p => p.slug.eq(slug))
    );
  },

  async findPublished(limit = 10, offset = 0) {
    const repo = getRepo();
    return repo.all(
      from(PostSchema)
        .where(p => and(
          p.status.eq("published"),
          p.publishedAt.isNotNull(),
          p.publishedAt.lte(new Date())
        ))
        .orderBy(p => p.publishedAt, "DESC")
        .limit(limit)
        .offset(offset)
    );
  },

  async findByAuthor(authorId: number, includeD drafts = false) {
    const repo = getRepo();
    let query = from(PostSchema)
      .where(p => p.authorId.eq(authorId));
    
    if (!includeDrafts) {
      query = query.where(p => p.status.eq("published"));
    }
    
    return repo.all(query.orderBy(p => p.createdAt, "DESC"));
  },

  async findByTag(tag: string) {
    const repo = getRepo();
    // Note: Array operations depend on database
    // This is PostgreSQL syntax
    return repo.all(
      from(PostSchema)
        .where(p => and(
          p.status.eq("published"),
          p.tags.contains([tag]) // PostgreSQL array contains
        ))
    );
  },

  async create(postData: Partial<Post>) {
    const repo = getRepo();
    
    // Generate slug if not provided
    const slug = postData.slug || 
      postData.title?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    
    return repo.insert("posts", {
      ...postData,
      slug,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  },

  async update(id: number, updates: Partial<Post>) {
    const repo = getRepo();
    return repo.update("posts", {
      ...updates,
      updatedAt: new Date()
    }, id);
  },

  async publish(id: number) {
    return this.update(id, {
      status: "published",
      publishedAt: new Date()
    });
  },

  async incrementViewCount(id: number) {
    const repo = getRepo();
    // Note: This is simplified - real implementation would use atomic increment
    const post = await this.findById(id);
    if (post.success && post.data) {
      return repo.update("posts", {
        viewCount: (post.data.viewCount || 0) + 1
      }, id);
    }
    return post;
  },

  async search(query: string, filters?: {
    status?: string;
    authorId?: number;
    categoryId?: number;
  }) {
    const repo = getRepo();
    let q = from(PostSchema);
    
    // Text search
    if (query) {
      q = q.where(p => or(
        p.title.like(`%${query}%`),
        p.content.like(`%${query}%`),
        p.excerpt.like(`%${query}%`)
      ));
    }
    
    // Apply filters
    if (filters?.status) {
      q = q.where(p => p.status.eq(filters.status));
    }
    if (filters?.authorId) {
      q = q.where(p => p.authorId.eq(filters.authorId));
    }
    if (filters?.categoryId) {
      q = q.where(p => p.categoryId.eq(filters.categoryId));
    }
    
    return repo.all(q.orderBy(p => p.createdAt, "DESC"));
  }
};
```

## Step 4: Service Layer

### Authentication Service

```typescript
// src/services/auth-service.ts
import { userRepository } from "../repositories/user-repository";
import type { User } from "../schemas/user";

// Note: This is simplified - use proper password hashing in production
const hashPassword = async (password: string): Promise<string> => {
  // Use bcrypt or argon2 in production
  return `hashed_${password}`;
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  // Use bcrypt or argon2 in production
  return hash === `hashed_${password}`;
};

export const authService = {
  async register(email: string, username: string, password: string) {
    // Check if user exists
    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail.success && existingEmail.data) {
      return { 
        success: false, 
        error: new Error("Email already registered") 
      };
    }
    
    const existingUsername = await userRepository.findByUsername(username);
    if (existingUsername.success && existingUsername.data) {
      return { 
        success: false, 
        error: new Error("Username already taken") 
      };
    }
    
    // Create user
    const passwordHash = await hashPassword(password);
    return userRepository.create({
      email,
      username,
      passwordHash,
      displayName: username,
      role: "user"
    });
  },

  async login(email: string, password: string) {
    // Find user
    const userResult = await userRepository.findByEmail(email);
    
    if (!userResult.success) {
      return userResult;
    }
    
    if (!userResult.data) {
      return { 
        success: false, 
        error: new Error("Invalid credentials") 
      };
    }
    
    // Verify password
    const isValid = await verifyPassword(password, userResult.data.passwordHash);
    if (!isValid) {
      return { 
        success: false, 
        error: new Error("Invalid credentials") 
      };
    }
    
    // Update login time
    await userRepository.updateLoginTime(userResult.data.id);
    
    return { 
      success: true as const, 
      data: userResult.data 
    };
  }
};
```

### Blog Service

```typescript
// src/services/blog-service.ts
import { postRepository } from "../repositories/post-repository";
import { userRepository } from "../repositories/user-repository";
import type { Post } from "../schemas/post";

export const blogService = {
  async createPost(authorId: number, postData: {
    title: string;
    content: string;
    excerpt?: string;
    tags?: string[];
    categoryId?: number;
  }) {
    // Verify author exists
    const author = await userRepository.findById(authorId);
    if (!author.success || !author.data) {
      return { 
        success: false, 
        error: new Error("Author not found") 
      };
    }
    
    // Create post
    const result = await postRepository.create({
      ...postData,
      authorId,
      status: "draft"
    });
    
    // Update author's post count
    if (result.success) {
      await userRepository.update(authorId, {
        postCount: (author.data.postCount || 0) + 1
      });
    }
    
    return result;
  },

  async publishPost(postId: number, authorId: number) {
    // Verify ownership
    const post = await postRepository.findById(postId);
    
    if (!post.success || !post.data) {
      return { 
        success: false, 
        error: new Error("Post not found") 
      };
    }
    
    if (post.data.authorId !== authorId) {
      return { 
        success: false, 
        error: new Error("Unauthorized") 
      };
    }
    
    // Publish
    return postRepository.publish(postId);
  },

  async getPublicFeed(page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;
    return postRepository.findPublished(pageSize, offset);
  },

  async getPostBySlug(slug: string) {
    const result = await postRepository.findBySlug(slug);
    
    // Increment view count if found and published
    if (result.success && result.data && result.data.status === "published") {
      await postRepository.incrementViewCount(result.data.id);
    }
    
    return result;
  },

  async searchPosts(query: string, filters?: any) {
    return postRepository.search(query, filters);
  }
};
```

## Step 5: Application Entry Point

```typescript
// src/app.ts
import { connectDatabase, closeDatabase } from "./database";
import { authService } from "./services/auth-service";
import { blogService } from "./services/blog-service";

async function main() {
  try {
    // Connect to database
    console.log("Connecting to database...");
    await connectDatabase();
    console.log("Database connected!");
    
    // Example: Register a user
    console.log("\n--- Creating user ---");
    const userResult = await authService.register(
      "alice@example.com",
      "alice",
      "password123"
    );
    
    if (userResult.success) {
      console.log("User created:", userResult.data.username);
      
      // Login
      console.log("\n--- Logging in ---");
      const loginResult = await authService.login(
        "alice@example.com",
        "password123"
      );
      
      if (loginResult.success) {
        console.log("Logged in as:", loginResult.data.displayName);
        
        // Create a post
        console.log("\n--- Creating post ---");
        const postResult = await blogService.createPost(
          loginResult.data.id,
          {
            title: "My First Blog Post",
            content: "This is the content of my first blog post...",
            excerpt: "A brief introduction to my blog",
            tags: ["introduction", "first-post"],
            categoryId: 1
          }
        );
        
        if (postResult.success) {
          console.log("Post created:", postResult.data.title);
          
          // Publish the post
          console.log("\n--- Publishing post ---");
          const publishResult = await blogService.publishPost(
            postResult.data.id,
            loginResult.data.id
          );
          
          if (publishResult.success) {
            console.log("Post published!");
            
            // Get public feed
            console.log("\n--- Getting public feed ---");
            const feedResult = await blogService.getPublicFeed();
            
            if (feedResult.success) {
              console.log(`Found ${feedResult.data.length} published posts:`);
              feedResult.data.forEach(post => {
                console.log(`- ${post.title} (${post.status})`);
              });
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error("Application error:", error);
  } finally {
    // Clean up
    await closeDatabase();
    console.log("\nDatabase connection closed");
  }
}

// Run the application
main();
```

## Step 6: Advanced Features

### Comment System

```typescript
// src/repositories/comment-repository.ts
import { from, and } from "changeset";
import { CommentSchema, type Comment } from "../schemas/comment";
import { getRepo } from "../database";

export const commentRepository = {
  async findByPost(postId: number, status = "approved") {
    const repo = getRepo();
    return repo.all(
      from(CommentSchema)
        .where(c => and(
          c.postId.eq(postId),
          c.status.eq(status),
          c.parentId.isNull() // Top-level comments only
        ))
        .orderBy(c => c.createdAt, "DESC")
    );
  },

  async findReplies(parentId: number) {
    const repo = getRepo();
    return repo.all(
      from(CommentSchema)
        .where(c => c.parentId.eq(parentId))
        .orderBy(c => c.createdAt)
    );
  },

  async create(commentData: Partial<Comment>) {
    const repo = getRepo();
    return repo.insert("comments", {
      ...commentData,
      status: "pending", // Moderate by default
      createdAt: new Date(),
      updatedAt: new Date()
    });
  },

  async approve(id: number, moderatorId: number) {
    const repo = getRepo();
    return repo.update("comments", {
      status: "approved",
      moderatedAt: new Date(),
      moderatedBy: moderatorId
    }, id);
  }
};
```

### Search and Filtering

```typescript
// src/services/search-service.ts
import { from, and, or } from "changeset";
import { PostSchema } from "../schemas/post";
import { UserSchema } from "../schemas/user";
import { getRepo } from "../database";

export const searchService = {
  async globalSearch(query: string) {
    const repo = getRepo();
    
    // Search posts
    const postsPromise = repo.all(
      from(PostSchema)
        .where(p => and(
          p.status.eq("published"),
          or(
            p.title.like(`%${query}%`),
            p.content.like(`%${query}%`)
          )
        ))
        .limit(5)
    );
    
    // Search users
    const usersPromise = repo.all(
      from(UserSchema)
        .where(u => and(
          u.isActive.eq(true),
          or(
            u.displayName.like(`%${query}%`),
            u.username.like(`%${query}%`)
          )
        ))
        .limit(5)
    );
    
    const [posts, users] = await Promise.all([postsPromise, usersPromise]);
    
    return {
      posts: posts.success ? posts.data : [],
      users: users.success ? users.data : []
    };
  },

  async advancedPostSearch(criteria: {
    query?: string;
    authorId?: number;
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    minViews?: number;
  }) {
    const repo = getRepo();
    let q = from(PostSchema)
      .where(p => p.status.eq("published"));
    
    if (criteria.query) {
      q = q.where(p => or(
        p.title.like(`%${criteria.query}%`),
        p.content.like(`%${criteria.query}%`)
      ));
    }
    
    if (criteria.authorId) {
      q = q.where(p => p.authorId.eq(criteria.authorId));
    }
    
    if (criteria.dateFrom) {
      q = q.where(p => p.publishedAt.gte(criteria.dateFrom));
    }
    
    if (criteria.dateTo) {
      q = q.where(p => p.publishedAt.lte(criteria.dateTo));
    }
    
    if (criteria.minViews) {
      q = q.where(p => p.viewCount.gte(criteria.minViews));
    }
    
    return repo.all(q.orderBy(p => p.publishedAt, "DESC"));
  }
};
```

## Step 7: Testing

```typescript
// src/tests/blog.test.ts
import { test, expect, beforeEach, afterEach } from "bun:test";
import { connectDatabase, closeDatabase } from "../database";
import { authService } from "../services/auth-service";
import { blogService } from "../services/blog-service";

beforeEach(async () => {
  await connectDatabase();
});

afterEach(async () => {
  await closeDatabase();
});

test("user registration and login", async () => {
  // Register
  const registerResult = await authService.register(
    "test@example.com",
    "testuser",
    "password123"
  );
  
  expect(registerResult.success).toBe(true);
  if (registerResult.success) {
    expect(registerResult.data.email).toBe("test@example.com");
  }
  
  // Login
  const loginResult = await authService.login(
    "test@example.com",
    "password123"
  );
  
  expect(loginResult.success).toBe(true);
});

test("create and publish post", async () => {
  // Create author
  const author = await authService.register(
    "author@example.com",
    "author",
    "password"
  );
  
  expect(author.success).toBe(true);
  if (!author.success) return;
  
  // Create post
  const post = await blogService.createPost(author.data.id, {
    title: "Test Post",
    content: "Test content"
  });
  
  expect(post.success).toBe(true);
  if (!post.success) return;
  
  expect(post.data.status).toBe("draft");
  
  // Publish
  const published = await blogService.publishPost(
    post.data.id,
    author.data.id
  );
  
  expect(published.success).toBe(true);
  if (published.success) {
    expect(published.data.status).toBe("published");
    expect(published.data.publishedAt).toBeDefined();
  }
});
```

## Best Practices Demonstrated

1. **Separation of Concerns**: Clear layers (schemas, repositories, services)
2. **Type Safety**: Full TypeScript types throughout
3. **Error Handling**: Consistent Result type usage
4. **Functional Approach**: No classes, pure functions
5. **Testability**: Easy to test each layer independently
6. **Scalability**: Structure supports growth

## Next Steps

- Add caching layer for frequently accessed data
- Implement full-text search with PostgreSQL
- Add GraphQL API layer
- Implement real-time updates with WebSockets
- Add comprehensive validation
- Implement rate limiting
- Add analytics tracking

## Conclusion

This tutorial demonstrated building a complete blog application with changeset, showcasing:

- Schema definition and type inference
- Repository pattern for data access
- Service layer for business logic
- Query building with type safety
- Error handling with Result types
- Testing strategies

The functional approach keeps the code predictable, testable, and maintainable while providing full type safety throughout the application.

---

← [Tutorials](../README.md#tutorials) | [Back to Documentation](../README.md) →