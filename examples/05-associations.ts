// Associations examples

import { 
  schema, 
  f, 
  timestamps, 
  hasMany, 
  hasOne, 
  belongsTo, 
  manyToMany 
} from "../src/index.ts";

console.log("=== Associations Examples ===\n");

// Define base schemas
const UserSchema = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { unique: true }),
  ...timestamps(),
});

const PostSchema = schema("posts", {
  id: f.id(),
  title: f.string("title", { null: false }),
  content: f.string("content"),
  published: f.boolean("published", { default: false }),
  user_id: f.integer("user_id", { null: false }),
  ...timestamps(),
});

const ProfileSchema = schema("profiles", {
  id: f.id(),
  bio: f.string("bio"),
  avatar_url: f.string("avatar_url"),
  user_id: f.integer("user_id", { null: false }),
  ...timestamps(),
});

const CommentSchema = schema("comments", {
  id: f.id(),
  content: f.string("content", { null: false }),
  post_id: f.integer("post_id", { null: false }),
  user_id: f.integer("user_id", { null: false }),
  ...timestamps(),
});

const RoleSchema = schema("roles", {
  id: f.id(),
  name: f.string("name", { null: false }),
  description: f.string("description"),
  ...timestamps(),
});

const UserRoleSchema = schema("user_roles", {
  id: f.id(),
  user_id: f.integer("user_id", { null: false }),
  role_id: f.integer("role_id", { null: false }),
  ...timestamps(),
});

// 1. Has Many Association
console.log("1. Has Many Association:");
const userHasManyPosts = hasMany(PostSchema, {
  foreignKey: "user_id",
  references: "id",
});

console.log("   User has many posts:");
console.log(`   Type: ${userHasManyPosts.type}`);
console.log(`   Schema: ${userHasManyPosts.schema.tableName}`);
console.log(`   Foreign Key: ${userHasManyPosts.options.foreignKey}`);
console.log(`   References: ${userHasManyPosts.options.references}`);
console.log();

// 2. Has One Association
console.log("2. Has One Association:");
const userHasOneProfile = hasOne(ProfileSchema, {
  foreignKey: "user_id",
  references: "id",
});

console.log("   User has one profile:");
console.log(`   Type: ${userHasOneProfile.type}`);
console.log(`   Schema: ${userHasOneProfile.schema.tableName}`);
console.log(`   Foreign Key: ${userHasOneProfile.options.foreignKey}`);
console.log();

// 3. Belongs To Association
console.log("3. Belongs To Association:");
const postBelongsToUser = belongsTo(UserSchema, {
  foreignKey: "user_id",
  references: "id",
});

console.log("   Post belongs to user:");
console.log(`   Type: ${postBelongsToUser.type}`);
console.log(`   Schema: ${postBelongsToUser.schema.tableName}`);
console.log(`   Foreign Key: ${postBelongsToUser.options.foreignKey}`);
console.log();

const commentBelongsToPost = belongsTo(PostSchema, {
  foreignKey: "post_id",
});

const commentBelongsToUser = belongsTo(UserSchema, {
  foreignKey: "user_id",
});

console.log("   Comment belongs to post and user associations created");
console.log();

// 4. Many to Many Association
console.log("4. Many to Many Association:");
const userManyToManyRoles = manyToMany(RoleSchema, {
  through: UserRoleSchema,
  joinKeys: ["user_id", "role_id"],
});

console.log("   User many to many roles:");
console.log(`   Type: ${userManyToManyRoles.type}`);
console.log(`   Schema: ${userManyToManyRoles.schema.tableName}`);
console.log(`   Through: ${userManyToManyRoles.options.through?.tableName}`);
console.log(`   Join Keys: ${JSON.stringify(userManyToManyRoles.options.joinKeys)}`);
console.log();

// 5. Complete schema with associations
console.log("5. Complete Schema with Associations:");
const UserWithAssociations = schema("users", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { unique: true }),
  ...timestamps(),
  
  // Virtual associations (for documentation)
  // In a full implementation, these would be handled differently
});

console.log(`
   User Schema with associations would have:
   - posts: hasMany(Post, { foreignKey: "user_id" })
   - profile: hasOne(Profile, { foreignKey: "user_id" })
   - comments: hasMany(Comment, { foreignKey: "user_id" })
   - roles: manyToMany(Role, { through: UserRole, joinKeys: ["user_id", "role_id"] })
`);

const PostWithAssociations = schema("posts", {
  id: f.id(),
  title: f.string("title", { null: false }),
  content: f.string("content"),
  user_id: f.integer("user_id", { null: false }),
  ...timestamps(),
});

console.log(`
   Post Schema with associations would have:
   - user: belongsTo(User, { foreignKey: "user_id" })
   - comments: hasMany(Comment, { foreignKey: "post_id" })
`);

// 6. Preloading examples (conceptual)
console.log("6. Preloading Examples (conceptual):");
console.log(`
   // Single association preload
   const userWithPosts = await repo.preload(user, "posts");
   
   // Multiple associations preload
   const userWithData = await repo.preload(user, ["posts", "profile", "roles"]);
   
   // Nested preloading
   const userWithPostsAndComments = await repo.preload(user, {
     posts: "comments"
   });
   
   // Complex nested preloading
   const fullUserData = await repo.preload(user, {
     posts: ["comments", "tags"],
     profile: "settings",
     roles: "permissions"
   });
   
   // Preload with constraints
   const userWithPublishedPosts = await repo.preload(user, {
     posts: from(Post).where(p => p.published.eq(true))
   });
`);

console.log("✅ Associations examples completed!");