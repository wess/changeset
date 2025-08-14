// Complex query examples with clean arrow function syntax

import { 
  schema, 
  f, 
  timestamps, 
  from,
  and,
  or
} from "../src/index.ts";

// Define schemas for complex examples
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { unique: true }),
  age: f.integer("age"),
  status: f.string("status", { default: "active" }),
  city: f.string("city"),
  created_at: f.utcDateTime("created_at", { null: false }),
  ...timestamps(),
});

const PostSchema = schema("posts", {
  id: f.id(),
  title: f.string("title", { null: false }),
  content: f.string("content"),
  published: f.boolean("published", { default: false }),
  views: f.integer("views", { default: 0 }),
  category: f.string("category"),
  user_id: f.integer("user_id", { null: false }),
  ...timestamps(),
});

const OrderSchema = schema("orders", {
  id: f.id(),
  total: f.float("total", { null: false }),
  status: f.string("status", { null: false }),
  user_id: f.integer("user_id", { null: false }),
  created_at: f.utcDateTime("created_at", { null: false }),
  ...timestamps(),
});

console.log("=== Complex Query Examples ===\n");

// 1. Complex filtering with multiple conditions
console.log("1. Complex Filtering:");

const activeAdultUsersQuery = from(UserSchema)
  .where(u => and(
    u.age.gte(18),
    u.age.lte(65),
    u.status.eq("active")
  ))
  .limit(50)
  .offset(0);

console.log("   Active adult users (age 18-65, status active):");
console.log(`   SQL: ${activeAdultUsersQuery.toString()}`);
console.log(`   Params: ${JSON.stringify(activeAdultUsersQuery.toSql().params)}`);
console.log();

// 2. Search queries
console.log("2. Search Queries:");

const searchUsersQuery = from(UserSchema)
  .where(u => or(
    u.name.ilike("%john%"),
    u.email.ilike("%john%")
  ))
  .limit(10);

console.log("   User search (name or email contains 'john'):");
console.log(`   SQL: ${searchUsersQuery.toString()}`);
console.log(`   Params: ${JSON.stringify(searchUsersQuery.toSql().params)}`);
console.log();

// 3. Date range queries
console.log("3. Date Range Queries:");

const startDate = new Date("2024-01-01");
const endDate = new Date("2024-12-31");

const usersIn2024Query = from(UserSchema)
  .where(u => and(
    u.created_at.gte(startDate),
    u.created_at.lt(endDate)
  ))
  .limit(25);

console.log("   Users created in 2024:");
console.log(`   SQL: ${usersIn2024Query.toString()}`);
console.log(`   Params: ${JSON.stringify(usersIn2024Query.toSql().params)}`);
console.log();

// 4. Pagination with sorting
console.log("4. Pagination with Sorting:");

const paginatedUsersQuery = from(UserSchema)
  .where(u => u.status.eq("active"))
  .limit(20)
  .offset(40); // Page 3 (20 * 2)

console.log("   Page 3 of active users (20 per page):");
console.log(`   SQL: ${paginatedUsersQuery.toString()}`);
console.log(`   Params: ${JSON.stringify(paginatedUsersQuery.toSql().params)}`);
console.log();

// 5. Category and status filtering
console.log("5. Category and Status Filtering:");

const publishedTechPostsQuery = from(PostSchema)
  .where(p => and(
    p.category.in(["tech", "programming", "javascript"]),
    p.published.eq(true)
  ))
  .limit(15);

console.log("   Published tech posts:");
console.log(`   SQL: ${publishedTechPostsQuery.toString()}`);
console.log(`   Params: ${JSON.stringify(publishedTechPostsQuery.toSql().params)}`);
console.log();

// 6. Popular content queries
console.log("6. Popular Content Queries:");

const popularPostsQuery = from(PostSchema)
  .where(p => and(
    p.views.gte(1000),
    p.published.eq(true)
  ))
  .limit(10);

console.log("   Popular published posts (1000+ views):");
console.log(`   SQL: ${popularPostsQuery.toString()}`);
console.log(`   Params: ${JSON.stringify(popularPostsQuery.toSql().params)}`);
console.log();

// 7. E-commerce queries
console.log("7. E-commerce Queries:");

const highValueOrdersQuery = from(OrderSchema)
  .where(o => and(
    o.total.gte(100.00),
    o.status.in(["completed", "shipped"])
  ))
  .limit(20);

console.log("   High-value completed orders ($100+):");
console.log(`   SQL: ${highValueOrdersQuery.toString()}`);
console.log(`   Params: ${JSON.stringify(highValueOrdersQuery.toSql().params)}`);
console.log();

// 8. Location-based queries
console.log("8. Location-based Queries:");

const majorCityUsersQuery = from(UserSchema)
  .where(u => u.city.in(["New York", "Los Angeles", "Chicago"]))
  .limit(30);

console.log("   Users in major cities:");
console.log(`   SQL: ${majorCityUsersQuery.toString()}`);
console.log(`   Params: ${JSON.stringify(majorCityUsersQuery.toSql().params)}`);
console.log();

// 9. Complex business logic example
console.log("9. Complex Business Logic:");

const eligibleUsersQuery = from(UserSchema)
  .where(u => and(
    u.age.gte(18), // Must be adult
    u.status.eq("active"), // Must be active
    u.email.isNotNull(), // Must have email
    or(
      u.city.eq("New York"),
      u.city.eq("San Francisco")
    ) // Must be in eligible cities
  ))
  .limit(25);

console.log("   Eligible users for special program:");
console.log("   (Adults, active, verified email, in NYC or SF)");
console.log(`   SQL: ${eligibleUsersQuery.toString()}`);
console.log(`   Params: ${JSON.stringify(eligibleUsersQuery.toSql().params)}`);
console.log();

// 10. Aggregation queries (conceptual)
console.log("10. Aggregation Queries (conceptual):");
console.log(`
   // Count queries
   const totalUsers = await repo.aggregate(
     from(UserSchema).where(u => u.status.eq("active")), 
     "count", 
     "*"
   );
   
   // Sum queries  
   const totalRevenue = await repo.aggregate(
     from(OrderSchema).where(o => o.status.eq("completed")),
     "sum",
     "total"
   );
   
   // Average queries
   const avgOrderValue = await repo.aggregate(
     from(OrderSchema),
     "avg", 
     "total"
   );
   
   // Min/Max queries
   const oldestUser = await repo.aggregate(
     from(UserSchema),
     "min",
     "created_at"
   );
`);

console.log("✅ Complex query examples completed with clean arrow function syntax!");
console.log("\nKey improvements over old syntax:");
console.log("- 🎯 Natural field access: u.age.gte(18) instead of createFieldOperators");
console.log("- 🔧 Arrow functions for readable conditions");
console.log("- 📦 Full type safety with IntelliSense");
console.log("- 🚀 No manual operator instantiation");
console.log("- ✨ Fluent, chainable query building");