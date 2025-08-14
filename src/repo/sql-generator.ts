// SQL generation from query objects

import type { Query, WhereCondition } from "../types/query.ts";

export interface SqlQuery {
  sql: string;
  params: unknown[];
}

/**
 * Generate SQL from a query object
 * @param query - Query object
 * @returns SQL string and parameters
 */
export const generateSql = (query: Query): SqlQuery => {
  const { schema, whereConditions, selectFields, limitValue, offsetValue, orderByFields } = query;

  // Build SELECT clause
  let selectClause = "*";
  if (selectFields) {
    // For now, we'll use * - in a full implementation we'd parse the selector
    selectClause = "*";
  }

  // Build FROM clause
  let sql = `SELECT ${selectClause} FROM ${schema.tableName}`;
  if (query.alias) {
    sql += ` AS ${query.alias}`;
  }

  const params: unknown[] = [];
  const _paramIndex = 1;

  // Helper function to generate condition SQL
  const generateConditionSql = (condition: WhereCondition): string => {
    const { field, operator, value, conditions } = condition;

    switch (operator) {
      case "eq":
        params.push(value);
        return `${field} = ?`;
      case "neq":
        params.push(value);
        return `${field} != ?`;
      case "gt":
        params.push(value);
        return `${field} > ?`;
      case "gte":
        params.push(value);
        return `${field} >= ?`;
      case "lt":
        params.push(value);
        return `${field} < ?`;
      case "lte":
        params.push(value);
        return `${field} <= ?`;
      case "like":
        params.push(value);
        return `${field} LIKE ?`;
      case "ilike":
        params.push(value);
        return `${field} LIKE ?`; // SQLite doesn't have ILIKE, using LIKE
      case "in": {
        const values = value as unknown[];
        const placeholders = values.map(() => "?").join(", ");
        params.push(...values);
        return `${field} IN (${placeholders})`;
      }
      case "not_in": {
        const notValues = value as unknown[];
        const notPlaceholders = notValues.map(() => "?").join(", ");
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
      default:
        params.push(value);
        return `${field} = ?`;
    }
  };

  // Build WHERE clause
  if (whereConditions.length > 0) {
    const whereClause = whereConditions.map(generateConditionSql).join(" AND ");

    sql += ` WHERE ${whereClause}`;
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
 * Generate INSERT SQL
 * @param tableName - Table name
 * @param data - Data to insert
 * @returns SQL query
 */
export const generateInsertSql = (tableName: string, data: Record<string, unknown>): SqlQuery => {
  const fields = Object.keys(data);
  const values = Object.values(data);

  const fieldList = fields.join(", ");
  const placeholders = fields.map((_, index) => `$${index + 1}`).join(", ");

  const sql = `INSERT INTO ${tableName} (${fieldList}) VALUES (${placeholders}) RETURNING *`;

  return { sql, params: values };
};

/**
 * Generate UPDATE SQL
 * @param tableName - Table name
 * @param data - Data to update
 * @param whereConditions - Where conditions
 * @returns SQL query
 */
export const generateUpdateSql = (
  tableName: string,
  data: Record<string, unknown>,
  whereConditions: WhereCondition[],
): SqlQuery => {
  const fields = Object.keys(data);
  const values = Object.values(data);

  let paramIndex = 1;
  const setClause = fields.map((field) => `${field} = $${paramIndex++}`).join(", ");

  let sql = `UPDATE ${tableName} SET ${setClause}`;
  const params = [...values];

  if (whereConditions.length > 0) {
    const whereClause = whereConditions
      .map((condition) => {
        params.push(condition.value);
        return `${condition.field} = $${paramIndex++}`;
      })
      .join(" AND ");
    sql += ` WHERE ${whereClause}`;
  }

  sql += " RETURNING *";

  return { sql, params };
};

/**
 * Generate DELETE SQL
 * @param tableName - Table name
 * @param whereConditions - Where conditions
 * @returns SQL query
 */
export const generateDeleteSql = (
  tableName: string,
  whereConditions: WhereCondition[],
): SqlQuery => {
  let sql = `DELETE FROM ${tableName}`;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (whereConditions.length > 0) {
    const whereClause = whereConditions
      .map((condition) => {
        params.push(condition.value);
        return `${condition.field} = $${paramIndex++}`;
      })
      .join(" AND ");
    sql += ` WHERE ${whereClause}`;
  }

  return { sql, params };
};
