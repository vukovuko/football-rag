import {
  pgTable,
  uuid,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  decimal,
  interval,
  smallint,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { matches, teams } from "./matches.ts";
import { players, positions } from "./lineups.ts";

// ============================================================================
// LOOKUP TABLES
// ============================================================================

export const eventTypes = pgTable("event_types", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

export const playPatterns = pgTable("play_patterns", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

export const bodyParts = pgTable("body_parts", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

// Pass-specific lookups
export const passHeights = pgTable("pass_heights", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

export const passTypes = pgTable("pass_types", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

export const passTechniques = pgTable("pass_techniques", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

export const passOutcomes = pgTable("pass_outcomes", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

// Shot-specific lookups
export const shotOutcomes = pgTable("shot_outcomes", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

export const shotTypes = pgTable("shot_types", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

export const shotTechniques = pgTable("shot_techniques", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

// Duel lookups
export const duelTypes = pgTable("duel_types", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

export const duelOutcomes = pgTable("duel_outcomes", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

// Goalkeeper lookups
export const goalkeeperPositions = pgTable("goalkeeper_positions", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

export const goalkeeperTechniques = pgTable("goalkeeper_techniques", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

export const goalkeeperTypes = pgTable("goalkeeper_types", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

export const goalkeeperOutcomes = pgTable("goalkeeper_outcomes", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

// Additional outcome tables for other event types (extracted from actual data)
export const dribbleOutcomes = pgTable("dribble_outcomes", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

export const interceptionOutcomes = pgTable("interception_outcomes", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

export const ballReceiptOutcomes = pgTable("ball_receipt_outcomes", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

export const fiftyFiftyOutcomes = pgTable("fifty_fifty_outcomes", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

// ============================================================================
// CORE EVENTS TABLE
// ============================================================================

/**
 * Core events table - all events regardless of type
 *
 * CRITICAL: match_id is extracted from filename, not from JSON!
 * CRITICAL: player_id and location can be NULL (admin events)
 */
export const events = pgTable(
  "events",
  {
    // Identity
    id: uuid("id").primaryKey(),
    index: integer("index").notNull(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.matchId),

    // Timing
    period: smallint("period").notNull(),
    timestamp: interval("timestamp").notNull(),
    minute: smallint("minute").notNull(),
    second: smallint("second").notNull(),

    // Type & Context
    typeId: integer("type_id")
      .notNull()
      .references(() => eventTypes.id),
    possession: integer("possession").notNull(),
    possessionTeamId: integer("possession_team_id")
      .notNull()
      .references(() => teams.teamId),
    playPatternId: integer("play_pattern_id").references(() => playPatterns.id),

    // Actors (NULLABLE!)
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.teamId),
    playerId: integer("player_id").references(() => players.playerId), // NULLABLE
    positionId: integer("position_id").references(() => positions.id),

    // Location (NULLABLE!)
    locationX: decimal("location_x", { precision: 5, scale: 2 }),
    locationY: decimal("location_y", { precision: 5, scale: 2 }),

    // Duration & Flags
    duration: decimal("duration", { precision: 10, scale: 4 }),
    underPressure: boolean("under_pressure").notNull().default(false),
    offCamera: boolean("off_camera").notNull().default(false),
    out: boolean("out").notNull().default(false),
    counterpress: boolean("counterpress").notNull().default(false),

    // Raw JSON Backup (Zero Data Loss)
    rawJson: jsonb("raw_json").notNull(),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    matchIdx: index("idx_events_match").on(table.matchId),
    typeIdx: index("idx_events_type").on(table.typeId),
    playerIdx: index("idx_events_player").on(table.playerId),
    teamIdx: index("idx_events_team").on(table.teamId),
    periodMinuteIdx: index("idx_events_period_minute").on(
      table.period,
      table.minute
    ),
    possessionIdx: index("idx_events_possession").on(table.possession),
    matchIndexIdx: index("idx_events_match_index").on(
      table.matchId,
      table.index
    ),
  })
);

// ============================================================================
// EVENT RELATIONSHIPS (Junction Table)
// ============================================================================

export const eventRelationships = pgTable(
  "event_relationships",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    relatedEventId: uuid("related_event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.eventId, table.relatedEventId] }),
  })
);

// ============================================================================
// SUBTYPE TABLES
// ============================================================================

/**
 * Passes - most common event type (~40% of all events)
 */
export const passes = pgTable("passes", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),

  // Recipient
  recipientId: integer("recipient_id").references(() => players.playerId),

  // Pass geometry
  length: decimal("length", { precision: 5, scale: 2 }),
  angle: decimal("angle", { precision: 6, scale: 4 }),
  endX: decimal("end_x", { precision: 5, scale: 2 }),
  endY: decimal("end_y", { precision: 5, scale: 2 }),

  // Pass characteristics
  heightId: integer("height_id").references(() => passHeights.id),
  typeId: integer("type_id").references(() => passTypes.id),
  bodyPartId: integer("body_part_id").references(() => bodyParts.id),
  techniqueId: integer("technique_id").references(() => passTechniques.id),
  outcomeId: integer("outcome_id").references(() => passOutcomes.id),

  // Assists
  shotAssist: boolean("shot_assist").notNull().default(false),
  goalAssist: boolean("goal_assist").notNull().default(false),
  assistedShotId: uuid("assisted_shot_id").references(() => events.id),

  // Boolean attributes
  switch: boolean("switch").notNull().default(false),
  cross: boolean("cross").notNull().default(false),
  cutBack: boolean("cut_back").notNull().default(false),
  deflected: boolean("deflected").notNull().default(false),
  miscommunication: boolean("miscommunication").notNull().default(false),
  aerialWon: boolean("aerial_won").notNull().default(false),
  noTouch: boolean("no_touch").notNull().default(false),
  backheel: boolean("backheel").notNull().default(false),

  // Deprecated fields (keep for compatibility)
  throughBall: boolean("through_ball").notNull().default(false),
  inswinging: boolean("inswinging").notNull().default(false),
  outswinging: boolean("outswinging").notNull().default(false),
  straight: boolean("straight").notNull().default(false),
});

/**
 * Shots - critical for xG analysis
 */
export const shots = pgTable("shots", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),

  // xG and location
  shotXg: decimal("shot_xg", { precision: 5, scale: 4 }),
  endX: decimal("end_x", { precision: 5, scale: 2 }),
  endY: decimal("end_y", { precision: 5, scale: 2 }),
  endZ: decimal("end_z", { precision: 4, scale: 2 }), // 3D coordinate!

  // Shot characteristics
  outcomeId: integer("outcome_id")
    .notNull()
    .references(() => shotOutcomes.id),
  typeId: integer("type_id").references(() => shotTypes.id),
  bodyPartId: integer("body_part_id").references(() => bodyParts.id),
  techniqueId: integer("technique_id").references(() => shotTechniques.id),

  // Boolean flags
  firstTime: boolean("first_time").notNull().default(false),
  oneOnOne: boolean("one_on_one").notNull().default(false),
  aerialWon: boolean("aerial_won").notNull().default(false),
  deflected: boolean("deflected").notNull().default(false),
  openGoal: boolean("open_goal").notNull().default(false),
  followsDribble: boolean("follows_dribble").notNull().default(false),
  redirect: boolean("redirect").notNull().default(false),

  // Relationships
  keyPassId: uuid("key_pass_id").references(() => events.id),

  // Freeze frame (JSONB for player positions)
  freezeFrame: jsonb("freeze_frame"),
});

/**
 * Carries - ball carrying events (v1.1.0)
 */
export const carries = pgTable("carries", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  endX: decimal("end_x", { precision: 5, scale: 2 }),
  endY: decimal("end_y", { precision: 5, scale: 2 }),
});

/**
 * Dribbles - beating opponents with the ball
 */
export const dribbles = pgTable("dribbles", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  outcomeId: integer("outcome_id").references(() => dribbleOutcomes.id),
  overrun: boolean("overrun").notNull().default(false),
  nutmeg: boolean("nutmeg").notNull().default(false),
  noTouch: boolean("no_touch").notNull().default(false),
});

/**
 * Pressures - defensive pressure
 */
export const pressures = pgTable("pressures", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  counterpress: boolean("counterpress").notNull().default(false),
});

/**
 * Duels - 1v1 contests
 */
export const duels = pgTable("duels", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  duelTypeId: integer("duel_type_id").references(() => duelTypes.id),
  outcomeId: integer("outcome_id").references(() => duelOutcomes.id),
  counterpress: boolean("counterpress").notNull().default(false),
});

/**
 * Blocks - defensive blocks
 */
export const blocks = pgTable("blocks", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  deflection: boolean("deflection").notNull().default(false),
  offensive: boolean("offensive").notNull().default(false),
  saveBlock: boolean("save_block").notNull().default(false),
  counterpress: boolean("counterpress").notNull().default(false),
});

/**
 * Interceptions
 */
export const interceptions = pgTable("interceptions", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  outcomeId: integer("outcome_id").references(() => interceptionOutcomes.id),
  counterpress: boolean("counterpress").notNull().default(false),
});

/**
 * Clearances
 */
export const clearances = pgTable("clearances", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  bodyPartId: integer("body_part_id").references(() => bodyParts.id),
  aerialWon: boolean("aerial_won").notNull().default(false),
});

/**
 * Ball Receipts
 */
export const ballReceipts = pgTable("ball_receipts", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  outcomeId: integer("outcome_id").references(() => ballReceiptOutcomes.id),
});

/**
 * Ball Recoveries
 */
export const ballRecoveries = pgTable("ball_recoveries", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  recoveryFailure: boolean("recovery_failure").notNull().default(false),
  offensive: boolean("offensive").notNull().default(false),
});

/**
 * 50/50 contests
 */
export const fiftyFifties = pgTable("fifty_fifties", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  outcomeId: integer("outcome_id").references(() => fiftyFiftyOutcomes.id),
  counterpress: boolean("counterpress").notNull().default(false),
});

/**
 * Fouls
 */
export const fouls = pgTable("fouls", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  penalty: boolean("penalty").notNull().default(false),
  cardId: integer("card_id"), // Yellow, Red, Second Yellow
  foulTypeId: integer("foul_type_id"),
  counterpress: boolean("counterpress").notNull().default(false),
});

/**
 * Bad Behaviour (cards)
 */
export const badBehaviours = pgTable("bad_behaviours", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  cardId: integer("card_id"),
});

/**
 * Goalkeeper Events
 */
export const goalkeeperEvents = pgTable("goalkeeper_events", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  positionId: integer("position_id").references(() => goalkeeperPositions.id),
  techniqueId: integer("technique_id").references(
    () => goalkeeperTechniques.id
  ),
  bodyPartId: integer("body_part_id").references(() => bodyParts.id),
  gkTypeId: integer("gk_type_id").references(() => goalkeeperTypes.id),
  outcomeId: integer("outcome_id").references(() => goalkeeperOutcomes.id),
});
