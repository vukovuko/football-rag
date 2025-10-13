import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.ts";
import { players } from "../db/schema/lineups.ts";
import { desc, asc, count } from "drizzle-orm";
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
});

/**
 * GET /api/players
 * List players with pagination and sorting
 */
router.get("/", validateQuery(playersQuerySchema), async (req, res) => {
  try {
    // Parse and validate query with defaults
    const { limit, offset, sortBy, order } = playersQuerySchema.parse(
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
    const baseQuery = db
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

    const queryWithSort =
      order === "asc"
        ? baseQuery.orderBy(asc(sortField))
        : baseQuery.orderBy(desc(sortField));

    const playersList = await queryWithSort.limit(limit).offset(offset);

    // Get total count
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(players);

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

export { router as playersRouter };
