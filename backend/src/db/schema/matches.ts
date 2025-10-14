/**
 * Matches Database Schema
 *
 * Tables:
 * 1. competition_stages - Lookup table for tournament stages
 * 2. teams - Team information
 * 3. managers - Manager information
 * 4. stadiums - Stadium information
 * 5. referees - Referee information
 * 6. matches - Core match data
 * 7. match_managers - Junction table linking managers to matches
 *
 * Verified: All IDs are globally unique (see 02_MATCHES_05_VERIFICATION_RESULTS.md)
 */

import {
  pgTable,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  varchar,
  date,
  time,
  primaryKey as pgPrimaryKey,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { countries } from "./competitions.ts";
import { competitions, seasons } from "./competitions.ts";

// ============================================================================
// DIMENSION TABLES
// ============================================================================

/**
 * Competition Stages Lookup Table
 *
 * Purpose: Tournament stages (Regular Season, Finals, etc.)
 * Count: 12 unique stages
 * Source: Extracted from match data
 *
 * Verified: All stage IDs are globally unique
 */
export const competitionStages = pgTable("competition_stages", {
  id: integer("id").primaryKey(),
  name: text("name").unique().notNull(),
});

/**
 * Teams Dimension Table
 *
 * Purpose: All teams across all competitions
 * Count: 312 teams
 * Source: Extracted from home_team and away_team in matches
 *
 * Verified: team_id is globally unique
 */
export const teams = pgTable(
  "teams",
  {
    teamId: integer("team_id").primaryKey(),
    teamName: text("team_name").notNull(),
    teamGender: varchar("team_gender", { length: 10 })
      .notNull()
      .$type<"male" | "female">(),
    countryId: integer("country_id").references(() => countries.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    countryIdx: index("idx_teams_country").on(table.countryId),
    genderIdx: index("idx_teams_gender").on(table.teamGender),
  })
);

/**
 * Managers Dimension Table
 *
 * Purpose: All managers/coaches
 * Count: 557 managers
 * Source: Extracted from home_team.managers and away_team.managers arrays
 *
 * Verified: manager_id is globally unique
 * Note: 69.7% don't have nicknames, 1.3% missing DOB
 */
export const managers = pgTable(
  "managers",
  {
    managerId: integer("manager_id").primaryKey(),
    managerName: text("manager_name").notNull(),
    managerNickname: text("manager_nickname"), // 69.7% null
    dateOfBirth: date("date_of_birth"), // 1.3% null
    countryId: integer("country_id").references(() => countries.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    countryIdx: index("idx_managers_country").on(table.countryId),
  })
);

/**
 * Stadiums Dimension Table
 *
 * Purpose: All stadiums/venues
 * Count: 275 stadiums
 * Source: Extracted from match.stadium
 *
 * Verified: stadium_id is globally unique
 * Note: Stadium names can change over time (sponsor rebranding)
 *       - Stadium ID 4725: "Inter&Co Stadium" → "Exploria Stadium"
 *       - Stadium ID 369: "MHPArena" → "Mercedes-Benz-Arena"
 * Strategy: Use latest name encountered during ETL
 */
export const stadiums = pgTable(
  "stadiums",
  {
    stadiumId: integer("stadium_id").primaryKey(),
    stadiumName: text("stadium_name").notNull(),
    countryId: integer("country_id").references(() => countries.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    countryIdx: index("idx_stadiums_country").on(table.countryId),
  })
);

/**
 * Referees Dimension Table
 *
 * Purpose: All referees/officials
 * Count: 440 referees
 * Source: Extracted from match.referee
 *
 * Verified: referee_id is globally unique
 */
export const referees = pgTable(
  "referees",
  {
    refereeId: integer("referee_id").primaryKey(),
    refereeName: text("referee_name").notNull(),
    countryId: integer("country_id").references(() => countries.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    countryIdx: index("idx_referees_country").on(table.countryId),
  })
);

// ============================================================================
// MAIN MATCHES TABLE
// ============================================================================

/**
 * Matches Table
 *
 * Purpose: Core match data linking competitions, teams, and events
 * Count: 3,464 matches
 * Source: backend/football-open/data/matches/{competition_id}/{season_id}.json
 *
 * Verified: match_id is globally unique
 *
 * Nullable Fields (from verification):
 * - stadium_id: 10 matches (0.3%) don't have stadium
 * - referee_id: 200 matches (5.8%) don't have referee
 * - kick_off: Some historical matches don't have time
 * - match_week: Tournaments don't use weeks
 * - home_team_group/away_team_group: Only for tournament group stages
 * - last_updated_360: Only when 360 data exists
 * - data_version, shot_fidelity_version, xy_fidelity_version: Some older matches
 */
export const matches = pgTable(
  "matches",
  {
    // Primary key
    matchId: integer("match_id").primaryKey(),

    // Foreign keys to context
    competitionId: integer("competition_id")
      .notNull()
      .references(() => competitions.competitionId),
    seasonId: integer("season_id").notNull(),
    // Note: season_id is part of composite key in seasons table
    // Foreign key constraint handled in migration

    // Match timing
    matchDate: date("match_date").notNull(),
    kickOff: time("kick_off"), // Nullable: some historical matches

    // Teams and scores
    homeTeamId: integer("home_team_id")
      .notNull()
      .references(() => teams.teamId),
    awayTeamId: integer("away_team_id")
      .notNull()
      .references(() => teams.teamId),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),

    // Tournament groups (nullable - only for tournament matches)
    homeTeamGroup: varchar("home_team_group", { length: 20 }),
    awayTeamGroup: varchar("away_team_group", { length: 20 }),

    // Match context
    matchWeek: integer("match_week"), // Nullable: tournaments don't have weeks
    competitionStageId: integer("competition_stage_id").references(
      () => competitionStages.id
    ),

    // Officials and venue
    stadiumId: integer("stadium_id").references(() => stadiums.stadiumId), // 0.3% null
    refereeId: integer("referee_id").references(() => referees.refereeId), // 5.8% null

    // Match status
    matchStatus: varchar("match_status", { length: 20 })
      .notNull()
      .default("available"),
    matchStatus360: varchar("match_status_360", { length: 20 }),

    // Update timestamps
    lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull(),
    lastUpdated360: timestamp("last_updated_360", { withTimezone: true }),

    // Data quality metadata
    dataVersion: varchar("data_version", { length: 10 }),
    shotFidelityVersion: varchar("shot_fidelity_version", { length: 10 }),
    xyFidelityVersion: varchar("xy_fidelity_version", { length: 10 }),

    // Raw JSON Backup (Zero Data Loss Strategy)
    rawJson: jsonb("raw_json").notNull(),

    // Housekeeping
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    competitionIdx: index("idx_matches_competition").on(table.competitionId),
    seasonIdx: index("idx_matches_season").on(
      table.competitionId,
      table.seasonId
    ),
    dateIdx: index("idx_matches_date").on(table.matchDate),
    homeTeamIdx: index("idx_matches_home_team").on(table.homeTeamId),
    awayTeamIdx: index("idx_matches_away_team").on(table.awayTeamId),
    stadiumIdx: index("idx_matches_stadium").on(table.stadiumId),
    refereeIdx: index("idx_matches_referee").on(table.refereeId),
    stageIdx: index("idx_matches_stage").on(table.competitionStageId),
  })
);

// ============================================================================
// JUNCTION TABLE
// ============================================================================

/**
 * Match Managers Junction Table
 *
 * Purpose: Link managers to matches (many-to-many relationship)
 * Count: ~7,000 relationships (2 teams × ~1 manager per team × 3,464 matches)
 * Source: Extracted from match.home_team.managers and match.away_team.managers arrays
 *
 * Important: Managers is an ARRAY in JSON - a team can have multiple managers
 * (co-managers, interim, caretaker managers, etc.)
 *
 * Composite Primary Key: (match_id, manager_id, team_id)
 * - A manager can manage multiple teams over time
 * - A match has 2 teams, each with potentially multiple managers
 * - Need all three fields to uniquely identify a relationship
 */
export const matchManagers = pgTable(
  "match_managers",
  {
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.matchId, { onDelete: "cascade" }),
    managerId: integer("manager_id")
      .notNull()
      .references(() => managers.managerId),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.teamId),
    isHomeTeam: boolean("is_home_team").notNull(),
  },
  (table) => ({
    pk: pgPrimaryKey({
      columns: [table.matchId, table.managerId, table.teamId],
    }),
    matchIdx: index("idx_match_managers_match").on(table.matchId),
    managerIdx: index("idx_match_managers_manager").on(table.managerId),
    teamIdx: index("idx_match_managers_team").on(table.teamId),
  })
);

// ============================================================================
// RELATIONS (for Drizzle ORM queries)
// ============================================================================

export const teamsRelations = relations(teams, ({ one, many }) => ({
  country: one(countries, {
    fields: [teams.countryId],
    references: [countries.id],
  }),
  homeMatches: many(matches, { relationName: "homeTeam" }),
  awayMatches: many(matches, { relationName: "awayTeam" }),
  matchManagers: many(matchManagers),
}));

export const managersRelations = relations(managers, ({ one, many }) => ({
  country: one(countries, {
    fields: [managers.countryId],
    references: [countries.id],
  }),
  matchManagers: many(matchManagers),
}));

export const stadiumsRelations = relations(stadiums, ({ one, many }) => ({
  country: one(countries, {
    fields: [stadiums.countryId],
    references: [countries.id],
  }),
  matches: many(matches),
}));

export const refereesRelations = relations(referees, ({ one, many }) => ({
  country: one(countries, {
    fields: [referees.countryId],
    references: [countries.id],
  }),
  matches: many(matches),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  competition: one(competitions, {
    fields: [matches.competitionId],
    references: [competitions.competitionId],
  }),
  // Note: season relation requires composite key lookup
  homeTeam: one(teams, {
    fields: [matches.homeTeamId],
    references: [teams.teamId],
    relationName: "homeTeam",
  }),
  awayTeam: one(teams, {
    fields: [matches.awayTeamId],
    references: [teams.teamId],
    relationName: "awayTeam",
  }),
  stadium: one(stadiums, {
    fields: [matches.stadiumId],
    references: [stadiums.stadiumId],
  }),
  referee: one(referees, {
    fields: [matches.refereeId],
    references: [referees.refereeId],
  }),
  competitionStage: one(competitionStages, {
    fields: [matches.competitionStageId],
    references: [competitionStages.id],
  }),
  matchManagers: many(matchManagers),
}));

export const matchManagersRelations = relations(matchManagers, ({ one }) => ({
  match: one(matches, {
    fields: [matchManagers.matchId],
    references: [matches.matchId],
  }),
  manager: one(managers, {
    fields: [matchManagers.managerId],
    references: [managers.managerId],
  }),
  team: one(teams, {
    fields: [matchManagers.teamId],
    references: [teams.teamId],
  }),
}));

export const competitionStagesRelations = relations(
  competitionStages,
  ({ many }) => ({
    matches: many(matches),
  })
);
