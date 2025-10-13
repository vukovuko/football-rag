import { Router } from "express";
import { db } from "../db/index.ts";
import { sql } from "drizzle-orm";

const router = Router();

/**
 * GET /api/playground/schema
 * Returns comprehensive database schema information
 */
router.get("/schema", async (req, res) => {
  try {
    // Query information_schema for complete table and column metadata
    const tablesQuery = await db.execute(sql`
      SELECT 
        t.table_name,
        t.table_schema,
        (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = t.table_schema) as column_count
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name
    `);

    const tables = [];

    for (const table of tablesQuery.rows) {
      const tableName = table.table_name as string;

      // Get row count for each table
      let rowCount = 0;
      try {
        const countResult = await db.execute(
          sql.raw(`SELECT COUNT(*) as count FROM "${tableName}"`)
        );
        rowCount = parseInt(countResult.rows[0].count as string);
      } catch (err) {
        // If count fails, just use 0
        rowCount = 0;
      }

      // Get columns with detailed metadata
      const columnsQuery = await db.execute(sql`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ORDER BY ordinal_position
      `);

      // Get primary keys
      const primaryKeysQuery = await db.execute(sql`
        SELECT a.attname as column_name
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = ${tableName}::regclass AND i.indisprimary
      `);

      // Get foreign keys
      const foreignKeysQuery = await db.execute(sql`
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = ${tableName}
      `);

      // Get unique constraints
      const uniqueConstraintsQuery = await db.execute(sql`
        SELECT
          kcu.column_name,
          tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_schema = 'public'
          AND tc.table_name = ${tableName}
      `);

      // Get indexes
      const indexesQuery = await db.execute(sql`
        SELECT
          i.relname as index_name,
          a.attname as column_name,
          ix.indisunique as is_unique
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relname = ${tableName}
          AND t.relkind = 'r'
        ORDER BY i.relname
      `);

      const primaryKeys = primaryKeysQuery.rows.map((row) => row.column_name);
      const uniqueColumns = uniqueConstraintsQuery.rows.map(
        (row) => row.column_name
      );

      tables.push({
        name: tableName,
        rowCount,
        columns: columnsQuery.rows.map((col) => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === "YES",
          default: col.column_default,
          maxLength: col.character_maximum_length,
          precision: col.numeric_precision,
          scale: col.numeric_scale,
          isPrimaryKey: primaryKeys.includes(col.column_name),
          isUnique: uniqueColumns.includes(col.column_name),
        })),
        primaryKeys,
        foreignKeys: foreignKeysQuery.rows.map((fk) => ({
          columnName: fk.column_name,
          referencedTable: fk.foreign_table_name,
          referencedColumn: fk.foreign_column_name,
          constraintName: fk.constraint_name,
        })),
        uniqueConstraints: uniqueConstraintsQuery.rows.map((uc) => ({
          columnName: uc.column_name,
          constraintName: uc.constraint_name,
        })),
        indexes: indexesQuery.rows.map((idx) => ({
          name: idx.index_name,
          columnName: idx.column_name,
          isUnique: idx.is_unique,
        })),
      });
    }

    res.json({
      success: true,
      data: {
        tables,
        totalTables: tables.length,
        totalColumns: tables.reduce((sum, t) => sum + t.columns.length, 0),
      },
    });
  } catch (error) {
    console.error("Error fetching schema:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch database schema",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/playground/query
 * Execute read-only SQL queries with validation
 */
router.post("/query", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        success: false,
        error: "Query is required and must be a string",
      });
    }

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return res.status(400).json({
        success: false,
        error: "Query cannot be empty",
      });
    }

    // Backend validation - block dangerous operations
    const dangerousKeywords = [
      "INSERT",
      "UPDATE",
      "DELETE",
      "DROP",
      "TRUNCATE",
      "ALTER",
      "CREATE",
      "GRANT",
      "REVOKE",
      "EXECUTE",
      "EXEC",
    ];

    const upperQuery = trimmedQuery.toUpperCase();

    for (const keyword of dangerousKeywords) {
      // Check for keyword as a whole word (with word boundaries)
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(trimmedQuery)) {
        return res.status(403).json({
          success: false,
          error: `Query rejected: ${keyword} operations are not allowed in playground mode`,
        });
      }
    }

    // Check for multiple statements (SQL injection prevention)
    const statements = trimmedQuery.split(";").filter((s) => s.trim());
    if (statements.length > 1) {
      return res.status(403).json({
        success: false,
        error:
          "Multiple statements are not allowed. Execute one query at a time.",
      });
    }

    // Ensure query starts with SELECT
    if (!upperQuery.startsWith("SELECT") && !upperQuery.startsWith("WITH")) {
      return res.status(403).json({
        success: false,
        error: "Only SELECT queries are allowed in playground mode",
      });
    }

    // Execute query with timing
    const startTime = Date.now();
    const result = await db.execute(sql.raw(trimmedQuery));
    const executionTime = Date.now() - startTime;

    // Extract column metadata from result
    const columns =
      result.rows.length > 0
        ? Object.keys(result.rows[0]).map((key) => ({
            name: key,
            type: typeof result.rows[0][key],
          }))
        : [];

    res.json({
      success: true,
      data: {
        rows: result.rows,
        columns,
        rowCount: result.rows.length,
        executionTime,
      },
    });
  } catch (error) {
    console.error("Query execution error:", error);
    res.status(400).json({
      success: false,
      error: "Query execution failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export { router as playgroundRouter };
