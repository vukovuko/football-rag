import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  varchar,
  smallint,
  decimal,
  interval,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { matches } from "./matches.ts";
import { teams } from "./matches.ts";
import { countries } from "./competitions.ts";

/**
 * LINEUPS DATA SCHEMA
 *
 * Source: starting_over/04_LINEUPS_03_DATABASE.md
 *
 * CRITICAL: match_id NOT in JSON!
 * - Must extract from filename: data/lineups/{match_id}.json
 * - Example: "15946.json" → match_id = 15946
 *
 * Verification (scripts/verify-lineup-ids.js):
 * - ✅ 10,803 unique players
 * - ✅ player_id is globally unique (safe for PRIMARY KEY)
 * - ✅ 25 standardized positions (1-25)
 * - ✅ 141 countries
 * - ⚠️ 11 players have multiple names (use latest)
 */

// ============================================================================
// ENUMS
// ============================================================================

export const cardTypeEnum = pgEnum("card_type", [
  "Yellow Card",
  "Red Card",
  "Second Yellow",
]);

export const positionCategoryEnum = pgEnum("position_category", [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
]);

// ============================================================================
// DIMENSION TABLES
// ============================================================================

/**
 * Players dimension table
 *
 * Source: Lineups JSON (most reliable source for player names)
 *
 * Note: Some players have multiple name spellings (11 out of 10,803)
 * Strategy: Use latest name encountered during ETL
 */
export const players = pgTable("players", {
  playerId: integer("player_id").primaryKey(),
  playerName: varchar("player_name", { length: 255 }).notNull(),
  playerNickname: varchar("player_nickname", { length: 100 }),

  // Aggregated stats (updated by ETL or triggers)
  totalMatches: integer("total_matches").default(0),
  totalMinutesPlayed: decimal("total_minutes_played", {
    precision: 8,
    scale: 2,
  }).default("0"),
  totalGoals: integer("total_goals").default(0),
  totalAssists: integer("total_assists").default(0),
  totalYellowCards: integer("total_yellow_cards").default(0),
  totalRedCards: integer("total_red_cards").default(0),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Positions reference table (25 standardized positions)
 *
 * Seeded with StatsBomb's position taxonomy (1-25)
 */
export const positions = pgTable("positions", {
  id: integer("id").primaryKey(), // 1-25
  positionName: varchar("position_name", { length: 50 }).notNull().unique(),
  positionCategory: positionCategoryEnum("position_category").notNull(),
  displayOrder: integer("display_order").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// FACT TABLES
// ============================================================================

/**
 * Player lineups - one row per player per match
 *
 * This is the main fact table for matchday squads
 *
 * CRITICAL: match_id extracted from filename!
 */
export const playerLineups = pgTable(
  "player_lineups",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.matchId),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.teamId),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.playerId),
    jerseyNumber: smallint("jersey_number").notNull(),
    countryId: integer("country_id")
      .notNull()
      .references(() => countries.id), // Uses auto-generated ID

    // Denormalized for convenience
    isStarter: boolean("is_starter").notNull(),
    minutesPlayed: decimal("minutes_played", { precision: 5, scale: 2 }),

    // Zero data loss: store complete player object
    rawJson: jsonb("raw_json").notNull(),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniquePlayerMatch: sql`UNIQUE (${table.matchId}, ${table.playerId})`,
    matchIdx: index("idx_player_lineups_match").on(table.matchId),
    playerIdx: index("idx_player_lineups_player").on(table.playerId),
    teamIdx: index("idx_player_lineups_team").on(table.teamId),
    countryIdx: index("idx_player_lineups_country").on(table.countryId),
  })
);

/**
 * Player positions - tracks position changes throughout match
 *
 * Multiple rows per player if tactical shifts occurred
 *
 * Example use cases:
 * - Formation analysis
 * - Tactical shift detection
 * - Link to events: "What position was player X in when they scored?"
 */
export const playerPositions = pgTable(
  "player_positions",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.matchId),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.playerId),
    positionId: integer("position_id")
      .notNull()
      .references(() => positions.id),

    // Timing
    fromTime: interval("from_time").notNull(), // e.g., '00:00:00'
    toTime: interval("to_time"), // NULL = final whistle
    fromPeriod: smallint("from_period").notNull(), // 1-5
    toPeriod: smallint("to_period"), // NULL = final whistle

    // Reasons
    startReason: varchar("start_reason", { length: 100 }).notNull(),
    endReason: varchar("end_reason", { length: 100 }).notNull(),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    matchIdx: index("idx_player_positions_match").on(table.matchId),
    playerIdx: index("idx_player_positions_player").on(table.playerId),
    positionIdx: index("idx_player_positions_position").on(table.positionId),
  })
);

/**
 * Player cards - yellow and red cards received during matches
 *
 * Example use cases:
 * - Disciplinary records per player
 * - Card timing analysis (early/late fouls)
 * - Link to events: "What event triggered this card?"
 */
export const playerCards = pgTable(
  "player_cards",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.matchId),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.playerId),

    // Card details
    time: interval("time").notNull(), // e.g., '78:23:00'
    cardType: cardTypeEnum("card_type").notNull(),
    reason: varchar("reason", { length: 100 }).notNull(),
    period: smallint("period").notNull(), // 1-5

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    matchIdx: index("idx_player_cards_match").on(table.matchId),
    playerIdx: index("idx_player_cards_player").on(table.playerId),
    cardTypeIdx: index("idx_player_cards_type").on(table.cardType),
  })
);
