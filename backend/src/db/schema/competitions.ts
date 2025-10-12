import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  varchar,
  primaryKey as pgPrimaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * COMPETITIONS DATA SCHEMA
 *
 * Source: starting_over/01_COMPETITIONS_03_INSIGHTS.md
 *
 * This file contains:
 * - Countries (lookup table)
 * - Competitions (master table)
 * - Seasons (per-competition seasons)
 *
 * Total: 3 tables, ~75 rows
 */

// ============================================================================
// COUNTRIES TABLE
// ============================================================================

/**
 * Countries lookup table
 *
 * DUAL-ID ARCHITECTURE:
 * - `id`: Auto-generated primary key for all foreign key references
 * - `statsbomb_id`: StatsBomb's original IDs (214=Spain, 68=England, etc.)
 *                   NULL for regions like "Africa", "Europe" (not in matches data)
 *
 * Strategy:
 * 1. Matches ETL loads countries with statsbomb_id from matches JSON
 * 2. Competitions ETL adds missing regions (statsbomb_id = NULL)
 * 3. All tables reference the auto-generated `id` (not statsbomb_id)
 *
 * Benefits:
 * - No ID conflicts between real countries and regions
 * - Preserves StatsBomb IDs for reference
 * - Referential integrity via foreign keys
 * - Can query by either ID or name
 */
export const countries = pgTable("countries", {
  id: serial("id").primaryKey(), // Auto-generated (1, 2, 3...)
  statsbombId: integer("statsbomb_id").unique(), // StatsBomb IDs (nullable for regions)
  name: text("name").unique().notNull(),
  type: varchar("type", { length: 20 })
    .notNull()
    .default("country")
    .$type<"country" | "region" | "international">(),
});

// ============================================================================
// COMPETITIONS TABLE
// ============================================================================

/**
 * Competitions master table
 *
 * Source: Lines 163-172
 *
 * Stores unique competitions (La Liga, Premier League, etc.)
 * One competition can have many seasons.
 */
export const competitions = pgTable("competitions", {
  competitionId: integer("competition_id").primaryKey(),
  competitionName: text("competition_name").notNull(),
  countryId: integer("country_id").references(() => countries.id),
  competitionGender: varchar("competition_gender", { length: 10 })
    .notNull()
    .$type<"male" | "female">(),
  competitionYouth: boolean("competition_youth").notNull().default(false),
  competitionInternational: boolean("competition_international")
    .notNull()
    .default(false),
  // CRITICAL: raw_json for zero data loss (ZERO_DATA_LOSS_STRATEGY.md)
  rawJson: jsonb("raw_json").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// SEASONS TABLE
// ============================================================================

/**
 * Seasons table
 *
 * Source: Lines 175-186
 *
 * Stores individual seasons for each competition.
 * Each season has its own match data and 360 tracking availability.
 */
export const seasons = pgTable(
  "seasons",
  {
    seasonId: integer("season_id").notNull(),
    competitionId: integer("competition_id")
      .notNull()
      .references(() => competitions.competitionId),
    seasonName: text("season_name").notNull(),
    matchUpdated: timestamp("match_updated", { withTimezone: true }).notNull(),
    matchAvailable: timestamp("match_available", {
      withTimezone: true,
    }).notNull(),
    matchUpdated360: timestamp("match_updated_360", { withTimezone: true }),
    matchAvailable360: timestamp("match_available_360", {
      withTimezone: true,
    }),
    // CRITICAL: raw_json for zero data loss (ZERO_DATA_LOSS_STRATEGY.md)
    rawJson: jsonb("raw_json").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // Composite primary key: (competition_id, season_id)
    pk: pgPrimaryKey({ columns: [table.competitionId, table.seasonId] }),
  })
);

// TODO: Add indexes after we verify schema works
// Source: Lines 188-193
