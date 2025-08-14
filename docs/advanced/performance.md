# Performance Optimization

Optimize your changeset applications for maximum performance and scalability.

## Query Optimization

### Index Usage

```typescript
// Ensure indexes are used effectively
const optimizedQuery = from(UserSchema)
  .where(u => u.email.eq("user@example.com")) // Use email index
  .where(u => u.active.eq(true))              // Filter after index lookup
  .limit(1);

// Check query plan
const explainResult = await repo.execute(`
  EXPLAIN ANALYZE 
  SELECT * FROM users 
  WHERE email = $1 AND active = $2 
  LIMIT 1
`, ["user@example.com", true]);

console.log("Query plan:", explainResult.rows);
```

### Composite Indexes

```typescript
// Migration for composite index
export const up = async (db) => {
  // Composite index for common query patterns
  await db.execute(`
    CREATE INDEX idx_users_active_created 
    ON users(active, created_at DESC)
    WHERE active = true
  `);
  
  // Covering index includes all needed columns
  await db.execute(`
    CREATE INDEX idx_posts_author_status_published 
    ON posts(author_id, status, published_at) 
    INCLUDE (title, excerpt)
  `);
};

// Query that uses composite index
const recentActiveUsers = from(UserSchema)
  .where(u => u.active.eq(true))
  .orderBy(u => u.createdAt, "DESC")
  .limit(20);
```

### Query Planning

```typescript
// Analyze query performance
const analyzeQuery = async (query: Query<any>) => {
  const sql = query.toSql();
  
  // PostgreSQL EXPLAIN
  const plan = await repo.execute(`EXPLAIN (ANALYZE, BUFFERS) ${sql.sql}`, sql.params);
  
  // Extract metrics
  const metrics = {
    executionTime: plan.rows[0]['Execution Time'],
    planningTime: plan.rows[0]['Planning Time'],
    buffers: plan.rows[0]['Buffers'],
    rows: plan.rows[0]['Actual Rows']
  };
  
  return metrics;
};

// Use for optimization
const metrics = await analyzeQuery(complexQuery);
if (metrics.executionTime > 100) {
  console.warn("Slow query detected:", metrics);
}
```

## N+1 Query Prevention

### Problem Example

```typescript
// ❌ Bad: N+1 queries
const posts = await repo.all(from(PostSchema));

for (const post of posts.data) {
  // Each iteration makes a query
  const author = await repo.one(
    from(UserSchema).where(u => u.id.eq(post.authorId))
  );
  
  const comments = await repo.all(
    from(CommentSchema).where(c => c.postId.eq(post.id))
  );
  
  post.author = author.data;
  post.comments = comments.data;
}
// Total queries: 1 + (N * 2) where N = number of posts
```

### Solution: Preloading

```typescript
// ✅ Good: Single query with joins
const postsWithData = await repo.all(
  from(PostSchema)
    .preload(p => p.author)
    .preload(p => p.comments)
);
// Total queries: 3 (one for each table)
```

### Solution: Batch Loading

```typescript
// ✅ Good: Batch load related data
const posts = await repo.all(from(PostSchema));
const postIds = posts.data.map(p => p.id);
const authorIds = [...new Set(posts.data.map(p => p.authorId))];

// Load all authors in one query
const authors = await repo.all(
  from(UserSchema).where(u => u.id.in(authorIds))
);

// Load all comments in one query  
const comments = await repo.all(
  from(CommentSchema).where(c => c.postId.in(postIds))
);

// Map data
const authorsMap = new Map(authors.data.map(a => [a.id, a]));
const commentsMap = new Map<number, Comment[]>();
comments.data.forEach(c => {
  if (!commentsMap.has(c.postId)) {
    commentsMap.set(c.postId, []);
  }
  commentsMap.get(c.postId)!.push(c);
});

// Combine
posts.data.forEach(post => {
  post.author = authorsMap.get(post.authorId);
  post.comments = commentsMap.get(post.id) || [];
});
// Total queries: 3
```

## Connection Pooling

### PostgreSQL Pool Configuration

```typescript
const repo = await createRepo({
  type: "postgresql",
  config: {
    database: "postgresql://localhost/myapp",
    pool: {
      min: 2,                    // Minimum connections
      max: 10,                   // Maximum connections
      idleTimeoutMillis: 30000,  // Close idle connections after 30s
      connectionTimeoutMillis: 2000, // Fail if can't connect in 2s
      maxUses: 7500,            // Close connection after N uses
      
      // Connection lifecycle hooks
      onConnect: async (client) => {
        // Set session parameters
        await client.query("SET statement_timeout = '30s'");
        await client.query("SET lock_timeout = '10s'");
      },
      
      onAcquire: (client) => {
        console.log("Connection acquired");
      },
      
      onRelease: (client) => {
        console.log("Connection released");
      }
    }
  }
});
```

### Connection Pool Monitoring

```typescript
// Monitor pool health
const getPoolStats = () => {
  const pool = repo.getPool();
  
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    active: pool.totalCount - pool.idleCount,
    utilization: ((pool.totalCount - pool.idleCount) / pool.totalCount) * 100
  };
};

// Log pool metrics
setInterval(() => {
  const stats = getPoolStats();
  console.log("Pool stats:", stats);
  
  if (stats.utilization > 80) {
    console.warn("High pool utilization:", stats.utilization);
  }
}, 60000);
```

### Dynamic Pool Sizing

```typescript
// Adjust pool size based on load
const dynamicPool = {
  min: 2,
  max: 10,
  
  // Adjust based on time of day
  getMax: () => {
    const hour = new Date().getHours();
    
    // Peak hours (9 AM - 6 PM)
    if (hour >= 9 && hour <= 18) {
      return 20;
    }
    
    // Off-peak
    return 5;
  }
};
```

## Caching Strategies

### Query Result Caching

```typescript
// Simple in-memory cache
class QueryCache {
  private cache = new Map<string, { data: any; expires: number }>();
  
  get(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(key: string, data: any, ttl = 60000) {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }
  
  invalidate(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const cache = new QueryCache();

// Cached repository wrapper
const cachedRepo = {
  async all<T>(query: Query<T>, ttl?: number) {
    const key = JSON.stringify(query);
    
    // Check cache
    const cached = cache.get(key);
    if (cached) {
      return { success: true, data: cached };
    }
    
    // Execute query
    const result = await repo.all(query);
    
    // Cache successful results
    if (result.success) {
      cache.set(key, result.data, ttl);
    }
    
    return result;
  }
};
```

### Redis Caching

```typescript
// Redis cache adapter
import { createClient } from "redis";

const redis = createClient();
await redis.connect();

const redisCache = {
  async get(key: string) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },
  
  async set(key: string, value: any, ttl = 3600) {
    await redis.setEx(key, ttl, JSON.stringify(value));
  },
  
  async invalidate(pattern: string) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  }
};

// Cache frequently accessed data
const getCachedUser = async (userId: number) => {
  const cacheKey = `user:${userId}`;
  
  // Check cache
  const cached = await redisCache.get(cacheKey);
  if (cached) return cached;
  
  // Load from database
  const result = await repo.one(
    from(UserSchema).where(u => u.id.eq(userId))
  );
  
  if (result.success && result.data) {
    // Cache for 1 hour
    await redisCache.set(cacheKey, result.data, 3600);
  }
  
  return result.data;
};
```

### Cache Invalidation

```typescript
// Invalidate cache on updates
const updateUser = async (userId: number, updates: any) => {
  const result = await repo.update("users", updates, userId);
  
  if (result.success) {
    // Invalidate user cache
    await redisCache.invalidate(`user:${userId}`);
    
    // Invalidate related caches
    await redisCache.invalidate(`posts:author:${userId}`);
    await redisCache.invalidate(`user:list:*`);
  }
  
  return result;
};

// Time-based invalidation
const getUserWithTTL = async (userId: number) => {
  const cacheKey = `user:${userId}`;
  const ttl = 300; // 5 minutes
  
  return await cachedQuery(
    cacheKey,
    () => repo.one(from(UserSchema).where(u => u.id.eq(userId))),
    ttl
  );
};
```

## Batch Operations

### Bulk Inserts

```typescript
// Efficient bulk insert
const bulkInsert = async (records: any[]) => {
  const BATCH_SIZE = 1000;
  const results = [];
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    // PostgreSQL COPY for maximum speed
    if (repo.type === "postgresql") {
      const copyStream = `
        COPY users (name, email, created_at) 
        FROM STDIN 
        WITH (FORMAT csv, HEADER false)
      `;
      
      const csv = batch.map(r => 
        `${r.name},${r.email},${r.createdAt}`
      ).join('\n');
      
      await repo.execute(copyStream, csv);
    } else {
      // Regular batch insert
      const result = await repo.insertAll("users", batch);
      results.push(result);
    }
  }
  
  return results;
};
```

### Batch Updates

```typescript
// Update multiple records efficiently
const batchUpdate = async (updates: Array<{ id: number; data: any }>) => {
  // Build CASE statements for PostgreSQL
  const setClauses = Object.keys(updates[0].data).map(field => {
    const cases = updates.map(u => 
      `WHEN id = ${u.id} THEN ${repo.escape(u.data[field])}`
    ).join(' ');
    
    return `${field} = CASE ${cases} END`;
  });
  
  const ids = updates.map(u => u.id);
  
  const sql = `
    UPDATE users 
    SET ${setClauses.join(', ')}, 
        updated_at = NOW()
    WHERE id IN (${ids.join(',')})
  `;
  
  return await repo.execute(sql);
};
```

## Pagination Optimization

### Cursor-Based Pagination

```typescript
// More efficient than OFFSET for large datasets
const cursorPaginate = async (cursor?: string, limit = 20) => {
  let query = from(PostSchema)
    .orderBy(p => p.createdAt, "DESC")
    .limit(limit + 1); // Fetch one extra to check for more
  
  if (cursor) {
    const [timestamp, id] = cursor.split(':');
    query = query.where(p => or(
      p.createdAt.lt(new Date(timestamp)),
      and(
        p.createdAt.eq(new Date(timestamp)),
        p.id.lt(parseInt(id))
      )
    ));
  }
  
  const result = await repo.all(query);
  
  if (!result.success) return result;
  
  const hasMore = result.data.length > limit;
  const items = hasMore ? result.data.slice(0, -1) : result.data;
  
  const nextCursor = hasMore 
    ? `${items[items.length - 1].createdAt.toISOString()}:${items[items.length - 1].id}`
    : null;
  
  return {
    success: true,
    data: {
      items,
      nextCursor,
      hasMore
    }
  };
};
```

### Keyset Pagination

```typescript
// Efficient pagination without OFFSET
const keysetPaginate = async (
  lastId?: number,
  limit = 20,
  direction: 'next' | 'prev' = 'next'
) => {
  let query = from(UserSchema).limit(limit);
  
  if (lastId) {
    if (direction === 'next') {
      query = query.where(u => u.id.gt(lastId))
        .orderBy(u => u.id);
    } else {
      query = query.where(u => u.id.lt(lastId))
        .orderBy(u => u.id, "DESC");
    }
  } else {
    query = query.orderBy(u => u.id);
  }
  
  const result = await repo.all(query);
  
  if (result.success && direction === 'prev') {
    result.data.reverse();
  }
  
  return result;
};
```

## Database-Specific Optimizations

### PostgreSQL

```typescript
// Parallel query execution
await repo.execute(`
  SET max_parallel_workers_per_gather = 4;
  SET parallel_tuple_cost = 0.1;
  SET parallel_setup_cost = 100;
`);

// Materialized views for complex queries
await repo.execute(`
  CREATE MATERIALIZED VIEW user_stats AS
  SELECT 
    u.id,
    u.name,
    COUNT(DISTINCT p.id) as post_count,
    COUNT(DISTINCT c.id) as comment_count,
    MAX(p.created_at) as last_post_at
  FROM users u
  LEFT JOIN posts p ON p.author_id = u.id
  LEFT JOIN comments c ON c.user_id = u.id
  GROUP BY u.id, u.name;
  
  CREATE INDEX ON user_stats(id);
`);

// Refresh materialized view
await repo.execute(`REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats`);

// Table partitioning for large tables
await repo.execute(`
  CREATE TABLE posts_2024 PARTITION OF posts
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
`);
```

### SQLite

```typescript
// SQLite optimizations
await repo.execute(`
  -- Enable query optimizer
  PRAGMA optimize;
  
  -- Increase cache size (in pages, -2000 = 2MB)
  PRAGMA cache_size = -2000;
  
  -- Use WAL mode for better concurrency
  PRAGMA journal_mode = WAL;
  
  -- Synchronous mode for performance (less safe)
  PRAGMA synchronous = NORMAL;
  
  -- Memory-mapped I/O
  PRAGMA mmap_size = 268435456; -- 256MB
`);

// Analyze tables for better query plans
await repo.execute(`ANALYZE users`);
await repo.execute(`ANALYZE posts`);
```

## Query Profiling

### Performance Monitoring

```typescript
// Query profiler middleware
const profileQuery = async <T>(
  name: string,
  query: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  
  try {
    const result = await query();
    const duration = performance.now() - start;
    
    // Log slow queries
    if (duration > 100) {
      console.warn(`Slow query [${name}]: ${duration.toFixed(2)}ms`);
    }
    
    // Track metrics
    metrics.recordQuery(name, duration);
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    metrics.recordError(name, duration);
    throw error;
  }
};

// Usage
const users = await profileQuery(
  "getUserList",
  () => repo.all(from(UserSchema).limit(100))
);
```

### Query Statistics

```typescript
class QueryStats {
  private stats = new Map<string, {
    count: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
    errors: number;
  }>();
  
  record(name: string, duration: number, error = false) {
    const stat = this.stats.get(name) || {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: 0
    };
    
    stat.count++;
    stat.totalTime += duration;
    stat.minTime = Math.min(stat.minTime, duration);
    stat.maxTime = Math.max(stat.maxTime, duration);
    if (error) stat.errors++;
    
    this.stats.set(name, stat);
  }
  
  getReport() {
    const report = [];
    
    for (const [name, stat] of this.stats.entries()) {
      report.push({
        name,
        count: stat.count,
        avgTime: stat.totalTime / stat.count,
        minTime: stat.minTime,
        maxTime: stat.maxTime,
        totalTime: stat.totalTime,
        errorRate: (stat.errors / stat.count) * 100
      });
    }
    
    return report.sort((a, b) => b.totalTime - a.totalTime);
  }
}

const queryStats = new QueryStats();
```

## Memory Optimization

### Stream Processing

```typescript
// Process large datasets without loading all into memory
const processLargeDataset = async () => {
  const CHUNK_SIZE = 1000;
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const chunk = await repo.all(
      from(UserSchema)
        .orderBy(u => u.id)
        .limit(CHUNK_SIZE)
        .offset(offset)
    );
    
    if (!chunk.success || chunk.data.length === 0) {
      hasMore = false;
      break;
    }
    
    // Process chunk
    for (const user of chunk.data) {
      await processUser(user);
    }
    
    // Clear references for GC
    chunk.data.length = 0;
    
    offset += CHUNK_SIZE;
    hasMore = chunk.data.length === CHUNK_SIZE;
    
    // Allow GC to run
    if (global.gc) global.gc();
  }
};
```

### Result Streaming

```typescript
// PostgreSQL cursor for streaming
const streamQuery = async (query: string, params: any[]) => {
  const client = await repo.getClient();
  const cursorName = `cursor_${Date.now()}`;
  
  try {
    await client.query('BEGIN');
    await client.query(`DECLARE ${cursorName} CURSOR FOR ${query}`, params);
    
    while (true) {
      const result = await client.query(`FETCH 100 FROM ${cursorName}`);
      
      if (result.rows.length === 0) break;
      
      // Process batch
      for (const row of result.rows) {
        await processRow(row);
      }
    }
    
    await client.query(`CLOSE ${cursorName}`);
    await client.query('COMMIT');
  } finally {
    client.release();
  }
};
```

## Best Practices

### 1. Measure First

```typescript
// Always measure before optimizing
const benchmark = async (name: string, fn: () => Promise<any>) => {
  const iterations = 100;
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  
  console.log(`${name}:`, {
    avg: times.reduce((a, b) => a + b) / times.length,
    min: Math.min(...times),
    max: Math.max(...times),
    p95: times.sort()[Math.floor(times.length * 0.95)]
  });
};
```

### 2. Use EXPLAIN

```typescript
// Always check query plans
const explainQuery = async (query: Query<any>) => {
  const sql = query.toSql();
  const plan = await repo.execute(
    `EXPLAIN (FORMAT JSON, ANALYZE) ${sql.sql}`,
    sql.params
  );
  
  console.log(JSON.stringify(plan.rows[0], null, 2));
};
```

### 3. Monitor Production

```typescript
// Track real-world performance
const monitor = {
  slowQueries: [],
  
  async trackQuery(query: string, duration: number) {
    if (duration > 1000) {
      this.slowQueries.push({
        query,
        duration,
        timestamp: new Date()
      });
      
      // Alert on critical slowness
      if (duration > 5000) {
        await alertOps(`Critical slow query: ${duration}ms`);
      }
    }
  }
};
```

## Next Steps

- [Custom Adapters](./custom-adapters.md) - Database-specific optimizations
- [Migrations](./migrations.md) - Schema optimization
- [Transactions](./transactions.md) - Transaction performance
- [Associations](./associations.md) - Optimize related queries

---

← [Transactions](./transactions.md) | [Back to Documentation](../README.md) | [Custom Adapters](./custom-adapters.md) →