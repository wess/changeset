// Tests for Phase 2 Advanced Query Features

import { describe, expect, test } from "bun:test";
import {
  and,
  createSchema,
  f,
  from,
  or,
  not,
  exists,
  contains,
  startsWith,
  endsWith,
  inSubquery,
  notInSubquery,
  existsSubquery,
  notExistsSubquery,
} from "../src/index.ts";

// Test schemas
const UserSchema = createSchema("User", {
  id: f.id(),
  name: f.string("name", { null: false }),
  email: f.string("email", { null: false }),
  age: f.integer("age"),
  active: f.boolean("active", { default: true }),
  createdAt: f.utcDateTime("created_at", { null: false }),
});

const PostSchema = createSchema("Post", {
  id: f.id(), 
  title: f.string("title", { null: false }),
  content: f.string("content", { null: false }),
  authorId: f.string("author_id", { null: false }),
  published: f.boolean("published", { default: false }),
  publishedAt: f.utcDateTime("published_at"),
});

const CommentSchema = createSchema("Comment", {
  id: f.id(),
  postId: f.string("post_id", { null: false }),
  authorId: f.string("author_id", { null: false }),
  content: f.string("content", { null: false }),
  likes: f.integer("likes", { default: 0 }),
});

describe("Extended Query DSL", () => {
  describe("joins", () => {
    test("inner join", () => {
      const query = from(UserSchema)
        .innerJoin(PostSchema, "users.id = posts.author_id")
        .where((u) => u.active.eq(true));
      
      expect(query.build().joins).toHaveLength(1);
      expect(query.build().joins[0].type).toBe("INNER");
      expect(query.build().joins[0].table).toBe("posts");
    });

    test("left join with alias", () => {
      const query = from(UserSchema)
        .leftJoin(PostSchema, "users.id = p.author_id", "p");
      
      expect(query.build().joins[0].type).toBe("LEFT");
      expect(query.build().joins[0].alias).toBe("p");
    });

    test("multiple joins", () => {
      const query = from(UserSchema)
        .innerJoin(PostSchema, "users.id = posts.author_id")
        .leftJoin(CommentSchema, "posts.id = comments.post_id");
      
      expect(query.build().joins).toHaveLength(2);
    });
  });

  describe("groupBy and having", () => {
    test("group by single field", () => {
      const query = from(PostSchema)
        .groupBy("author_id")
        .having((p) => p.id.gt(0));
      
      expect(query.build().groupByFields).toContain("author_id");
      expect(query.build().havingConditions).toHaveLength(1);
    });

    test("group by multiple fields", () => {
      const query = from(PostSchema)
        .groupBy("author_id", "published");
      
      expect(query.build().groupByFields).toEqual(["author_id", "published"]);
    });
  });

  describe("distinct", () => {
    test("adds distinct clause", () => {
      const query = from(UserSchema)
        .distinct()
        .where((u) => u.active.eq(true));
      
      expect(query.build().distinctFields).toBe(true);
    });
  });

  describe("offset", () => {
    test("adds offset", () => {
      const query = from(UserSchema)
        .limit(10)
        .offset(20);
      
      expect(query.build().limitValue).toBe(10);
      expect(query.build().offsetValue).toBe(20);
    });
  });
});

describe("Logical Operators", () => {
  test("and operator", () => {
    const condition = and(
      { field: "age", operator: "gte", value: 18 },
      { field: "active", operator: "eq", value: true }
    );
    
    expect(condition.operator).toBe("and");
    expect(condition.conditions).toHaveLength(2);
  });

  test("or operator", () => {
    const condition = or(
      { field: "age", operator: "lt", value: 18 },
      { field: "age", operator: "gt", value: 65 }
    );
    
    expect(condition.operator).toBe("or");
    expect(condition.conditions).toHaveLength(2);
  });

  test("not operator", () => {
    const condition = not({ field: "active", operator: "eq", value: false });
    
    expect(condition.operator).toBe("not");
    expect(condition.conditions).toHaveLength(1);
    expect(condition.conditions[0]).toEqual({ field: "active", operator: "eq", value: false });
  });
});

describe("String Operations", () => {
  test("exists helper", () => {
    const condition = exists("email");
    
    expect(condition.field).toBe("email");
    expect(condition.operator).toBe("is_not_null");
  });

  test("contains helper", () => {
    const condition = contains("title", "TypeScript");
    
    expect(condition.field).toBe("title");
    expect(condition.operator).toBe("like");
    expect(condition.value).toBe("%TypeScript%");
  });

  test("startsWith helper", () => {
    const condition = startsWith("name", "John");
    
    expect(condition.field).toBe("name");
    expect(condition.operator).toBe("like");
    expect(condition.value).toBe("John%");
  });

  test("endsWith helper", () => {
    const condition = endsWith("email", "@example.com");
    
    expect(condition.field).toBe("email");
    expect(condition.operator).toBe("like");
    expect(condition.value).toBe("%@example.com");
  });
});

describe("Subquery Support", () => {
  test("inSubquery creates condition", () => {
    const subquery = from(PostSchema)
      .select((p) => "author_id")
      .where((p) => p.published.eq(true));
    
    const condition = inSubquery("id", subquery);
    
    expect(condition.field).toBe("id");
    expect(condition.operator).toBe("in");
    expect(typeof condition.value).toBe("string");
  });

  test("notInSubquery creates condition", () => {
    const subquery = from(PostSchema)
      .select((p) => "author_id")
      .where((p) => p.published.eq(false));
    
    const condition = notInSubquery("id", subquery);
    
    expect(condition.field).toBe("id");
    expect(condition.operator).toBe("not_in");
  });

  test("existsSubquery creates condition", () => {
    const subquery = from(CommentSchema)
      .where((c) => c.likes.gt(10));
    
    const condition = existsSubquery(subquery);
    
    expect(condition.field).toBe("_exists");
    expect(condition.operator).toBe("exists");
  });

  test("notExistsSubquery creates condition", () => {
    const subquery = from(CommentSchema)
      .where((c) => c.likes.eq(0));
    
    const condition = notExistsSubquery(subquery);
    
    expect(condition.field).toBe("_not_exists");
    expect(condition.operator).toBe("not_exists");
  });
});

describe("Complex Query Combinations", () => {
  test("complex query with joins, where, groupBy, having, order, limit", () => {
    const query = from(UserSchema)
      .innerJoin(PostSchema, "users.id = posts.author_id")
      .where((u) => u.active.eq(true))
      .where((u) => u.age.gte(18))
      .groupBy("users.id", "users.name")
      .having((u) => u.id.gt(0))
      .orderBy("name")
      .limit(50)
      .offset(100);
    
    const built = query.build();
    
    expect(built.joins).toHaveLength(1);
    expect(built.whereConditions).toHaveLength(2);
    expect(built.groupByFields).toEqual(["users.id", "users.name"]);
    expect(built.havingConditions).toHaveLength(1);
    expect(built.orderByFields).toHaveLength(1);
    expect(built.limitValue).toBe(50);
    expect(built.offsetValue).toBe(100);
  });

  test("nested logical conditions", () => {
    const query = from(UserSchema)
      .where((u) => 
        and(
          u.active.eq(true),
          or(
            u.age.lt(25),
            u.age.gt(55)
          )
        )
      );
    
    expect(query.build().whereConditions).toHaveLength(1);
    expect(query.build().whereConditions[0].operator).toBe("and");
  });

  test("subquery in where clause", () => {
    const activeAuthorsSubquery = from(PostSchema)
      .select((p) => "author_id")
      .where((p) => p.published.eq(true))
      .distinct();

    const query = from(UserSchema)
      .where((u) => inSubquery("id", activeAuthorsSubquery));
    
    expect(query.build().whereConditions).toHaveLength(1);
    expect(query.build().whereConditions[0].operator).toBe("in");
  });
});

describe("Query Building Methods", () => {
  test("build() returns query object", () => {
    const query = from(UserSchema)
      .where((u) => u.active.eq(true));
    
    const built = query.build();
    
    expect(built.schema).toBe(UserSchema);
    expect(built.whereConditions).toHaveLength(1);
  });

  test("toString() generates SQL string", () => {
    const query = from(UserSchema)
      .where((u) => u.active.eq(true));
    
    const sql = query.toString();
    
    expect(typeof sql).toBe("string");
    expect(sql).toContain("SELECT");
    expect(sql).toContain("users");
  });

  test("chaining returns new query objects", () => {
    const baseQuery = from(UserSchema);
    const query1 = baseQuery.where((u) => u.active.eq(true));
    const query2 = baseQuery.where((u) => u.age.gt(21));
    
    expect(query1).not.toBe(query2);
    expect(query1.build().whereConditions).not.toEqual(query2.build().whereConditions);
  });
});