/**
 * Database Schema & Connection
 *
 * Central export point for all database tables and connection.
 *
 * Usage:
 *   import { db, competitions, seasons } from './db/index.ts';
 */

// Connection
export { db } from "./connection.ts";

// Competitions Schema
export { countries, competitions, seasons } from "./schema/competitions.ts";

// Matches Schema
export {
  competitionStages,
  teams,
  managers,
  stadiums,
  referees,
  matches,
  matchManagers,
} from "./schema/matches.ts";

// Lineups Schema
export {
  players,
  positions,
  playerLineups,
  playerPositions,
  playerCards,
  cardTypeEnum,
  positionCategoryEnum,
} from "./schema/lineups.ts";

// 360 Frames Schema
export { threeSixtyFrames, threeSixtyPlayers } from "./schema/threeSixty.ts";

// Events Schema - Lookup Tables
export {
  eventTypes,
  playPatterns,
  bodyParts,
  passHeights,
  passTypes,
  passTechniques,
  passOutcomes,
  shotOutcomes,
  shotTypes,
  shotTechniques,
  duelTypes,
  duelOutcomes,
  goalkeeperPositions,
  goalkeeperTechniques,
  goalkeeperTypes,
  goalkeeperOutcomes,
  dribbleOutcomes,
  interceptionOutcomes,
  ballReceiptOutcomes,
  fiftyFiftyOutcomes,
} from "./schema/events.ts";

// Events Schema - Core Tables
export {
  events,
  eventRelationships,
  passes,
  shots,
  carries,
  dribbles,
  pressures,
  duels,
  blocks,
  interceptions,
  clearances,
  ballReceipts,
  ballRecoveries,
  fiftyFifties,
  fouls,
  badBehaviours,
  goalkeeperEvents,
} from "./schema/events.ts";
