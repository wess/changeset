# Advanced Topics

Dive deep into changeset's advanced features and concepts.

## 📚 Advanced Guides

### [🔄 Migrations](./migrations.md)
Database schema version control and evolution.

- **Creating Migrations** - Generate and structure schema changes
- **Migration Types** - Schema, data, and index migrations  
- **Database-Specific Features** - PostgreSQL and SQLite optimizations
- **Best Practices** - Atomic, reversible, and safe migrations
- **Testing** - Validate migration correctness

### [🔗 Associations](./associations.md) 
Define and work with relationships between schemas.

- **Association Types** - `belongsTo`, `hasMany`, `hasOne`, `manyToMany`
- **Loading Strategies** - Preloading, lazy loading, batch loading
- **Advanced Queries** - Joins, filtering, aggregating associations
- **Performance** - N+1 prevention and optimization
- **Complex Patterns** - Polymorphic, self-referential, virtual associations

### [⚡ Transactions](./transactions.md)
Ensure data consistency and atomicity.

- **ACID Properties** - Atomicity, consistency, isolation, durability
- **Transaction Patterns** - Transfer, batch, saga patterns
- **Isolation Levels** - Control transaction concurrency
- **Locking Strategies** - Pessimistic and optimistic locking
- **Error Handling** - Deadlocks, serialization failures, retry logic

### [🚀 Performance](./performance.md)
Optimize your changeset applications.

- **Query Optimization** - Indexes, query planning, EXPLAIN
- **N+1 Prevention** - Preloading and batch loading strategies
- **Connection Pooling** - Configuration and monitoring
- **Caching Strategies** - Query results, Redis integration
- **Database-Specific** - PostgreSQL and SQLite optimizations

### [🔧 Custom Adapters](./custom-adapters.md)
Create adapters for additional databases.

- **Adapter Interface** - Core structure and requirements
- **Database Examples** - MongoDB, Redis implementations
- **Extending Adapters** - Add custom methods and features
- **Testing** - Comprehensive adapter test suites
- **Best Practices** - Connection pooling, retry logic, validation

## 🎯 When to Use Advanced Features

### Migrations
- **When**: Managing schema changes across environments
- **Use cases**: Adding columns, indexes, data transformations
- **Benefits**: Version control, rollback capability, team collaboration

### Associations
- **When**: Working with related data across multiple tables
- **Use cases**: User profiles, blog posts with comments, order systems
- **Benefits**: Type safety, efficient queries, clean data modeling

### Transactions
- **When**: Operations must succeed or fail atomically
- **Use cases**: Financial transfers, multi-step workflows
- **Benefits**: Data consistency, error recovery, concurrent safety

### Performance
- **When**: Scaling to larger datasets or higher concurrency
- **Use cases**: Slow queries, high traffic applications
- **Benefits**: Faster responses, better resource utilization

### Custom Adapters
- **When**: Need to support databases not included by default
- **Use cases**: NoSQL databases, cloud services, legacy systems
- **Benefits**: Unified API, changeset features with any database

## 📖 Learning Path

### Beginner → Intermediate
1. Start with [Core Concepts](../core-concepts.md)
2. Master [Schema Definition](../guides/schemas.md)
3. Learn [Query Building](../guides/queries.md)
4. Understand [Repository Pattern](../guides/repository.md)

### Intermediate → Advanced
1. **Associations** - Model complex relationships
2. **Transactions** - Ensure data consistency
3. **Performance** - Optimize for scale
4. **Migrations** - Manage schema evolution

### Advanced → Expert
1. **Custom Adapters** - Support any database
2. **Performance Tuning** - Database-specific optimizations
3. **Advanced Patterns** - Sagas, event sourcing, CQRS
4. **Production Setup** - Monitoring, alerting, troubleshooting

## 🔗 Cross-References

### Related Core Guides
- [Schema Definition](../guides/schemas.md) → Use with [Associations](./associations.md)
- [Query Building](../guides/queries.md) → Optimize with [Performance](./performance.md)  
- [Repository Pattern](../guides/repository.md) → Enhance with [Transactions](./transactions.md)

### Integration Examples
- **Blog Tutorial** - See [Building a Blog](../tutorials/blog.md) for real-world patterns
- **API Reference** - Check [Schema API](../api/schema.md) for complete syntax
- **Testing** - Review test patterns in each advanced guide

## 💡 Tips for Advanced Usage

### 1. Start Simple, Scale Up
```typescript
// Begin with basic queries
const users = await repo.all(from(UserSchema));

// Add complexity as needed
const usersWithStats = await repo.all(
  from(UserSchema)
    .preload(u => u.posts)
    .preload(u => u.profile)
    .where(u => u.active.eq(true))
);
```

### 2. Use Type Safety
```typescript
// Leverage TypeScript throughout
type UserWithPosts = typeof UserSchema._type & {
  posts: Array<typeof PostSchema._type>;
};

const enrichedUsers: UserWithPosts[] = result.data;
```

### 3. Plan for Scale
```typescript
// Design for growth from the start
const getUserStats = async (userId: number) => {
  // Use caching for frequently accessed data
  const cached = await cache.get(`user:${userId}:stats`);
  if (cached) return cached;
  
  // Efficient query with proper indexes
  const stats = await repo.one(
    from(UserStatsView) // Materialized view
      .where(s => s.userId.eq(userId))
  );
  
  await cache.set(`user:${userId}:stats`, stats, 300);
  return stats;
};
```

### 4. Monitor and Measure
```typescript
// Always measure performance in production
const profiledQuery = async (name: string, query: () => Promise<any>) => {
  const start = performance.now();
  
  try {
    const result = await query();
    const duration = performance.now() - start;
    
    // Log slow queries
    if (duration > 100) {
      console.warn(`Slow query [${name}]: ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    console.error(`Query failed [${name}]:`, error);
    throw error;
  }
};
```

## 🚀 Next Steps

Ready to dive deeper? Choose your path:

- **🏗️ Build Something** - Follow the [Blog Tutorial](../tutorials/blog.md)
- **📖 Learn More** - Read the [API Reference](../api/schema.md)
- **🔧 Extend** - Create a [Custom Adapter](./custom-adapters.md)
- **⚡ Optimize** - Master [Performance](./performance.md)

---

← [Back to Documentation](../README.md)