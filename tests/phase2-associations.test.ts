// Tests for Phase 2 Association Features

import { describe, expect, test } from "bun:test";
import {
  belongsTo,
  hasMany,
  hasOne,
  manyToMany,
  preload,
  preloadNested,
  buildPreloadQueries,
  executePreloads,
} from "../src/index.ts";
import { createSchema, f } from "../src/index.ts";

// Test schemas
const UserSchema = createSchema("User", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { null: false }),
  profileId: f.string("profile_id"),
});

const ProfileSchema = createSchema("Profile", {
  id: f.id(),
  userId: f.string("user_id", { null: false }),
  bio: f.string("bio"),
  avatarUrl: f.string("avatar_url"),
});

const PostSchema = createSchema("Post", {
  id: f.id(),
  title: f.string("title", { null: false }),
  content: f.string("content", { null: false }),
  authorId: f.string("author_id", { null: false }),
  published: f.boolean("published", { default: false }),
});

const CommentSchema = createSchema("Comment", {
  id: f.id(),
  postId: f.string("post_id", { null: false }),
  authorId: f.string("author_id", { null: false }),
  content: f.string("content", { null: false }),
});

const TagSchema = createSchema("Tag", {
  id: f.id(),
  name: f.string("name", { null: false }),
});

describe("Association Definitions", () => {
  describe("hasMany", () => {
    test("creates has_many association", () => {
      const association = hasMany(PostSchema, { foreignKey: "author_id" });
      
      expect(association.type).toBe("has_many");
      expect(association.schema).toBe(PostSchema);
      expect(association.options.foreignKey).toBe("author_id");
    });

    test("uses default options when not provided", () => {
      const association = hasMany(PostSchema);
      
      expect(association.options.references).toBe("id");
    });
  });

  describe("hasOne", () => {
    test("creates has_one association", () => {
      const association = hasOne(ProfileSchema, { foreignKey: "user_id" });
      
      expect(association.type).toBe("has_one");
      expect(association.schema).toBe(ProfileSchema);
      expect(association.options.foreignKey).toBe("user_id");
    });
  });

  describe("belongsTo", () => {
    test("creates belongs_to association", () => {
      const association = belongsTo(UserSchema, { foreignKey: "author_id" });
      
      expect(association.type).toBe("belongs_to");
      expect(association.schema).toBe(UserSchema);
      expect(association.options.foreignKey).toBe("author_id");
    });
  });

  describe("manyToMany", () => {
    test("creates many_to_many association", () => {
      const association = manyToMany(TagSchema, {
        through: "post_tags",
        joinKeys: ["post_id", "tag_id"],
      });
      
      expect(association.type).toBe("many_to_many");
      expect(association.schema).toBe(TagSchema);
      expect(association.options.through).toBe("post_tags");
      expect(association.options.joinKeys).toEqual(["post_id", "tag_id"]);
    });

    test("throws error without required options", () => {
      expect(() => {
        manyToMany(TagSchema, {});
      }).toThrow("many_to_many associations require 'through' and 'joinKeys' options");
    });
  });
});

describe("Preloading", () => {
  describe("preload", () => {
    test("creates simple preload options", () => {
      const options = preload(["posts", "profile"]);
      
      expect(options.associations).toEqual(["posts", "profile"]);
      expect(options.nested).toEqual({});
    });
  });

  describe("preloadNested", () => {
    test("creates nested preload options", () => {
      const options = preloadNested({
        posts: ["comments", "tags"],
        profile: [],
      });
      
      expect(options.associations).toEqual(["posts", "profile"]);
      expect(options.nested).toEqual({
        posts: ["comments", "tags"],
        profile: [],
      });
    });
  });

  describe("buildPreloadQueries", () => {
    test("builds preload queries for associations", () => {
      const preloadOptions = preload(["posts", "profile"]);
      const records = [
        { id: "1", name: "John" },
        { id: "2", name: "Jane" },
      ];
      
      const queries = buildPreloadQueries(UserSchema, preloadOptions, records);
      
      expect(Object.keys(queries)).toEqual(["posts", "profile"]);
      expect(queries.posts).toHaveProperty("association", "posts");
      expect(queries.posts).toHaveProperty("records", 2);
    });

    test("includes nested associations in queries", () => {
      const preloadOptions = preloadNested({
        posts: ["comments"],
      });
      const records = [{ id: "1", name: "John" }];
      
      const queries = buildPreloadQueries(UserSchema, preloadOptions, records);
      
      expect(queries.posts).toHaveProperty("nested", ["comments"]);
    });
  });

  describe("executePreloads", () => {
    test("executes preload queries", async () => {
      const records = [
        { id: "1", name: "John" },
        { id: "2", name: "Jane" },
      ];
      const queries = {
        posts: { association: "posts", records: 2 },
        profile: { association: "profile", records: 2 },
      };
      
      const result = await executePreloads(records, queries);
      
      expect(result).toEqual(records); // Placeholder implementation returns original
    });
  });
});

describe("Association Types", () => {
  test("association types are correct", () => {
    const hasManyCats = hasMany(PostSchema, { foreignKey: "author_id" });
    const hasOneProfile = hasOne(ProfileSchema, { foreignKey: "user_id" });
    const belongsToUser = belongsTo(UserSchema, { foreignKey: "author_id" });
    const manyTags = manyToMany(TagSchema, {
      through: "post_tags",
      joinKeys: ["post_id", "tag_id"],
    });

    expect(hasManyCats.type).toBe("has_many");
    expect(hasOneProfile.type).toBe("has_one");
    expect(belongsToUser.type).toBe("belongs_to");
    expect(manyTags.type).toBe("many_to_many");
  });
});

describe("Association Options", () => {
  test("custom foreign keys", () => {
    const association = hasMany(PostSchema, {
      foreignKey: "custom_author_id",
      references: "custom_id",
    });
    
    expect(association.options.foreignKey).toBe("custom_author_id");
    expect(association.options.references).toBe("custom_id");
  });

  test("dependent options", () => {
    const association = hasMany(PostSchema, {
      dependent: "destroy",
    });
    
    expect(association.options.dependent).toBe("destroy");
  });

  test("through table options for many_to_many", () => {
    const association = manyToMany(TagSchema, {
      through: "custom_post_tags",
      joinKeys: ["custom_post_id", "custom_tag_id"],
    });
    
    expect(association.options.through).toBe("custom_post_tags");
    expect(association.options.joinKeys).toEqual(["custom_post_id", "custom_tag_id"]);
  });
});

describe("Complex Association Scenarios", () => {
  test("user with multiple association types", () => {
    // A user that:
    // - has many posts
    // - has one profile  
    // - has many comments (through posts)
    // - has many tags (through posts)
    
    const userPosts = hasMany(PostSchema, { foreignKey: "author_id" });
    const userProfile = hasOne(ProfileSchema, { foreignKey: "user_id" });
    const userComments = hasMany(CommentSchema, { foreignKey: "author_id" });
    
    expect(userPosts.type).toBe("has_many");
    expect(userProfile.type).toBe("has_one");
    expect(userComments.type).toBe("has_many");
    
    // Test preloading all associations
    const preloadOptions = preload(["posts", "profile", "comments"]);
    expect(preloadOptions.associations).toContain("posts");
    expect(preloadOptions.associations).toContain("profile");
    expect(preloadOptions.associations).toContain("comments");
  });

  test("post with nested associations", () => {
    // A post that belongs to user and has many comments,
    // where comments also belong to users
    
    const postAuthor = belongsTo(UserSchema, { foreignKey: "author_id" });
    const postComments = hasMany(CommentSchema, { foreignKey: "post_id" });
    
    expect(postAuthor.schema).toBe(UserSchema);
    expect(postComments.schema).toBe(CommentSchema);
    
    // Test nested preloading: load posts with comments and their authors
    const nestedPreload = preloadNested({
      author: [],
      comments: ["author"], // Each comment should also load its author
    });
    
    expect(nestedPreload.associations).toEqual(["author", "comments"]);
    expect(nestedPreload.nested.comments).toEqual(["author"]);
  });
});