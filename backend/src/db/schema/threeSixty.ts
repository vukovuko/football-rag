import {
  pgTable,
  serial,
  integer,
  uuid,
  jsonb,
  boolean,
  decimal,
  smallint,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { matches } from "./matches.ts";

// ============================================================================
// 360 FRAMES - Spatial player tracking data
// ============================================================================

/**
 * 360 Frames - One row per event that has tracking data
 *
 * CRITICAL: match_id is extracted from filename!
 * File: data/three-sixty/{match_id}.json
 *
 * Links to events table via event_uuid
 */
export const threeSixtyFrames = pgTable(
  "three_sixty_frames",
  {
    id: serial("id").primaryKey(),

    // Foreign keys
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.matchId),
    eventUuid: uuid("event_uuid").notNull().unique(), // Links to events.id

    // Visible area (camera view polygon)
    // Array of [x, y] coordinates forming a polygon
    // Can be empty array []
    visibleArea: jsonb("visible_area")
      .notNull()
      .default(sql`'[]'`),

    // Metadata
    playerCount: smallint("player_count").notNull().default(0),
    visibleAreaSize: decimal("visible_area_size", { precision: 8, scale: 2 }), // Calculated sq yards

    // Zero data loss: complete frame backup
    rawJson: jsonb("raw_json").notNull(),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    matchIdx: index("idx_360_frames_match").on(table.matchId),
    eventIdx: uniqueIndex("idx_360_frames_event").on(table.eventUuid),
  })
);

/**
 * 360 Players - One row per player per frame (normalized freeze_frame)
 *
 * Stores the position of each visible player at the moment of an event
 *
 * CRITICAL: No player IDs available - only team/role indicators
 */
export const threeSixtyPlayers = pgTable(
  "three_sixty_players",
  {
    id: serial("id").primaryKey(),

    // Foreign key
    frameId: integer("frame_id")
      .notNull()
      .references(() => threeSixtyFrames.id, { onDelete: "cascade" }),

    // Player attributes
    teammate: boolean("teammate").notNull(), // Same team as actor?
    actor: boolean("actor").notNull().default(false), // Player performing the event
    keeper: boolean("keeper").notNull().default(false), // Is goalkeeper

    // Location on pitch
    locationX: decimal("location_x", { precision: 6, scale: 2 })
      .notNull()
      .$type<number>(),
    locationY: decimal("location_y", { precision: 6, scale: 2 })
      .notNull()
      .$type<number>(),

    // Derived fields (for performance)
    distanceToActor: decimal("distance_to_actor", { precision: 6, scale: 2 }),
    inVisibleArea: boolean("in_visible_area").default(true),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    frameIdx: index("idx_360_players_frame").on(table.frameId),
    teammateIdx: index("idx_360_players_teammate").on(table.teammate),
    actorIdx: index("idx_360_players_actor").on(table.actor),
    keeperIdx: index("idx_360_players_keeper").on(table.keeper),
    locationIdx: index("idx_360_players_location").on(
      table.locationX,
      table.locationY
    ),
  })
);

/**
 * Relations helper types
 */
export type ThreeSixtyFrame = typeof threeSixtyFrames.$inferSelect;
export type ThreeSixtyPlayer = typeof threeSixtyPlayers.$inferSelect;
export type NewThreeSixtyFrame = typeof threeSixtyFrames.$inferInsert;
export type NewThreeSixtyPlayer = typeof threeSixtyPlayers.$inferInsert;
