import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.ts";
import {
  players,
  playerLineups,
  playerPositions,
  playerCards,
  positions,
} from "../db/schema/lineups.ts";
import { matches, teams } from "../db/schema/matches.ts";
import { competitions, seasons } from "../db/schema/competitions.ts";
import { events } from "../db/schema/events.ts";
import { desc, asc, count, eq, ilike, sql, and } from "drizzle-orm";
import { validateQuery } from "../middleware/validation.ts";

const router = Router();

// Query validation schema
const playersQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z
    .enum(["totalGoals", "totalAssists", "totalMatches", "playerName"])
    .default("totalMatches"),
  order: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
});

/**
 * GET /api/players
 * List players with pagination and sorting
 */
router.get("/", validateQuery(playersQuerySchema), async (req, res) => {
  try {
    // Parse and validate query with defaults
    const { limit, offset, sortBy, order, search } = playersQuerySchema.parse(
      req.query
    );

    // Map sortBy string to actual column
    const sortFieldMap = {
      totalGoals: players.totalGoals,
      totalAssists: players.totalAssists,
      totalMatches: players.totalMatches,
      playerName: players.playerName,
    };
    const sortField = sortFieldMap[sortBy];

    // Build query
    let baseQuery = db
      .select({
        playerId: players.playerId,
        playerName: players.playerName,
        playerNickname: players.playerNickname,
        totalMatches: players.totalMatches,
        totalGoals: players.totalGoals,
        totalAssists: players.totalAssists,
      })
      .from(players)
      .$dynamic();

    // Apply search filter if provided
    if (search && search.trim()) {
      baseQuery = baseQuery.where(
        ilike(players.playerName, `%${search.trim()}%`)
      );
    }

    const queryWithSort =
      order === "asc"
        ? baseQuery.orderBy(asc(sortField))
        : baseQuery.orderBy(desc(sortField));

    const playersList = await queryWithSort.limit(limit).offset(offset);

    // Get total count with search filter
    let countQuery = db.select({ value: count() }).from(players).$dynamic();
    if (search && search.trim()) {
      countQuery = countQuery.where(
        ilike(players.playerName, `%${search.trim()}%`)
      );
    }
    const [{ value: total }] = await countQuery;

    res.json({
      success: true,
      data: playersList,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch players",
    });
  }
});

/**
 * GET /api/players/:id
 * Get individual player by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);

    if (isNaN(playerId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid player ID",
      });
    }

    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.playerId, playerId));

    if (!player) {
      return res.status(404).json({
        success: false,
        error: "Player not found",
      });
    }

    res.json({
      success: true,
      data: player,
    });
  } catch (error) {
    console.error("Error fetching player:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch player",
    });
  }
});

/**
 * GET /api/players/:id/comprehensive
 * Get COMPREHENSIVE player stats - EVERYTHING from all tables
 */
router.get("/:id/comprehensive", async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);

    if (isNaN(playerId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid player ID",
      });
    }

    // 1. Basic player info
    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.playerId, playerId));

    if (!player) {
      return res.status(404).json({
        success: false,
        error: "Player not found",
      });
    }

    // 2. Positions played (with names)
    const positionsPlayed = await db
      .select({
        positionId: positions.id,
        positionName: positions.positionName,
        positionCategory: positions.positionCategory,
        timesPlayed: sql<number>`COUNT(DISTINCT ${playerPositions.matchId})::int`,
      })
      .from(playerPositions)
      .innerJoin(positions, eq(playerPositions.positionId, positions.id))
      .where(eq(playerPositions.playerId, playerId))
      .groupBy(positions.id, positions.positionName, positions.positionCategory)
      .orderBy(sql`COUNT(DISTINCT ${playerPositions.matchId}) DESC`);

    // 3. Teams played for
    const teamsPlayedFor = await db
      .select({
        teamId: teams.teamId,
        teamName: teams.teamName,
        teamGender: teams.teamGender,
        matches: sql<number>`COUNT(DISTINCT ${playerLineups.matchId})::int`,
      })
      .from(playerLineups)
      .innerJoin(teams, eq(playerLineups.teamId, teams.teamId))
      .where(eq(playerLineups.playerId, playerId))
      .groupBy(teams.teamId, teams.teamName, teams.teamGender)
      .orderBy(sql`COUNT(DISTINCT ${playerLineups.matchId}) DESC`);

    // 5. Event statistics from events table (with proper joins to subtables)
    const passStats = await db.execute(sql`
      SELECT
        COUNT(*)::int as total_passes,
        COUNT(*) FILTER (WHERE p.outcome_id IS NULL)::int as successful_passes,
        COUNT(*) FILTER (WHERE p.outcome_id IS NOT NULL)::int as failed_passes,
        ROUND(AVG(CASE WHEN p.outcome_id IS NULL THEN 100.0 ELSE 0.0 END), 2) as pass_accuracy,
        COUNT(*) FILTER (WHERE p.goal_assist = true)::int as key_passes
      FROM events e
      LEFT JOIN passes p ON e.id = p.event_id
      WHERE e.player_id = ${playerId} AND e.type_id = 30
    `);

    const shotStats = await db.execute(sql`
      SELECT
        COUNT(*)::int as total_shots,
        COUNT(*) FILTER (WHERE s.outcome_id = 97)::int as goals,
        COUNT(*) FILTER (WHERE s.outcome_id IN (96, 97, 115, 116))::int as shots_on_target,
        ROUND(
          COUNT(*) FILTER (WHERE s.outcome_id IN (96, 97, 115, 116))::decimal * 100.0 / 
          NULLIF(COUNT(*), 0), 2
        ) as shot_accuracy,
        ROUND(AVG(s.shot_xg), 3) as avg_xg
      FROM events e
      LEFT JOIN shots s ON e.id = s.event_id
      WHERE e.player_id = ${playerId} AND e.type_id = 16
    `);

    const dribbleStats = await db.execute(sql`
      SELECT
        COUNT(*)::int as total_dribbles,
        COUNT(*) FILTER (WHERE d.outcome_id = 8)::int as successful_dribbles,
        COUNT(*) FILTER (WHERE d.outcome_id = 9)::int as failed_dribbles,
        ROUND(
          COUNT(*) FILTER (WHERE d.outcome_id = 8)::decimal * 100.0 / 
          NULLIF(COUNT(*), 0), 2
        ) as dribble_success_rate
      FROM events e
      LEFT JOIN dribbles d ON e.id = d.event_id
      WHERE e.player_id = ${playerId} AND e.type_id = 14
    `);

    const duelStats = await db.execute(sql`
      SELECT
        COUNT(*)::int as total_duels,
        COUNT(*) FILTER (WHERE du.outcome_id IN (13, 14, 15))::int as duels_won,
        COUNT(*) FILTER (WHERE du.outcome_id IN (3, 4))::int as duels_lost,
        ROUND(
          COUNT(*) FILTER (WHERE du.outcome_id IN (13, 14, 15))::decimal * 100.0 / 
          NULLIF(COUNT(*), 0), 2
        ) as duel_win_rate
      FROM events e
      LEFT JOIN duels du ON e.id = du.event_id
      WHERE e.player_id = ${playerId} AND e.type_id = 4
    `);

    const defensiveStats = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE type_id = 10)::int as interceptions,
        COUNT(*) FILTER (WHERE type_id = 6)::int as blocks,
        COUNT(*) FILTER (WHERE type_id = 12)::int as clearances,
        COUNT(*) FILTER (WHERE type_id = 3)::int as dispossessions,
        COUNT(*) FILTER (WHERE type_id = 22)::int as fouls_committed,
        COUNT(*) FILTER (WHERE type_id = 21)::int as fouls_won,
        COUNT(*) FILTER (WHERE type_id = 37)::int as pressure_events
      FROM events
      WHERE player_id = ${playerId}
    `);

    const goalkeeperStats = await db.execute(sql`
      SELECT
        COUNT(*)::int as goalkeeper_actions,
        COUNT(*) FILTER (WHERE gk.outcome_id IN (2, 3, 4))::int as saves,
        COUNT(*) FILTER (WHERE gk.outcome_id IN (11, 12, 13, 14, 15, 16))::int as goals_conceded
      FROM events e
      LEFT JOIN goalkeeper_events gk ON e.id = gk.event_id
      WHERE e.player_id = ${playerId} AND e.type_id = 23
    `);

    // 6. Competitions played in
    const competitionsPlayed = await db
      .select({
        competitionId: competitions.competitionId,
        competitionName: competitions.competitionName,
        seasons: sql<string>`STRING_AGG(DISTINCT ${seasons.seasonName}, ', ')`,
        matches: sql<number>`COUNT(DISTINCT ${playerLineups.matchId})::int`,
      })
      .from(playerLineups)
      .innerJoin(matches, eq(playerLineups.matchId, matches.matchId))
      .innerJoin(
        competitions,
        eq(matches.competitionId, competitions.competitionId)
      )
      .innerJoin(
        seasons,
        and(
          eq(matches.competitionId, seasons.competitionId),
          eq(matches.seasonId, seasons.seasonId)
        )
      )
      .where(eq(playerLineups.playerId, playerId))
      .groupBy(competitions.competitionId, competitions.competitionName)
      .orderBy(sql`COUNT(DISTINCT ${playerLineups.matchId}) DESC`);

    res.json({
      success: true,
      data: {
        player,
        positionsPlayed,
        teamsPlayedFor,
        competitionsPlayed,
        stats: {
          passing: passStats.rows[0],
          shooting: shotStats.rows[0],
          dribbling: dribbleStats.rows[0],
          duels: duelStats.rows[0],
          defensive: defensiveStats.rows[0],
          goalkeeper: goalkeeperStats.rows[0],
        },
      },
    });
  } catch (error) {
    console.error("Error fetching comprehensive player stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch comprehensive player stats",
    });
  }
});

export { router as playersRouter };
