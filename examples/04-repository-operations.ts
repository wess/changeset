// Repository operations examples (mock implementation)

import { 
  schema, 
  f, 
  timestamps, 
  from, 
  ok, 
  err, 
  type Result 
} from "../src/index.ts";
import { generateInsertSql, generateUpdateSql, generateDeleteSql } from "../src/repo/sql-generator.ts";

// Define User schema
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { unique: true }),
  age: f.integer("age"),
  active: f.boolean("active", { default: true }),
  ...timestamps(),
});

// Mock user data
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  active: boolean;
  inserted_at: Date;
  updated_at: Date;
}

console.log("=== Repository Operations Examples ===\n");

// 1. Insert operations
console.log("1. Insert Operations:");
const newUserData = {
  name: "John Doe",
  email: "john@example.com",
  age: 30,
  active: true,
};

const { sql: insertSql, params: insertParams } = generateInsertSql("users", newUserData);
console.log("   Single insert:");
console.log(`   SQL: ${insertSql}`);
console.log(`   Params: ${JSON.stringify(insertParams)}`);
console.log();

// Batch insert example
const batchUserData = [
  { name: "Alice Smith", email: "alice@example.com", age: 28 },
  { name: "Bob Johnson", email: "bob@example.com", age: 35 },
  { name: "Carol Williams", email: "carol@example.com", age: 42 },
];

console.log("   Batch insert would execute:");
batchUserData.forEach((userData, index) => {
  const { sql, params } = generateInsertSql("users", userData);
  console.log(`   ${index + 1}. INSERT for ${userData.name}`);
});
console.log();

// 2. Update operations
console.log("2. Update Operations:");
const updateData = { name: "John Smith", age: 31 };
const whereConditions = [{ field: "id", operator: "eq" as const, value: 1 }];
const { sql: updateSql, params: updateParams } = generateUpdateSql("users", updateData, whereConditions);

console.log("   Single update:");
console.log(`   SQL: ${updateSql}`);
console.log(`   Params: ${JSON.stringify(updateParams)}`);
console.log();

// 3. Delete operations
console.log("3. Delete Operations:");
const deleteConditions = [{ field: "id", operator: "eq" as const, value: 1 }];
const { sql: deleteSql, params: deleteParams } = generateDeleteSql("users", deleteConditions);

console.log("   Single delete:");
console.log(`   SQL: ${deleteSql}`);
console.log(`   Params: ${JSON.stringify(deleteParams)}`);
console.log();

// 4. Query operations
console.log("4. Query Operations:");
const allUsersQuery = from(UserSchema);
const activeUsersQuery = from(UserSchema).limit(10);
const paginatedQuery = from(UserSchema).limit(10).offset(20);

console.log(`   All users query: ${allUsersQuery.toString()}`);
console.log(`   Active users query: ${activeUsersQuery.toString()}`);
console.log(`   Paginated query: ${paginatedQuery.toString()}`);
console.log();

// 5. Result handling examples
console.log("5. Result Handling Examples:");

// Success result
const successResult: Result<User[]> = ok([
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    age: 30,
    active: true,
    inserted_at: new Date(),
    updated_at: new Date(),
  },
]);

console.log("   Success result:", successResult.success ? "✅ Success" : "❌ Error");
if (successResult.success) {
  console.log(`   Data: ${successResult.data.length} users`);
}

// Error result
const errorResult: Result<User[]> = err(new Error("Database connection failed"));
console.log("   Error result:", errorResult.success ? "✅ Success" : "❌ Error");
if (!errorResult.success) {
  console.log(`   Error: ${errorResult.error.message}`);
}
console.log();

// 6. Repository pattern usage example
console.log("6. Repository Pattern Usage:");
console.log(`
   // Create repository
   const repo = await createRepo({
     database: "postgresql://user:pass@localhost:5432/mydb",
     logQueries: true,
   });
   
   // Query operations
   const users = await repo.all(from(UserSchema).limit(10));
   const user = await repo.one(from(UserSchema).where(u => u.id.eq(1)));
   
   // Insert operations
   const newUser = await repo.insert("users", newUserData);
   const manyUsers = await repo.insertAll("users", batchUserData);
   
   // Update operations
   const updatedUser = await repo.update("users", updateData, 1);
   const updateResult = await repo.updateAll(query, updates);
   
   // Delete operations
   const deletedUser = await repo.delete("users", 1);
   const deleteResult = await repo.deleteAll(query);
   
   // Aggregate operations
   const userCount = await repo.aggregate(query, "count", "*");
   
   // Always handle results
   if (users.success) {
     console.log("Users:", users.data);
   } else {
     console.error("Error:", users.error);
   }
`);

console.log("✅ Repository operations examples completed!");