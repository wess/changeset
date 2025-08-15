// PostgreSQL-specific SQL generation from query objects

import type { Query, WhereCondition } from "../types/query.ts";
import type { SqlQuery } from "./sql-generator.ts";

/**
 * Generate PostgreSQL-specific SQL from a query object
 * @param query - Query object
 * @returns SQL string with PostgreSQL parameter placeholders ($1, $2, etc.)
 */
export const generatePostgresSql = (query: Query): SqlQuery => {
  const { schema, whereConditions, selectFields, limitValue, offsetValue, orderByFields, joins, groupByFields, havingConditions, distinctFields } = query;

  // Build SELECT clause
  let selectClause = "*";
  if (selectFields) {
    // For now, we'll use * - in a full implementation we'd parse the selector
    selectClause = "*";
  }

  // Add DISTINCT if specified
  if (distinctFields) {
    selectClause = `DISTINCT ${selectClause}`;
  }

  // Build FROM clause
  let sql = `SELECT ${selectClause} FROM ${schema.tableName}`;
  if (query.alias) {
    sql += ` AS ${query.alias}`;
  }

  const params: unknown[] = [];
  let paramIndex = 1;

  // Add JOIN clauses
  if (joins && joins.length > 0) {
    for (const join of joins) {
      sql += ` ${join.type} JOIN ${join.table}`;
      if (join.alias) {
        sql += ` AS ${join.alias}`;
      }
      sql += ` ON ${join.condition}`;
    }
  }

  // Helper function to generate condition SQL with PostgreSQL parameter syntax
  const generateConditionSql = (condition: WhereCondition): string => {
    const { field, operator, value, conditions } = condition;

    switch (operator) {
      case "eq":
        params.push(value);
        return `${field} = $${paramIndex++}`;
      case "neq":
        params.push(value);
        return `${field} != $${paramIndex++}`;
      case "gt":
        params.push(value);
        return `${field} > $${paramIndex++}`;
      case "gte":
        params.push(value);
        return `${field} >= $${paramIndex++}`;
      case "lt":
        params.push(value);
        return `${field} < $${paramIndex++}`;
      case "lte":
        params.push(value);
        return `${field} <= $${paramIndex++}`;
      case "like":
        params.push(value);
        return `${field} LIKE $${paramIndex++}`;
      case "ilike":
        params.push(value);
        return `${field} ILIKE $${paramIndex++}`; // PostgreSQL supports ILIKE
      case "in": {
        const values = value as unknown[];
        const placeholders = values.map(() => `$${paramIndex++}`).join(", ");
        params.push(...values);
        return `${field} IN (${placeholders})`;
      }
      case "not_in": {
        const notValues = value as unknown[];
        const notPlaceholders = notValues.map(() => `$${paramIndex++}`).join(", ");
        params.push(...notValues);
        return `${field} NOT IN (${notPlaceholders})`;
      }
      case "is_null":
        return `${field} IS NULL`;
      case "is_not_null":
        return `${field} IS NOT NULL`;
      case "and": {
        if (!conditions) {
          return "";
        }
        const andClauses = conditions.map(generateConditionSql).join(" AND ");
        return `(${andClauses})`;
      }
      case "or": {
        if (!conditions) {
          return "";
        }
        const orClauses = conditions.map(generateConditionSql).join(" OR ");
        return `(${orClauses})`;
      }
      case "not": {
        if (!conditions || conditions.length === 0) {
          return "";
        }
        const notClause = generateConditionSql(conditions[0]);
        return `NOT (${notClause})`;
      }
      case "exists": {
        // Handle subquery for EXISTS
        return `EXISTS (${value})`;
      }
      case "not_exists": {
        // Handle subquery for NOT EXISTS
        return `NOT EXISTS (${value})`;
      }
      default:
        params.push(value);
        return `${field} = $${paramIndex++}`;
    }
  };

  // Build WHERE clause
  if (whereConditions.length > 0) {
    const whereClause = whereConditions.map(generateConditionSql).join(" AND ");
    sql += ` WHERE ${whereClause}`;
  }

  // Build GROUP BY clause
  if (groupByFields && groupByFields.length > 0) {
    sql += ` GROUP BY ${groupByFields.join(", ")}`;
  }

  // Build HAVING clause
  if (havingConditions && havingConditions.length > 0) {
    const havingClause = havingConditions.map(generateConditionSql).join(" AND ");
    sql += ` HAVING ${havingClause}`;
  }

  // Build ORDER BY clause
  if (orderByFields.length > 0) {
    const orderClause = orderByFields
      .map((order) => `${order.field} ${order.direction.toUpperCase()}`)
      .join(", ");
    sql += ` ORDER BY ${orderClause}`;
  }

  // Build LIMIT clause
  if (limitValue !== undefined) {
    sql += ` LIMIT ${limitValue}`;
  }

  // Build OFFSET clause
  if (offsetValue !== undefined) {
    sql += ` OFFSET ${offsetValue}`;
  }

  return { sql, params };
};

/**
 * Generate PostgreSQL INSERT statement
 * @param tableName - Table name
 * @param data - Data to insert
 * @returns SQL string with PostgreSQL parameter placeholders
 */
export const generatePostgresInsert = (tableName: string, data: Record<string, unknown>): SqlQuery => {
  const fields = Object.keys(data);
  const values = Object.values(data);
  
  const fieldClause = fields.join(", ");
  const valueClause = values.map((_, index) => `$${index + 1}`).join(", ");
  
  const sql = `INSERT INTO ${tableName} (${fieldClause}) VALUES (${valueClause}) RETURNING *`;
  
  return { sql, params: values };
};

/**
 * Generate PostgreSQL UPDATE statement
 * @param tableName - Table name
 * @param data - Data to update
 * @param whereCondition - WHERE condition
 * @returns SQL string with PostgreSQL parameter placeholders
 */
export const generatePostgresUpdate = (
  tableName: string, 
  data: Record<string, unknown>,
  whereCondition: WhereCondition
): SqlQuery => {
  const fields = Object.keys(data);
  const values = Object.values(data);
  
  let paramIndex = 1;
  const setClause = fields.map(field => `${field} = $${paramIndex++}`).join(", ");
  
  let sql = `UPDATE ${tableName} SET ${setClause}`;
  
  // Add WHERE clause
  const params = [...values];
  const generateConditionSql = (condition: WhereCondition): string => {
    const { field, operator, value } = condition;
    
    switch (operator) {
      case "eq":
        params.push(value);
        return `${field} = $${paramIndex++}`;
      default:
        params.push(value);
        return `${field} = $${paramIndex++}`;
    }
  };
  
  sql += ` WHERE ${generateConditionSql(whereCondition)}`;
  sql += ` RETURNING *`;
  
  return { sql, params };
};

/**
 * Generate PostgreSQL DELETE statement
 * @param tableName - Table name
 * @param whereCondition - WHERE condition
 * @returns SQL string with PostgreSQL parameter placeholders
 */
export const generatePostgresDelete = (
  tableName: string,
  whereCondition: WhereCondition
): SqlQuery => {
  const params: unknown[] = [];
  let paramIndex = 1;
  
  const generateConditionSql = (condition: WhereCondition): string => {
    const { field, operator, value } = condition;
    
    switch (operator) {
      case "eq":
        params.push(value);
        return `${field} = $${paramIndex++}`;
      default:
        params.push(value);
        return `${field} = $${paramIndex++}`;
    }
  };
  
  const sql = `DELETE FROM ${tableName} WHERE ${generateConditionSql(whereCondition)} RETURNING *`;
  
  return { sql, params };
};