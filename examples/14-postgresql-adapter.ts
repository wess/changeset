// Example of using PostgreSQL adapter with advanced features

import { connectPostgres, postgres } from "../src/connection/adapters.ts";
import { createRepo } from "../src/repo/repo.ts";
import { createSchema, f } from "../src/schema/index.ts";
import { from } from "../src/query/index.ts";

// Define schemas with PostgreSQL-specific types
const UserSchema = createSchema("User", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { null: false }),
  profile: f.string("profile"), // JSONB in PostgreSQL
  tags: f.string("tags"), // TEXT[] in PostgreSQL  
  createdAt: f.utcDateTime("created_at", { null: false }),
  updatedAt: f.utcDateTime("updated_at"),
});

const PostSchema = createSchema("Post", {
  id: f.id(),
  title: f.string("title", { null: false }),
  content: f.string("content", { null: false }),
  authorId: f.string("author_id", { null: false }),
  metadata: f.string("metadata"), // JSONB in PostgreSQL
  published: f.boolean("published", { default: false }),
  publishedAt: f.utcDateTime("published_at"),
});

async function demonstratePostgresAdapter() {
  // Skip if no PostgreSQL URL provided
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    console.log("No POSTGRES_URL provided, skipping PostgreSQL example");
    return;
  }

  console.log("🐘 Demonstrating PostgreSQL Adapter");

  try {
    // Connect using different methods
    console.log("\\n1. Connection Methods:");
    
    // Method 1: URL string
    const db1 = connectPostgres(postgresUrl);
    
    // Method 2: Configuration object
    const db2 = connectPostgres({
      host: "localhost",
      port: 5432,
      database: "changeset_example",
      user: "postgres",
      password: "password",
      ssl: false,
      max: 10,
    });
    
    // Method 3: Using generic connect function
    const db3 = connectPostgres(postgres(postgresUrl));

    // Use db1 for the rest of the example
    const db = db1;
    
    // Test connection
    const connectResult = await db.connect();
    if (!connectResult.success) {
      console.error("❌ Connection failed:", connectResult.error);
      return;
    }
    console.log("✅ Connected to PostgreSQL");

    // Create repositories
    const userRepo = createRepo(UserSchema, db);
    const postRepo = createRepo(PostSchema, db);

    console.log("\\n2. Creating Tables with PostgreSQL-specific features:");
    
    // Create users table with PostgreSQL-specific columns
    await db.createTable("users", [
      "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
      "name VARCHAR(255) NOT NULL",
      "email VARCHAR(255) UNIQUE NOT NULL", 
      "profile JSONB",
      "tags TEXT[]",
      "created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
      "updated_at TIMESTAMP WITH TIME ZONE",
    ]);
    console.log("✅ Created users table with UUID, JSONB, and array columns");

    // Create posts table
    await db.createTable("posts", [
      "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
      "title VARCHAR(255) NOT NULL",
      "content TEXT NOT NULL",
      "author_id UUID NOT NULL REFERENCES users(id)",
      "metadata JSONB",
      "published BOOLEAN DEFAULT false",
      "published_at TIMESTAMP WITH TIME ZONE",
      "created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
    ]);
    console.log("✅ Created posts table with foreign key constraints");

    console.log("\\n3. Creating Indexes:");
    
    // Create various types of indexes
    await db.createIndex("idx_users_email", "users", ["email"], true);
    await db.createIndex("idx_users_tags", "users", ["tags"]);
    await db.createIndex("idx_posts_author", "posts", ["author_id"]);
    await db.createIndex("idx_posts_published", "posts", ["published", "published_at"]);
    console.log("✅ Created indexes including unique and composite indexes");

    console.log("\\n4. Inserting Data with PostgreSQL Features:");

    // Insert user with JSONB and array data
    const userResult = await db.execute({
      sql: `
        INSERT INTO users (name, email, profile, tags) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id, created_at
      `,
      params: [
        "John Doe",
        "john@example.com", 
        JSON.stringify({
          bio: "Software developer",
          preferences: { theme: "dark", notifications: true },
          social: { twitter: "@johndoe", github: "johndoe" }
        }),
        ["developer", "typescript", "postgresql"]
      ],
    });

    if (!userResult.success) {
      console.error("❌ Failed to insert user:", userResult.error);
      return;
    }
    
    console.log("✅ Inserted user with JSONB profile and TEXT[] tags");

    // Get the user ID from the result
    const userId = userResult.data?.lastInsertRowid || "1";

    // Insert post with JSONB metadata
    await db.execute({
      sql: `
        INSERT INTO posts (title, content, author_id, metadata, published, published_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      `,
      params: [
        "Getting Started with PostgreSQL",
        "PostgreSQL is a powerful, open-source relational database...",
        userId,
        JSON.stringify({
          readTime: 5,
          difficulty: "beginner",
          topics: ["database", "sql", "postgresql"],
          seo: {
            keywords: ["postgresql", "database", "tutorial"],
            description: "Learn PostgreSQL basics"
          }
        }),
        true
      ],
    });
    console.log("✅ Inserted post with JSONB metadata");

    console.log("\\n5. Querying with PostgreSQL-specific Features:");

    // Query users with JSONB operations
    const usersWithDarkTheme = await db.query({
      sql: "SELECT name, email, profile->>'bio' as bio FROM users WHERE profile->'preferences'->>'theme' = $1",
      params: ["dark"],
    });
    console.log("✅ Queried users with dark theme preference:", usersWithDarkTheme.data);

    // Query users with array operations
    const typescriptDevelopers = await db.query({
      sql: "SELECT name, tags FROM users WHERE $1 = ANY(tags)",
      params: ["typescript"],
    });
    console.log("✅ Found TypeScript developers:", typescriptDevelopers.data);

    // Complex query with joins and JSONB
    const postsWithAuthors = await db.query({
      sql: `
        SELECT 
          p.title,
          p.metadata->>'readTime' as read_time,
          u.name as author_name,
          u.profile->>'bio' as author_bio
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.published = true
        ORDER BY p.created_at DESC
      `,
      params: [],
    });
    console.log("✅ Posts with author details:", postsWithAuthors.data);

    console.log("\\n6. Using Repository Pattern with PostgreSQL:");

    // Use the repository for high-level operations
    const allUsers = await userRepo.all();
    console.log("✅ All users via repository:", allUsers.data?.length);

    // Use query builder with PostgreSQL
    const publishedPosts = await postRepo.all(
      from(PostSchema)
        .where((p) => p.published.eq(true))
        .orderBy("publishedAt", "desc")
        .limit(10)
    );
    console.log("✅ Published posts via query builder:", publishedPosts.data?.length);

    console.log("\\n7. Transaction Example:");

    const transactionResult = await db.transaction(async () => {
      // Update user profile
      await db.execute({
        sql: "UPDATE users SET profile = profile || $1 WHERE email = $2",
        params: [
          JSON.stringify({ lastLogin: new Date().toISOString() }),
          "john@example.com"
        ],
      });

      // Create a new post
      await db.execute({
        sql: `
          INSERT INTO posts (title, content, author_id, metadata)
          VALUES ($1, $2, $3, $4)
        `,
        params: [
          "Advanced PostgreSQL Features",
          "Learn about JSONB, arrays, and more...",
          userId,
          JSON.stringify({ readTime: 10, difficulty: "advanced" })
        ],
      });

      return "Transaction completed successfully";
    });

    if (transactionResult.success) {
      console.log("✅ Transaction:", transactionResult.data);
    } else {
      console.error("❌ Transaction failed:", transactionResult.error);
    }

    console.log("\\n8. Database Maintenance:");

    // Analyze tables for query optimization
    const analyzeResult = await db.analyze();
    if (analyzeResult.success) {
      console.log("✅ Database analyzed for query optimization");
    }

    // Vacuum for space reclamation
    const vacuumResult = await db.vacuum();
    if (vacuumResult.success) {
      console.log("✅ Database vacuumed for space optimization");
    }

    console.log("\\n9. Raw Database Access:");

    // Get raw pg Pool for advanced operations
    const pool = db.getRawDatabase();
    const rawResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        attname,
        typename,
        attlen
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
      JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_catalog.pg_type t ON a.atttypid = t.oid
      WHERE n.nspname = 'public' 
        AND c.relname IN ('users', 'posts')
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY c.relname, a.attnum
    `);
    
    console.log("✅ Table schema inspection via raw pool:");
    rawResult.rows.forEach(row => {
      console.log(`  ${row.tablename}.${row.attname}: ${row.typename}`);
    });

    // Clean up
    console.log("\\n10. Cleanup:");
    await db.dropTable("posts");
    await db.dropTable("users");
    console.log("✅ Cleaned up tables");

    await db.disconnect();
    console.log("✅ Disconnected from PostgreSQL");

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// PostgreSQL-specific features showcase
export const postgresFeatures = {
  // JSON/JSONB operations
  jsonOperations: `
    -- Store and query JSON data
    SELECT profile->>'name' as name 
    FROM users 
    WHERE profile->'preferences'->>'theme' = 'dark';
    
    -- Update JSON fields
    UPDATE users 
    SET profile = profile || '{"lastLogin": "2024-01-01"}'::jsonb
    WHERE id = $1;
  `,

  // Array operations  
  arrayOperations: `
    -- Query array fields
    SELECT * FROM users WHERE 'typescript' = ANY(tags);
    
    -- Add to array
    UPDATE users 
    SET tags = array_append(tags, 'postgresql')
    WHERE id = $1;
  `,

  // Advanced indexing
  advancedIndexes: `
    -- GIN index for JSONB
    CREATE INDEX idx_users_profile_gin ON users USING GIN (profile);
    
    -- Partial index
    CREATE INDEX idx_published_posts ON posts (created_at) 
    WHERE published = true;
    
    -- Expression index
    CREATE INDEX idx_users_email_lower ON users (LOWER(email));
  `,

  // Window functions
  windowFunctions: `
    -- Rank posts by author
    SELECT 
      title,
      author_id,
      ROW_NUMBER() OVER (PARTITION BY author_id ORDER BY created_at DESC) as post_rank
    FROM posts;
  `,

  // Common Table Expressions (CTEs)
  cteExamples: `
    -- Recursive CTE for hierarchical data
    WITH RECURSIVE post_thread AS (
      SELECT id, title, parent_id, 1 as level
      FROM posts WHERE parent_id IS NULL
      
      UNION ALL
      
      SELECT p.id, p.title, p.parent_id, pt.level + 1
      FROM posts p
      JOIN post_thread pt ON p.parent_id = pt.id
    )
    SELECT * FROM post_thread ORDER BY level, id;
  `,
};

export { demonstratePostgresAdapter };

// Run the example if this file is executed directly
if (import.meta.main) {
  demonstratePostgresAdapter();
}