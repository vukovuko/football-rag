import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.ts";
import { players } from "../db/schema/lineups.ts";
import { desc, asc, count, eq, ilike } from "drizzle-orm";
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

export { router as playersRouter };
