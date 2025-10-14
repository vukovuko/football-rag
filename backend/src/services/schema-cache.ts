import { db } from "../db/index.ts";
import { sql } from "drizzle-orm";

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

interface ForeignKeyInfo {
  column: string;
  referencesTable: string;
  referencesColumn: string;
}

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  foreignKeys: ForeignKeyInfo[];
}

let cachedSchema: string | null = null;
let lastFetchTime: number | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

async function fetchDatabaseSchema(): Promise<TableInfo[]> {
  const tablesQuery = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  const tables: TableInfo[] = [];

  for (const tableRow of tablesQuery.rows) {
    const tableName = tableRow.table_name as string;

    const columnsQuery = await db.execute(sql`
      SELECT
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ORDER BY ordinal_position
    `);

    const foreignKeysQuery = await db.execute(sql`
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
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

    tables.push({
      name: tableName,
      columns: columnsQuery.rows.map((col) => ({
        name: col.column_name as string,
        type: col.data_type as string,
        nullable: (col.is_nullable as string) === "YES",
      })),
      foreignKeys: foreignKeysQuery.rows.map((fk) => ({
        column: fk.column_name as string,
        referencesTable: fk.foreign_table_name as string,
        referencesColumn: fk.foreign_column_name as string,
      })),
    });
  }

  return tables;
}

function formatSchemaForAI(tables: TableInfo[]): string {
  const lines: string[] = [];

  lines.push("DATABASE SCHEMA:");
  lines.push("");

  for (const table of tables) {
    lines.push(`Table: ${table.name}`);
    lines.push("Columns:");
    for (const col of table.columns) {
      const nullability = col.nullable ? "NULL" : "NOT NULL";
      lines.push(`  - ${col.name}: ${col.type} (${nullability})`);
    }

    if (table.foreignKeys.length > 0) {
      lines.push("Foreign Keys:");
      for (const fk of table.foreignKeys) {
        lines.push(
          `  - ${fk.column} -> ${fk.referencesTable}.${fk.referencesColumn}`
        );
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

export async function getSchemaContext(): Promise<string> {
  const now = Date.now();

  if (cachedSchema && lastFetchTime && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedSchema;
  }

  const tables = await fetchDatabaseSchema();
  cachedSchema = formatSchemaForAI(tables);
  lastFetchTime = now;

  console.log("Schema cache refreshed");
  return cachedSchema;
}

export function clearSchemaCache(): void {
  cachedSchema = null;
  lastFetchTime = null;
  console.log("Schema cache cleared");
}
