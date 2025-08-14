// Real-world application example - Blog platform

import { 
  schema, 
  f, 
  timestamps,
  from,
  hasMany,
  hasOne,
  belongsTo,
  manyToMany,
  ok,
  err,
  and,
  or,
  type Result
} from "../src/index.ts";
import { generateInsertSql, generateUpdateSql } from "../src/repo/sql-generator.ts";

console.log("=== Real-World Blog Platform Example ===\n");

// 1. Complete schema definitions
console.log("1. Blog Platform Schemas:");

const UserSchema = schema("users", {
  id: f.id(),
  username: f.string("username", { null: false, unique: true }),
  email: f.string("email", { null: false, unique: true }),
  password_hash: f.string("password_hash", { null: false }),
  first_name: f.string("first_name"),
  last_name: f.string("last_name"),
  bio: f.string("bio"),
  avatar_url: f.string("avatar_url"),
  email_verified: f.boolean("email_verified", { default: false }),
  status: f.string("status", { default: "active" }),
  role: f.string("role", { default: "user" }),
  last_login_at: f.utcDateTime("last_login_at"),
  ...timestamps(),
});

const CategorySchema = schema("categories", {
  id: f.id(),
  name: f.string("name", { null: false, unique: true }),
  slug: f.string("slug", { null: false, unique: true }),
  description: f.string("description"),
  color: f.string("color"),
  post_count: f.integer("post_count", { default: 0 }),
  ...timestamps(),
});

const PostSchema = schema("posts", {
  id: f.id(),
  title: f.string("title", { null: false }),
  slug: f.string("slug", { null: false, unique: true }),
  excerpt: f.string("excerpt"),
  content: f.string("content", { null: false }),
  featured_image_url: f.string("featured_image_url"),
  status: f.string("status", { default: "draft" }), // draft, published, archived
  published_at: f.utcDateTime("published_at"),
  view_count: f.integer("view_count", { default: 0 }),
  like_count: f.integer("like_count", { default: 0 }),
  comment_count: f.integer("comment_count", { default: 0 }),
  reading_time: f.integer("reading_time"), // minutes
  featured: f.boolean("featured", { default: false }),
  user_id: f.integer("user_id", { null: false }),
  category_id: f.integer("category_id"),
  ...timestamps(),
});

const CommentSchema = schema("comments", {
  id: f.id(),
  content: f.string("content", { null: false }),
  status: f.string("status", { default: "published" }),
  parent_id: f.integer("parent_id"), // for nested comments
  post_id: f.integer("post_id", { null: false }),
  user_id: f.integer("user_id", { null: false }),
  ...timestamps(),
});

const TagSchema = schema("tags", {
  id: f.id(),
  name: f.string("name", { null: false, unique: true }),
  slug: f.string("slug", { null: false, unique: true }),
  description: f.string("description"),
  post_count: f.integer("post_count", { default: 0 }),
  ...timestamps(),
});

const PostTagSchema = schema("post_tags", {
  id: f.id(),
  post_id: f.integer("post_id", { null: false }),
  tag_id: f.integer("tag_id", { null: false }),
  ...timestamps(),
});

console.log("   ✅ Schemas defined: Users, Categories, Posts, Comments, Tags, PostTags");
console.log();

// 2. Association definitions
console.log("2. Association Setup:");

const associations = {
  // User associations
  userPosts: hasMany(PostSchema, { foreignKey: "user_id" }),
  userComments: hasMany(CommentSchema, { foreignKey: "user_id" }),
  
  // Post associations
  postUser: belongsTo(UserSchema, { foreignKey: "user_id" }),
  postCategory: belongsTo(CategorySchema, { foreignKey: "category_id" }),
  postComments: hasMany(CommentSchema, { foreignKey: "post_id" }),
  postTags: manyToMany(TagSchema, { 
    through: PostTagSchema, 
    joinKeys: ["post_id", "tag_id"] 
  }),
  
  // Category associations
  categoryPosts: hasMany(PostSchema, { foreignKey: "category_id" }),
  
  // Comment associations
  commentPost: belongsTo(PostSchema, { foreignKey: "post_id" }),
  commentUser: belongsTo(UserSchema, { foreignKey: "user_id" }),
  commentParent: belongsTo(CommentSchema, { foreignKey: "parent_id" }),
  commentReplies: hasMany(CommentSchema, { foreignKey: "parent_id" }),
};

console.log("   ✅ Associations configured for all entities");
console.log();

// 3. Common query patterns
console.log("3. Common Blog Query Patterns:");

// Published posts with author and category
const publishedPostsQuery = from(PostSchema)
  .where(p => p.status.eq("published"))
  .limit(10);
console.log("   Published posts:");
console.log(`   SQL: ${publishedPostsQuery.toString()}`);

// Featured posts
const featuredPostsQuery = from(PostSchema)
  .where(p => and(
    p.featured.eq(true),
    p.status.eq("published")
  ))
  .limit(5);
console.log(`   Featured posts: ${featuredPostsQuery.toString()}`);

// Popular posts (high view count)
const popularPostsQuery = from(PostSchema)
  .where(p => and(
    p.view_count.gte(1000),
    p.status.eq("published")
  ))
  .limit(10);
console.log(`   Popular posts: ${popularPostsQuery.toString()}`);

// Recent posts by category
const categoryPostsQuery = from(PostSchema)
  .where(p => and(
    p.category_id.eq(1),
    p.status.eq("published")
  ))
  .limit(20);
console.log(`   Category posts: ${categoryPostsQuery.toString()}`);
console.log();

// 4. Complex search functionality
console.log("4. Search Functionality:");

const searchPostsQuery = from(PostSchema)
  .where(p => and(
    or(
      p.title.ilike("%javascript%"),
      p.content.ilike("%javascript%")
    ),
    p.status.eq("published")
  ))
  .limit(15);

console.log("   Search for 'javascript' in published posts:");
console.log(`   SQL: ${searchPostsQuery.toString()}`);
console.log(`   Params: ${JSON.stringify(searchPostsQuery.toSql().params)}`);
console.log();

// 5. User management queries
console.log("5. User Management:");

// Active verified authors
const verifiedAuthorsQuery = from(UserSchema)
  .where(u => and(
    u.status.eq("active"),
    u.email_verified.eq(true),
    u.role.in(["author", "editor", "admin"])
  ))
  .limit(25);

console.log("   Active verified authors/editors:");
console.log(`   SQL: ${verifiedAuthorsQuery.toString()}`);
console.log(`   Params: ${JSON.stringify(verifiedAuthorsQuery.toSql().params)}`);
console.log();

// 6. Content moderation
console.log("6. Content Moderation:");

const pendingCommentsQuery = from(CommentSchema)
  .where(c => c.status.eq("pending"))
  .limit(50);

console.log("   Pending comments for moderation:");
console.log(`   SQL: ${pendingCommentsQuery.toString()}`);
console.log(`   Params: ${JSON.stringify(pendingCommentsQuery.toSql().params)}`);
console.log();

// 7. Analytics queries
console.log("7. Analytics Queries:");

console.log(`
   // Top performing posts
   const topPosts = await repo.all(
     from(PostSchema)
       .where(p => p.status.eq("published"))
       .orderBy(p => p.view_count, "desc")
       .limit(10)
   );
   
   // Posts by month
   const monthlyPosts = await repo.aggregate(
     from(PostSchema)
       .where(p => and(
         p.status.eq("published"),
         p.published_at.gte(startOfMonth),
         p.published_at.lt(endOfMonth)
       )),
     "count",
     "*"
   );
   
   // User engagement
   const activeUsers = await repo.all(
     from(UserSchema)
       .where(u => u.last_login_at.gte(thirtyDaysAgo))
       .orderBy(u => u.last_login_at, "desc")
   );
`);

// 8. CRUD operations examples
console.log("8. CRUD Operations:");

// Create new post
const newPostData = {
  title: "Getting Started with TypeScript",
  slug: "getting-started-with-typescript",
  excerpt: "Learn the basics of TypeScript in this comprehensive guide.",
  content: "TypeScript is a typed superset of JavaScript...",
  status: "draft",
  user_id: 1,
  category_id: 2,
  reading_time: 5,
};

const { sql: createPostSql, params: createPostParams } = generateInsertSql("posts", newPostData);
console.log("   Create new post:");
console.log(`   SQL: ${createPostSql}`);
console.log(`   Data: ${JSON.stringify(newPostData, null, 2)}`);
console.log();

// Publish post
const publishData = {
  status: "published",
  published_at: new Date(),
};

const { sql: publishSql, params: publishParams } = generateUpdateSql(
  "posts", 
  publishData, 
  [{ field: "id", operator: "eq", value: 1 }]
);

console.log("   Publish post:");
console.log(`   SQL: ${publishSql}`);
console.log(`   Data: ${JSON.stringify(publishData, null, 2)}`);
console.log();

// 9. Result handling in real application
console.log("9. Real Application Result Handling:");

interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: string;
  published_at: Date | null;
  view_count: number;
  user_id: number;
}

// Simulate API response - could be success or error
const getBlogPosts = (): Result<Post[]> => {
  const shouldSucceed = true; // Change to false to test error handling
  
  if (shouldSucceed) {
    return ok([
      {
        id: 1,
        title: "Getting Started with TypeScript",
        slug: "getting-started-with-typescript",
        content: "TypeScript is amazing...",
        status: "published",
        published_at: new Date(),
        view_count: 1250,
        user_id: 1,
      },
      {
        id: 2,
        title: "Advanced React Patterns",
        slug: "advanced-react-patterns",
        content: "Learn advanced patterns...",
        status: "published",
        published_at: new Date(),
        view_count: 890,
        user_id: 2,
      },
    ]);
  } else {
    return err(new Error("Database connection failed"));
  }
};

const blogPostResult = getBlogPosts();

console.log("   Blog API Response:");
if (blogPostResult.success) {
  console.log(`   ✅ Found ${blogPostResult.data.length} posts`);
  blogPostResult.data.forEach(post => {
    console.log(`     - "${post.title}" (${post.view_count} views)`);
  });
}
// Note: In a real app, you'd handle the error case with:
// else { console.log(`❌ Error: ${blogPostResult.error.message}`); }
console.log();

// 10. Complete workflow example
console.log("10. Complete Blog Workflow:");
console.log(`
   // 1. User registration
   const newUser = await repo.insert("users", {
     username: "john_doe",
     email: "john@example.com",
     password_hash: hashedPassword,
     role: "author"
   });
   
   // 2. Create draft post
   const draftPost = await repo.insert("posts", {
     title: "My First Post",
     slug: "my-first-post",
     content: "This is my first blog post...",
     status: "draft",
     user_id: newUser.data.id,
     category_id: 1
   });
   
   // 3. Add tags to post
   const tagRelations = await repo.insertAll("post_tags", [
     { post_id: draftPost.data.id, tag_id: 1 }, // JavaScript
     { post_id: draftPost.data.id, tag_id: 5 }, // Tutorial
   ]);
   
   // 4. Publish post
   const publishedPost = await repo.update("posts", {
     status: "published",
     published_at: new Date()
   }, draftPost.data.id);
   
   // 5. Get published posts with author info (conceptual preload)
   const postsWithAuthors = await repo.preload(
     await repo.all(from(PostSchema).where(p => p.status.eq("published"))),
     "user"
   );
   
   // 6. Handle user comments
   const newComment = await repo.insert("comments", {
     content: "Great post! Very helpful.",
     post_id: publishedPost.data.id,
     user_id: 3,
     status: "published"
   });
   
   // 7. Update post comment count
   await repo.update("posts", {
     comment_count: publishedPost.data.comment_count + 1
   }, publishedPost.data.id);
`);

console.log("✅ Real-world blog platform example completed with clean arrow function syntax!");
console.log("\nThis demonstrates a complete blog platform with:");
console.log("- User management and roles");
console.log("- Content creation and publishing");
console.log("- Categories and tagging");
console.log("- Comments and engagement");
console.log("- Search and filtering");
console.log("- Analytics and moderation");
console.log("- Proper error handling with Result types");
console.log("\nKey syntax improvements:");
console.log("- 🎯 Natural field access: p.status.eq('published') instead of createFieldOperators");
console.log("- 🔧 Arrow functions for clean, readable queries");
console.log("- 📦 Full type safety with IntelliSense");
console.log("- 🚀 No manual operator creation boilerplate");
console.log("- ✨ Feels like writing natural JavaScript/TypeScript!");