import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.ts";
import { teams, matches } from "../db/schema/matches.ts";
import { countries, competitions, seasons } from "../db/schema/competitions.ts";
import { players, playerLineups } from "../db/schema/lineups.ts";
import { events } from "../db/schema/events.ts";
import { eq, asc, desc, count, ilike, and, sql, or } from "drizzle-orm";
import { validateQuery } from "../middleware/validation.ts";

const router = Router();

// Query validation schema
const teamsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(["teamName", "teamGender"]).default("teamName"),
  order: z.enum(["asc", "desc"]).default("asc"),
  gender: z.enum(["male", "female"]).optional(),
  search: z.string().optional(),
});

/**
 * GET /api/teams
 * List teams with pagination, sorting, and filtering
 */
router.get("/", validateQuery(teamsQuerySchema), async (req, res) => {
  try {
    // Parse and validate query with defaults
    const { limit, offset, sortBy, order, gender, search } =
      teamsQuerySchema.parse(req.query);

    // Map sortBy string to actual column
    const sortFieldMap = {
      teamName: teams.teamName,
      teamGender: teams.teamGender,
    };
    const sortField = sortFieldMap[sortBy];

    // Build filters array
    const filters = [];
    if (gender) {
      filters.push(eq(teams.teamGender, gender));
    }
    if (search && search.trim()) {
      filters.push(ilike(teams.teamName, `%${search.trim()}%`));
    }

    // Build query
    let baseQuery = db
      .select({
        teamId: teams.teamId,
        teamName: teams.teamName,
        teamGender: teams.teamGender,
        country: {
          id: countries.id,
          name: countries.name,
        },
      })
      .from(teams)
      .leftJoin(countries, eq(teams.countryId, countries.id))
      .$dynamic();

    // Apply filters if any
    if (filters.length > 0) {
      baseQuery = baseQuery.where(
        filters.length === 1 ? filters[0] : and(...filters)
      );
    }

    const queryWithSort =
      order === "asc"
        ? baseQuery.orderBy(asc(sortField))
        : baseQuery.orderBy(desc(sortField));

    const teamsList = await queryWithSort.limit(limit).offset(offset);

    // Get total count with filters
    let countBaseQuery = db.select({ value: count() }).from(teams).$dynamic();
    if (filters.length > 0) {
      countBaseQuery = countBaseQuery.where(
        filters.length === 1 ? filters[0] : and(...filters)
      );
    }
    const [{ value: total }] = await countBaseQuery;

    res.json({
      success: true,
      data: teamsList,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch teams",
    });
  }
});

/**
 * GET /api/teams/:id
 * Get individual team by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);

    if (isNaN(teamId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid team ID",
      });
    }

    const teamData = await db
      .select({
        teamId: teams.teamId,
        teamName: teams.teamName,
        teamGender: teams.teamGender,
        country: {
          id: countries.id,
          name: countries.name,
        },
      })
      .from(teams)
      .leftJoin(countries, eq(teams.countryId, countries.id))
      .where(eq(teams.teamId, teamId));

    if (!teamData.length) {
      return res.status(404).json({
        success: false,
        error: "Team not found",
      });
    }

    res.json({
      success: true,
      data: teamData[0],
    });
  } catch (error) {
    console.error("Error fetching team:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch team",
    });
  }
});

/**
 * GET /api/teams/:id/comprehensive
 * Get COMPREHENSIVE team stats - squad, matches, performance
 */
router.get("/:id/comprehensive", async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);

    if (isNaN(teamId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid team ID",
      });
    }

    // 1. Basic team info
    const teamData = await db
      .select({
        teamId: teams.teamId,
        teamName: teams.teamName,
        teamGender: teams.teamGender,
        country: {
          id: countries.id,
          name: countries.name,
        },
      })
      .from(teams)
      .leftJoin(countries, eq(teams.countryId, countries.id))
      .where(eq(teams.teamId, teamId));

    if (!teamData.length) {
      return res.status(404).json({
        success: false,
        error: "Team not found",
      });
    }

    const team = teamData[0];

    // 2. Match statistics (wins, losses, draws, goals)
    const matchStats = await db.execute(sql`
      SELECT
        COUNT(*)::int as total_matches,
        COUNT(*) FILTER (WHERE home_score > away_score AND home_team_id = ${teamId})::int +
        COUNT(*) FILTER (WHERE away_score > home_score AND away_team_id = ${teamId})::int as wins,
        COUNT(*) FILTER (WHERE home_score < away_score AND home_team_id = ${teamId})::int +
        COUNT(*) FILTER (WHERE away_score < home_score AND away_team_id = ${teamId})::int as losses,
        COUNT(*) FILTER (WHERE home_score = away_score)::int as draws,
        SUM(CASE WHEN home_team_id = ${teamId} THEN home_score ELSE 0 END)::int +
        SUM(CASE WHEN away_team_id = ${teamId} THEN away_score ELSE 0 END)::int as goals_scored,
        SUM(CASE WHEN home_team_id = ${teamId} THEN away_score ELSE 0 END)::int +
        SUM(CASE WHEN away_team_id = ${teamId} THEN home_score ELSE 0 END)::int as goals_conceded
      FROM matches
      WHERE home_team_id = ${teamId} OR away_team_id = ${teamId}
    `);

    // 3. Squad (top 10 players by appearances)
    const squad = await db
      .select({
        playerId: players.playerId,
        playerName: players.playerName,
        appearances: sql<number>`COUNT(DISTINCT ${playerLineups.matchId})::int`,
        goals: players.totalGoals,
        assists: players.totalAssists,
      })
      .from(playerLineups)
      .innerJoin(players, eq(playerLineups.playerId, players.playerId))
      .where(eq(playerLineups.teamId, teamId))
      .groupBy(
        players.playerId,
        players.playerName,
        players.totalGoals,
        players.totalAssists
      )
      .orderBy(sql`COUNT(DISTINCT ${playerLineups.matchId}) DESC`)
      .limit(10);

    // 4. Top scorers for the team (from events)
    const topScorers = await db.execute(sql`
      SELECT
        p.player_id,
        p.player_name,
        COUNT(*)::int as goals
      FROM events e
      INNER JOIN players p ON e.player_id = p.player_id
      WHERE e.team_id = ${teamId} AND e.type_id = 16
        AND EXISTS (
          SELECT 1 FROM shots s
          WHERE s.event_id = e.id AND s.outcome_id = 97
        )
      GROUP BY p.player_id, p.player_name
      ORDER BY goals DESC
      LIMIT 5
    `);

    // 5. Top assisters for the team (from events)
    const topAssisters = await db.execute(sql`
      SELECT
        p.player_id,
        p.player_name,
        COUNT(*)::int as assists
      FROM events e
      INNER JOIN players p ON e.player_id = p.player_id
      WHERE e.team_id = ${teamId} AND e.type_id = 30
        AND EXISTS (
          SELECT 1 FROM passes pa
          WHERE pa.event_id = e.id AND pa.goal_assist = true
        )
      GROUP BY p.player_id, p.player_name
      ORDER BY assists DESC
      LIMIT 5
    `);

    // 6. Competitions played in
    const competitionsPlayed = await db
      .select({
        competitionId: competitions.competitionId,
        competitionName: competitions.competitionName,
        seasons: sql<string>`STRING_AGG(DISTINCT ${seasons.seasonName}, ', ')`,
        matches: sql<number>`COUNT(DISTINCT ${matches.matchId})::int`,
      })
      .from(matches)
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
      .where(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)))
      .groupBy(competitions.competitionId, competitions.competitionName)
      .orderBy(sql`COUNT(DISTINCT ${matches.matchId}) DESC`);

    // 7. Disciplinary record (cards)
    const disciplinaryRecord = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE type_id = 33)::int as yellow_cards,
        COUNT(*) FILTER (WHERE type_id = 34)::int as red_cards
      FROM events
      WHERE team_id = ${teamId} AND type_id IN (33, 34)
    `);

    // 8. Performance stats (passing, shooting)
    const performanceStats = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE type_id = 30)::int as total_passes,
        COUNT(*) FILTER (WHERE type_id = 16)::int as total_shots,
        COUNT(*) FILTER (WHERE type_id = 14)::int as total_dribbles,
        COUNT(*) FILTER (WHERE type_id = 37)::int as total_pressures
      FROM events
      WHERE team_id = ${teamId}
    `);

    res.json({
      success: true,
      data: {
        team,
        matchStats: matchStats.rows[0],
        squad,
        topScorers: topScorers.rows,
        topAssisters: topAssisters.rows,
        competitionsPlayed,
        disciplinaryRecord: disciplinaryRecord.rows[0],
        performanceStats: performanceStats.rows[0],
      },
    });
  } catch (error) {
    console.error("Error fetching comprehensive team stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch comprehensive team stats",
    });
  }
});

export { router as teamsRouter };
