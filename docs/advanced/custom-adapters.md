# Custom Database Adapters

Create custom database adapters to support additional databases or extend existing functionality.

## Adapter Interface

### Core Adapter Structure

```typescript
import { DatabaseAdapter, Result, SqlQuery } from "changeset";

export interface CustomAdapter extends DatabaseAdapter {
  // Required methods
  connect(): Promise<Result<void>>;
  disconnect(): Promise<void>;
  query<T>(sql: SqlQuery): Promise<Result<T[]>>;
  execute(sql: string, params?: any[]): Promise<Result<any>>;
  
  // Transaction support
  beginTransaction(): Promise<Result<TransactionAdapter>>;
  commit(): Promise<Result<void>>;
  rollback(): Promise<Result<void>>;
  
  // Optional optimizations
  batchInsert?<T>(table: string, records: T[]): Promise<Result<T[]>>;
  stream?<T>(sql: SqlQuery): AsyncIterator<T>;
  
  // Database-specific features
  getDialect(): DatabaseDialect;
  escapeIdentifier(identifier: string): string;
  escapeLiteral(value: any): string;
}
```

### Database Dialect

```typescript
export interface DatabaseDialect {
  name: string;
  
  // SQL generation
  limitClause(limit: number, offset?: number): string;
  returningClause(columns: string[]): string;
  upsertClause(table: string, columns: string[], conflict: string[]): string;
  
  // Type mapping
  mapFieldType(fieldType: FieldType): string;
  mapValue(value: any, fieldType: FieldType): any;
  
  // Features
  features: {
    returningInsert: boolean;
    upsert: boolean;
    jsonOperators: boolean;
    arrayOperators: boolean;
    windowFunctions: boolean;
    cte: boolean;
    lateral: boolean;
  };
}
```

## Creating a Custom Adapter

### MongoDB Adapter Example

```typescript
import { MongoClient, Db, Collection } from "mongodb";
import { 
  DatabaseAdapter, 
  Result, 
  SqlQuery,
  createDatabaseError,
  createValidationError 
} from "changeset";

export const createMongoAdapter = (
  connectionString: string,
  dbName: string
): DatabaseAdapter => {
  let client: MongoClient | null = null;
  let db: Db | null = null;

  const connect = async (): Promise<Result<void>> => {
    try {
      client = new MongoClient(connectionString);
      await client.connect();
      db = client.db(dbName);
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: createDatabaseError(
          `MongoDB connection failed: ${error.message}`
        )
      };
    }
  };

  const disconnect = async (): Promise<void> => {
    if (client) {
      await client.close();
      client = null;
      db = null;
    }
  };

  const query = async <T>(sql: SqlQuery): Promise<Result<T[]>> => {
    if (!db) {
      return {
        success: false,
        error: createDatabaseError("Not connected to MongoDB")
      };
    }

    try {
      // Convert SQL query to MongoDB query
      const mongoQuery = sqlToMongo(sql);
      const collection = db.collection<T>(mongoQuery.collection);
      
      let cursor = collection.find(mongoQuery.filter);
      
      if (mongoQuery.sort) {
        cursor = cursor.sort(mongoQuery.sort);
      }
      
      if (mongoQuery.limit) {
        cursor = cursor.limit(mongoQuery.limit);
      }
      
      if (mongoQuery.skip) {
        cursor = cursor.skip(mongoQuery.skip);
      }
      
      const results = await cursor.toArray();
      
      return { success: true, data: results };
    } catch (error) {
      return {
        success: false,
        error: createDatabaseError(error.message)
      };
    }
  };

  const execute = async (
    sql: string, 
    params?: any[]
  ): Promise<Result<any>> => {
    // Parse and execute MongoDB operations
    try {
      const operation = parseMongoOperation(sql, params);
      const collection = db!.collection(operation.collection);
      
      let result;
      switch (operation.type) {
        case 'insert':
          result = await collection.insertOne(operation.document);
          break;
        case 'update':
          result = await collection.updateOne(
            operation.filter,
            operation.update
          );
          break;
        case 'delete':
          result = await collection.deleteOne(operation.filter);
          break;
        default:
          throw new Error(`Unknown operation: ${operation.type}`);
      }
      
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: createDatabaseError(error.message)
      };
    }
  };

  // Helper to convert SQL-like query to MongoDB
  const sqlToMongo = (sql: SqlQuery) => {
    const mongoQuery: any = {
      collection: sql.table,
      filter: {},
      projection: {}
    };
    
    // Convert WHERE conditions
    if (sql.where) {
      mongoQuery.filter = convertWhereToFilter(sql.where);
    }
    
    // Convert ORDER BY
    if (sql.orderBy) {
      mongoQuery.sort = {};
      sql.orderBy.forEach(order => {
        mongoQuery.sort[order.field] = order.direction === 'DESC' ? -1 : 1;
      });
    }
    
    // Add limit and offset
    if (sql.limit) mongoQuery.limit = sql.limit;
    if (sql.offset) mongoQuery.skip = sql.offset;
    
    return mongoQuery;
  };

  const convertWhereToFilter = (where: WhereCondition): any => {
    const filter: any = {};
    
    if (where.operator === 'and') {
      return { $and: where.conditions.map(convertWhereToFilter) };
    }
    
    if (where.operator === 'or') {
      return { $or: where.conditions.map(convertWhereToFilter) };
    }
    
    // Convert simple conditions
    switch (where.operator) {
      case 'eq':
        filter[where.field] = where.value;
        break;
      case 'neq':
        filter[where.field] = { $ne: where.value };
        break;
      case 'gt':
        filter[where.field] = { $gt: where.value };
        break;
      case 'gte':
        filter[where.field] = { $gte: where.value };
        break;
      case 'lt':
        filter[where.field] = { $lt: where.value };
        break;
      case 'lte':
        filter[where.field] = { $lte: where.value };
        break;
      case 'in':
        filter[where.field] = { $in: where.value };
        break;
      case 'like':
        filter[where.field] = { 
          $regex: where.value.replace(/%/g, '.*'),
          $options: 'i'
        };
        break;
    }
    
    return filter;
  };

  return {
    connect,
    disconnect,
    query,
    execute,
    
    beginTransaction: async () => {
      // MongoDB 4.0+ supports transactions
      const session = client!.startSession();
      session.startTransaction();
      
      return {
        success: true,
        data: createTransactionAdapter(session)
      };
    },
    
    commit: async () => {
      // Handled by session
      return { success: true, data: undefined };
    },
    
    rollback: async () => {
      // Handled by session
      return { success: true, data: undefined };
    },
    
    getDialect: () => ({
      name: 'mongodb',
      limitClause: (limit, offset) => '',
      returningClause: () => '',
      upsertClause: () => '',
      mapFieldType: (type) => 'BSON',
      mapValue: (value) => value,
      features: {
        returningInsert: false,
        upsert: true,
        jsonOperators: true,
        arrayOperators: true,
        windowFunctions: false,
        cte: false,
        lateral: false
      }
    }),
    
    escapeIdentifier: (id) => id,
    escapeLiteral: (value) => JSON.stringify(value)
  };
};
```

### Redis Adapter Example

```typescript
import Redis from "ioredis";
import { DatabaseAdapter, Result, SqlQuery } from "changeset";

export const createRedisAdapter = (
  options: Redis.RedisOptions
): DatabaseAdapter => {
  let client: Redis | null = null;

  const connect = async (): Promise<Result<void>> => {
    try {
      client = new Redis(options);
      
      await client.ping();
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: createDatabaseError(`Redis connection failed: ${error.message}`)
      };
    }
  };

  const disconnect = async (): Promise<void> => {
    if (client) {
      client.disconnect();
      client = null;
    }
  };

  const query = async <T>(sql: SqlQuery): Promise<Result<T[]>> => {
    if (!client) {
      return {
        success: false,
        error: createDatabaseError("Not connected to Redis")
      };
    }

    try {
      // Convert SQL-like query to Redis operations
      const pattern = `${sql.table}:*`;
      const keys = await client.keys(pattern);
      
      if (keys.length === 0) {
        return { success: true, data: [] };
      }
      
      // Get all values
      const pipeline = client.pipeline();
      keys.forEach(key => pipeline.get(key));
      const results = await pipeline.exec();
      
      // Parse and filter results
      let data = results!
        .map(([err, value]) => {
          if (err) throw err;
          return JSON.parse(value as string);
        })
        .filter(item => applyWhereConditions(item, sql.where));
      
      // Apply sorting
      if (sql.orderBy) {
        data = applySorting(data, sql.orderBy);
      }
      
      // Apply limit and offset
      if (sql.offset) {
        data = data.slice(sql.offset);
      }
      if (sql.limit) {
        data = data.slice(0, sql.limit);
      }
      
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: createDatabaseError(error.message)
      };
    }
  };

  const execute = async (
    sql: string,
    params?: any[]
  ): Promise<Result<any>> => {
    if (!client) {
      return {
        success: false,
        error: createDatabaseError("Not connected to Redis")
      };
    }

    try {
      // Parse Redis command from SQL-like syntax
      const command = parseRedisCommand(sql, params);
      
      switch (command.type) {
        case 'SET':
          await client.set(
            command.key,
            JSON.stringify(command.value),
            'EX',
            command.ttl || 3600
          );
          break;
          
        case 'DEL':
          await client.del(command.key);
          break;
          
        case 'HSET':
          await client.hset(
            command.key,
            command.field,
            JSON.stringify(command.value)
          );
          break;
          
        case 'ZADD':
          await client.zadd(
            command.key,
            command.score,
            JSON.stringify(command.member)
          );
          break;
      }
      
      return { success: true, data: { affected: 1 } };
    } catch (error) {
      return {
        success: false,
        error: createDatabaseError(error.message)
      };
    }
  };

  return {
    connect,
    disconnect,
    query,
    execute,
    
    // Redis doesn't have traditional transactions
    beginTransaction: async () => {
      const multi = client!.multi();
      return {
        success: true,
        data: createRedisTransactionAdapter(multi)
      };
    },
    
    commit: async () => ({ success: true, data: undefined }),
    rollback: async () => ({ success: true, data: undefined }),
    
    getDialect: () => ({
      name: 'redis',
      limitClause: () => '',
      returningClause: () => '',
      upsertClause: () => '',
      mapFieldType: () => 'STRING',
      mapValue: (value) => JSON.stringify(value),
      features: {
        returningInsert: false,
        upsert: false,
        jsonOperators: false,
        arrayOperators: false,
        windowFunctions: false,
        cte: false,
        lateral: false
      }
    }),
    
    escapeIdentifier: (id) => id,
    escapeLiteral: (value) => JSON.stringify(value)
  };
};
```

## Extending Existing Adapters

### Adding Custom Methods

```typescript
// Extend PostgreSQL adapter with custom features
export const createExtendedPostgresAdapter = (
  config: PostgresConfig
) => {
  const baseAdapter = createPostgresAdapter(config);
  
  return {
    ...baseAdapter,
    
    // Add full-text search support
    async search<T>(
      table: string,
      query: string,
      options?: SearchOptions
    ): Promise<Result<T[]>> => {
      const sql = `
        SELECT *,
               ts_rank(search_vector, plainto_tsquery($1)) as rank
        FROM ${table}
        WHERE search_vector @@ plainto_tsquery($1)
        ORDER BY rank DESC
        LIMIT $2
      `;
      
      return baseAdapter.query({
        sql,
        params: [query, options?.limit || 10]
      });
    },
    
    // Add JSON operations
    async jsonQuery<T>(
      table: string,
      jsonPath: string,
      value: any
    ): Promise<Result<T[]>> => {
      const sql = `
        SELECT * FROM ${table}
        WHERE data @> $1::jsonb
      `;
      
      return baseAdapter.query({
        sql,
        params: [{ [jsonPath]: value }]
      });
    },
    
    // Add array operations
    async arrayContains<T>(
      table: string,
      column: string,
      values: any[]
    ): Promise<Result<T[]>> => {
      const sql = `
        SELECT * FROM ${table}
        WHERE ${column} && $1::text[]
      `;
      
      return baseAdapter.query({
        sql,
        params: [values]
      });
    }
  };
};
```

### Custom SQL Generators

```typescript
// Custom SQL generator for specific database
export class CustomSqlGenerator {
  constructor(private dialect: DatabaseDialect) {}
  
  generateSelect(query: Query<any>): SqlQuery {
    const parts = [];
    
    // SELECT clause
    if (query.select) {
      parts.push(`SELECT ${this.buildSelectClause(query.select)}`);
    } else {
      parts.push('SELECT *');
    }
    
    // FROM clause
    parts.push(`FROM ${this.escapeIdentifier(query.schema.tableName)}`);
    
    // JOIN clauses
    if (query.joins) {
      parts.push(this.buildJoinClauses(query.joins));
    }
    
    // WHERE clause
    if (query.whereConditions?.length) {
      parts.push(`WHERE ${this.buildWhereClause(query.whereConditions)}`);
    }
    
    // GROUP BY clause
    if (query.groupBy) {
      parts.push(`GROUP BY ${this.buildGroupByClause(query.groupBy)}`);
    }
    
    // HAVING clause
    if (query.having) {
      parts.push(`HAVING ${this.buildHavingClause(query.having)}`);
    }
    
    // ORDER BY clause
    if (query.orderBy) {
      parts.push(`ORDER BY ${this.buildOrderByClause(query.orderBy)}`);
    }
    
    // LIMIT/OFFSET
    if (query.limit || query.offset) {
      parts.push(this.dialect.limitClause(query.limit, query.offset));
    }
    
    return {
      sql: parts.join(' '),
      params: this.extractParams(query)
    };
  }
  
  private buildSelectClause(select: SelectClause): string {
    if (typeof select === 'string') {
      return select;
    }
    
    return Object.entries(select)
      .map(([alias, expr]) => {
        if (typeof expr === 'string') {
          return `${expr} AS ${alias}`;
        }
        return `${this.buildExpression(expr)} AS ${alias}`;
      })
      .join(', ');
  }
  
  private buildWhereClause(conditions: WhereCondition[]): string {
    return conditions
      .map(cond => this.buildCondition(cond))
      .join(' AND ');
  }
  
  private buildCondition(condition: WhereCondition): string {
    switch (condition.operator) {
      case 'and':
        return `(${condition.conditions
          .map(c => this.buildCondition(c))
          .join(' AND ')})`;
      
      case 'or':
        return `(${condition.conditions
          .map(c => this.buildCondition(c))
          .join(' OR ')})`;
      
      case 'not':
        return `NOT (${this.buildCondition(condition.condition)})`;
      
      case 'eq':
        return `${condition.field} = ?`;
      
      case 'like':
        if (this.dialect.name === 'postgresql') {
          return `${condition.field} ILIKE ?`;
        }
        return `${condition.field} LIKE ?`;
      
      // ... other operators
      
      default:
        throw new Error(`Unknown operator: ${condition.operator}`);
    }
  }
  
  private escapeIdentifier(identifier: string): string {
    return this.dialect.escapeIdentifier(identifier);
  }
}
```

## Testing Custom Adapters

### Adapter Test Suite

```typescript
import { test, expect } from "bun:test";
import { testDatabaseAdapter } from "changeset/testing";

// Generic test suite for any adapter
export const runAdapterTests = (
  adapterName: string,
  createAdapter: () => DatabaseAdapter
) => {
  describe(`${adapterName} Adapter`, () => {
    let adapter: DatabaseAdapter;
    
    beforeEach(async () => {
      adapter = createAdapter();
      await adapter.connect();
    });
    
    afterEach(async () => {
      await adapter.disconnect();
    });
    
    test("connects successfully", async () => {
      const result = await adapter.connect();
      expect(result.success).toBe(true);
    });
    
    test("executes queries", async () => {
      const result = await adapter.query({
        sql: "SELECT 1 as value",
        params: []
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].value).toBe(1);
    });
    
    test("handles parameters", async () => {
      await adapter.execute(
        "CREATE TABLE test (id INT, name TEXT)"
      );
      
      await adapter.execute(
        "INSERT INTO test (id, name) VALUES (?, ?)",
        [1, "Test"]
      );
      
      const result = await adapter.query({
        sql: "SELECT * FROM test WHERE id = ?",
        params: [1]
      });
      
      expect(result.success).toBe(true);
      expect(result.data[0].name).toBe("Test");
    });
    
    test("supports transactions", async () => {
      const txResult = await adapter.beginTransaction();
      expect(txResult.success).toBe(true);
      
      const tx = txResult.data;
      
      await tx.execute(
        "INSERT INTO test (id, name) VALUES (?, ?)",
        [2, "Transaction Test"]
      );
      
      await tx.rollback();
      
      const result = await adapter.query({
        sql: "SELECT * FROM test WHERE id = 2",
        params: []
      });
      
      expect(result.data).toHaveLength(0);
    });
    
    // Run standard adapter compliance tests
    testDatabaseAdapter(adapter);
  });
};

// Test custom adapter
runAdapterTests("MongoDB", createMongoAdapter);
runAdapterTests("Redis", createRedisAdapter);
```

### Mock Adapter for Testing

```typescript
// Create a mock adapter for testing
export const createMockAdapter = (
  data: Record<string, any[]> = {}
): DatabaseAdapter => {
  const store = { ...data };
  const transactions: any[] = [];
  
  return {
    connect: async () => ({ success: true, data: undefined }),
    disconnect: async () => {},
    
    query: async <T>(sql: SqlQuery): Promise<Result<T[]>> => {
      const table = sql.table || 'default';
      const records = store[table] || [];
      
      // Apply filters
      let filtered = records;
      if (sql.where) {
        filtered = records.filter(r => 
          evaluateCondition(r, sql.where)
        );
      }
      
      // Apply sorting
      if (sql.orderBy) {
        filtered.sort((a, b) => {
          for (const order of sql.orderBy) {
            const aVal = a[order.field];
            const bVal = b[order.field];
            const dir = order.direction === 'DESC' ? -1 : 1;
            
            if (aVal < bVal) return -dir;
            if (aVal > bVal) return dir;
          }
          return 0;
        });
      }
      
      // Apply limit/offset
      if (sql.offset) {
        filtered = filtered.slice(sql.offset);
      }
      if (sql.limit) {
        filtered = filtered.slice(0, sql.limit);
      }
      
      return { success: true, data: filtered as T[] };
    },
    
    execute: async (sql: string, params?: any[]) => {
      // Parse mock SQL commands
      if (sql.startsWith('INSERT INTO')) {
        const match = sql.match(/INSERT INTO (\w+)/);
        const table = match?.[1] || 'default';
        
        if (!store[table]) store[table] = [];
        
        const record = params?.[0] || {};
        record.id = store[table].length + 1;
        store[table].push(record);
        
        return { success: true, data: record };
      }
      
      if (sql.startsWith('UPDATE')) {
        // Mock update logic
        return { success: true, data: { affected: 1 } };
      }
      
      if (sql.startsWith('DELETE')) {
        // Mock delete logic
        return { success: true, data: { affected: 1 } };
      }
      
      return { success: true, data: null };
    },
    
    beginTransaction: async () => {
      const txId = transactions.length;
      transactions.push({ commands: [], committed: false });
      
      return {
        success: true,
        data: createMockTransactionAdapter(txId, transactions)
      };
    },
    
    commit: async () => ({ success: true, data: undefined }),
    rollback: async () => ({ success: true, data: undefined }),
    
    getDialect: () => ({
      name: 'mock',
      limitClause: (limit, offset) => 
        `LIMIT ${limit}${offset ? ` OFFSET ${offset}` : ''}`,
      returningClause: (cols) => `RETURNING ${cols.join(', ')}`,
      upsertClause: () => '',
      mapFieldType: (type) => 'TEXT',
      mapValue: (value) => value,
      features: {
        returningInsert: true,
        upsert: false,
        jsonOperators: false,
        arrayOperators: false,
        windowFunctions: false,
        cte: false,
        lateral: false
      }
    }),
    
    escapeIdentifier: (id) => `"${id}"`,
    escapeLiteral: (value) => `'${value}'`
  };
};
```

## Registering Custom Adapters

```typescript
// Register adapter with changeset
import { registerAdapter } from "changeset";

// Register MongoDB adapter
registerAdapter('mongodb', createMongoAdapter);

// Register Redis adapter
registerAdapter('redis', createRedisAdapter);

// Use registered adapter
const repo = await createRepo({
  type: 'mongodb',
  config: {
    connectionString: 'mongodb://localhost:27017',
    database: 'myapp'
  }
});

// Or with Redis
const cacheRepo = await createRepo({
  type: 'redis',
  config: {
    host: 'localhost',
    port: 6379,
    db: 0
  }
});
```

## Adapter Plugins

### Creating Plugins

```typescript
// Plugin interface
export interface AdapterPlugin {
  name: string;
  install(adapter: DatabaseAdapter): DatabaseAdapter;
}

// Logging plugin
export const loggingPlugin: AdapterPlugin = {
  name: 'logging',
  
  install(adapter) {
    return {
      ...adapter,
      
      query: async (sql) => {
        console.log('[QUERY]', sql.sql, sql.params);
        const start = Date.now();
        
        const result = await adapter.query(sql);
        
        console.log(`[QUERY] Completed in ${Date.now() - start}ms`);
        return result;
      },
      
      execute: async (sql, params) => {
        console.log('[EXECUTE]', sql, params);
        return adapter.execute(sql, params);
      }
    };
  }
};

// Caching plugin
export const cachingPlugin: AdapterPlugin = {
  name: 'caching',
  
  install(adapter) {
    const cache = new Map();
    
    return {
      ...adapter,
      
      query: async (sql) => {
        const key = JSON.stringify(sql);
        
        if (cache.has(key)) {
          return { success: true, data: cache.get(key) };
        }
        
        const result = await adapter.query(sql);
        
        if (result.success) {
          cache.set(key, result.data);
          
          // Clear cache after 60 seconds
          setTimeout(() => cache.delete(key), 60000);
        }
        
        return result;
      },
      
      execute: async (sql, params) => {
        // Clear cache on writes
        cache.clear();
        return adapter.execute(sql, params);
      }
    };
  }
};

// Use plugins
const adapter = createPostgresAdapter(config);
const enhancedAdapter = [loggingPlugin, cachingPlugin]
  .reduce((acc, plugin) => plugin.install(acc), adapter);
```

## Best Practices

### 1. Handle Connection Pooling

```typescript
// Implement proper connection pooling
class ConnectionPool {
  private connections: Connection[] = [];
  private available: Connection[] = [];
  private waiting: Array<(conn: Connection) => void> = [];
  
  constructor(
    private factory: () => Connection,
    private options: PoolOptions
  ) {}
  
  async acquire(): Promise<Connection> {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }
    
    if (this.connections.length < this.options.max) {
      const conn = await this.factory();
      this.connections.push(conn);
      return conn;
    }
    
    // Wait for available connection
    return new Promise(resolve => {
      this.waiting.push(resolve);
    });
  }
  
  release(conn: Connection): void {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      resolve(conn);
    } else {
      this.available.push(conn);
    }
  }
}
```

### 2. Implement Retry Logic

```typescript
// Add retry logic for transient failures
const withRetry = async <T>(
  fn: () => Promise<Result<T>>,
  options = { maxRetries: 3, delay: 100 }
): Promise<Result<T>> => {
  let lastError: Error;
  
  for (let i = 0; i < options.maxRetries; i++) {
    const result = await fn();
    
    if (result.success) {
      return result;
    }
    
    lastError = result.error;
    
    // Check if error is retryable
    if (!isRetryableError(lastError)) {
      return result;
    }
    
    // Exponential backoff
    await new Promise(resolve => 
      setTimeout(resolve, options.delay * Math.pow(2, i))
    );
  }
  
  return { success: false, error: lastError! };
};
```

### 3. Validate Configuration

```typescript
// Validate adapter configuration
const validateConfig = (config: any): Result<void> => {
  const required = ['host', 'port', 'database'];
  
  for (const field of required) {
    if (!config[field]) {
      return {
        success: false,
        error: new Error(`Missing required field: ${field}`)
      };
    }
  }
  
  if (config.pool) {
    if (config.pool.min > config.pool.max) {
      return {
        success: false,
        error: new Error('Pool min cannot be greater than max')
      };
    }
  }
  
  return { success: true, data: undefined };
};
```

## Next Steps

- [Migrations](./migrations.md) - Database-specific migrations
- [Performance](./performance.md) - Optimize custom adapters
- [Transactions](./transactions.md) - Implement transaction support
- [Testing](../tutorials/testing.md) - Test custom adapters

---

← [Performance](./performance.md) | [Back to Documentation](../README.md)