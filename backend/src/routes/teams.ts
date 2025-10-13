import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.ts";
import { teams } from "../db/schema/matches.ts";
import { countries } from "../db/schema/competitions.ts";
import { eq, asc, desc, count } from "drizzle-orm";
import { validateQuery } from "../middleware/validation.ts";

const router = Router();

// Query validation schema
const teamsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(["teamName", "teamGender"]).default("teamName"),
  order: z.enum(["asc", "desc"]).default("asc"),
  gender: z.enum(["male", "female"]).optional(),
});

/**
 * GET /api/teams
 * List teams with pagination, sorting, and filtering
 */
router.get("/", validateQuery(teamsQuerySchema), async (req, res) => {
  try {
    // Parse and validate query with defaults
    const { limit, offset, sortBy, order, gender } = teamsQuerySchema.parse(
      req.query
    );

    // Map sortBy string to actual column
    const sortFieldMap = {
      teamName: teams.teamName,
      teamGender: teams.teamGender,
    };
    const sortField = sortFieldMap[sortBy];

    // Build query
    const baseQuery = db
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

    // Build filters
    const queryWithFilter = gender
      ? baseQuery.where(eq(teams.teamGender, gender))
      : baseQuery;

    const queryWithSort =
      order === "asc"
        ? queryWithFilter.orderBy(asc(sortField))
        : queryWithFilter.orderBy(desc(sortField));

    const teamsList = await queryWithSort.limit(limit).offset(offset);

    // Get total count
    const countBaseQuery = db.select({ value: count() }).from(teams).$dynamic();
    const [{ value: total }] = gender
      ? await countBaseQuery.where(eq(teams.teamGender, gender))
      : await countBaseQuery;

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

export { router as teamsRouter };
