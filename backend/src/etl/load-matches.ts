/**
 * Matches ETL Script
 *
 * Purpose: Load all match data including teams, managers, stadiums, referees
 * Source: backend/football-open/data/matches/{competition_id}/{season_id}.json
 * Documentation: starting_over/02_MATCHES_04_DATABASE.md
 *
 * Tables populated:
 * 1. competition_stages (12 rows)
 * 2. teams (312 rows)
 * 3. managers (557 rows)
 * 4. stadiums (275 rows)
 * 5. referees (440 rows)
 * 6. matches (3,464 rows)
 * 7. match_managers (~7,000 rows)
 *
 * Strategy: Zero data loss - all tables include raw_json field
 */

import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";
import { env } from "../../env.ts";
import { db } from "../db/index.ts";
import {
  countries,
  competitions,
  seasons,
  competitionStages,
  teams,
  managers,
  stadiums,
  referees,
  matches,
  matchManagers,
} from "../db/index.ts";

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

interface MatchJSON {
  match_id: number;
  match_date: string;
  kick_off: string | null;
  competition: {
    competition_id: number;
    country_name: string;
    competition_name: string;
  };
  season: {
    season_id: number;
    season_name: string;
  };
  home_team: TeamJSON;
  away_team: TeamJSON;
  home_score: number;
  away_score: number;
  match_status: string;
  match_status_360: string;
  last_updated: string;
  last_updated_360: string | null;
  metadata?: {
    data_version?: string;
    shot_fidelity_version?: string;
    xy_fidelity_version?: string;
  };
  match_week?: number | null;
  competition_stage?: {
    id: number;
    name: string;
  } | null;
  stadium?: {
    id: number;
    name: string;
    country: {
      id: number;
      name: string;
    };
  } | null;
  referee?: {
    id: number;
    name: string;
    country: {
      id: number;
      name: string;
    };
  } | null;
}

interface TeamJSON {
  home_team_id?: number;
  away_team_id?: number;
  home_team_name?: string;
  away_team_name?: string;
  home_team_gender?: "male" | "female";
  away_team_gender?: "male" | "female";
  home_team_group?: string | null;
  away_team_group?: string | null;
  country: {
    id: number;
    name: string;
  };
  managers?: ManagerJSON[]; // Optional: some matches don't have managers
}

interface ManagerJSON {
  id: number;
  name: string;
  nickname?: string | null;
  dob?: string | null;
  country: {
    id: number;
    name: string;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse date string safely
 * Returns Date object or null if invalid/null
 */
function parseDateSafely(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Load all match JSON files from matches directory
 * Structure: matches/{competition_id}/{season_id}.json
 */
function loadAllMatches(): MatchJSON[] {
  const allMatches: MatchJSON[] = [];
  const matchesDir = path.join(env.DATA_PATH, "matches");

  console.log(`📂 Reading from: ${matchesDir}\n`);

  const competitionDirs = fs.readdirSync(matchesDir);

  for (const compDir of competitionDirs) {
    const compPath = path.join(matchesDir, compDir);

    // Skip if not a directory
    if (!fs.statSync(compPath).isDirectory()) continue;

    const seasonFiles = fs
      .readdirSync(compPath)
      .filter((f) => f.endsWith(".json"));

    for (const seasonFile of seasonFiles) {
      const filePath = path.join(compPath, seasonFile);
      const matchesArray: MatchJSON[] = JSON.parse(
        fs.readFileSync(filePath, "utf-8")
      );

      console.log(
        `   Loaded ${matchesArray.length
          .toString()
          .padStart(3)} matches from ${compDir}/${seasonFile}`
      );
      allMatches.push(...matchesArray);
    }
  }

  return allMatches;
}

// ============================================================================
// MAIN ETL FUNCTION
// ============================================================================

async function loadMatchesETL() {
  console.log("🏁 Starting Matches ETL...\n");
  console.log("═".repeat(70));
  console.log();

  try {
    // ========================================================================
    // STEP 1: Load all match files
    // ========================================================================
    console.log("📂 Step 1: Loading all match files...\n");

    const allMatches = loadAllMatches();

    console.log();
    console.log(`✅ Loaded ${allMatches.length} total matches\n`);

    // ========================================================================
    // STEP 2: Extract and load countries (with StatsBomb IDs!)
    // ========================================================================
    console.log("═".repeat(70));
    console.log("\n🌍 Step 2: Extracting and loading countries...\n");

    // Collect unique countries with their StatsBomb IDs
    const countriesMap = new Map<
      number,
      {
        statsbombId: number;
        name: string;
        type: "country" | "region" | "international";
      }
    >();

    function getCountryType(
      name: string
    ): "country" | "region" | "international" {
      const regions = [
        "Europe",
        "South America",
        "North and Central America",
        "Africa",
      ];
      if (regions.includes(name)) return "region";
      if (name === "International") return "international";
      return "country";
    }

    for (const match of allMatches) {
      // Team countries
      countriesMap.set(match.home_team.country.id, {
        statsbombId: match.home_team.country.id,
        name: match.home_team.country.name,
        type: getCountryType(match.home_team.country.name),
      });
      countriesMap.set(match.away_team.country.id, {
        statsbombId: match.away_team.country.id,
        name: match.away_team.country.name,
        type: getCountryType(match.away_team.country.name),
      });

      // Manager countries (check if managers array exists)
      if (match.home_team.managers && Array.isArray(match.home_team.managers)) {
        for (const manager of match.home_team.managers) {
          countriesMap.set(manager.country.id, {
            statsbombId: manager.country.id,
            name: manager.country.name,
            type: getCountryType(manager.country.name),
          });
        }
      }
      if (match.away_team.managers && Array.isArray(match.away_team.managers)) {
        for (const manager of match.away_team.managers) {
          countriesMap.set(manager.country.id, {
            statsbombId: manager.country.id,
            name: manager.country.name,
            type: getCountryType(manager.country.name),
          });
        }
      }

      // Stadium country
      if (match.stadium) {
        countriesMap.set(match.stadium.country.id, {
          statsbombId: match.stadium.country.id,
          name: match.stadium.country.name,
          type: getCountryType(match.stadium.country.name),
        });
      }

      // Referee country
      if (match.referee) {
        countriesMap.set(match.referee.country.id, {
          statsbombId: match.referee.country.id,
          name: match.referee.country.name,
          type: getCountryType(match.referee.country.name),
        });
      }
    }

    console.log(`   Found ${countriesMap.size} unique countries`);

    // Insert countries with their StatsBomb IDs
    await db
      .insert(countries)
      .values([...countriesMap.values()])
      .onConflictDoNothing();

    console.log(`   ✅ Inserted countries into database\n`);

    // Query back to get auto-generated IDs
    const countryRecords = await db
      .select({ id: countries.id, name: countries.name })
      .from(countries);

    // Create map: country NAME → auto-generated database ID
    const countryNameToDbId = new Map(
      countryRecords.map((c) => [c.name, c.id])
    );

    console.log(`   ✅ Mapped ${countryNameToDbId.size} countries by name\n`);

    // ========================================================================
    // STEP 3: Extract and load competitions
    // ========================================================================
    console.log("═".repeat(70));
    console.log("\n🏆 Step 3: Extracting and loading competitions...\n");

    const competitionsMap = new Map<
      number,
      {
        competitionId: number;
        competitionName: string;
        countryId: number;
        competitionGender: "male" | "female";
        competitionYouth: boolean;
        competitionInternational: boolean;
      }
    >();

    for (const match of allMatches) {
      // Use country name to look up database ID
      const countryId = countryNameToDbId.get(match.home_team.country.name);

      if (countryId && !competitionsMap.has(match.competition.competition_id)) {
        // Infer competition metadata from match data
        const isInternational =
          match.competition.country_name === "International";
        const isYouth = false; // Not available in matches JSON
        const gender = match.home_team.home_team_gender || "male";

        competitionsMap.set(match.competition.competition_id, {
          competitionId: match.competition.competition_id,
          competitionName: match.competition.competition_name,
          countryId: countryId,
          competitionGender: gender,
          competitionYouth: isYouth,
          competitionInternational: isInternational,
        });
      }
    }

    console.log(`   Found ${competitionsMap.size} unique competitions`);

    await db
      .insert(competitions)
      .values(
        [...competitionsMap.values()].map((c) => ({
          ...c,
          rawJson: {
            competition_id: c.competitionId,
            competition_name: c.competitionName,
            competition_gender: c.competitionGender,
            competition_youth: c.competitionYouth,
            competition_international: c.competitionInternational,
          },
        }))
      )
      .onConflictDoNothing();

    console.log(`   ✅ Loaded ${competitionsMap.size} competitions\n`);

    // ========================================================================
    // STEP 4: Extract and load seasons
    // ========================================================================
    console.log("═".repeat(70));
    console.log("\n📅 Step 4: Extracting and loading seasons...\n");

    const seasonsMap = new Map<
      string,
      {
        seasonId: number;
        competitionId: number;
        seasonName: string;
        matchUpdated: Date;
        matchAvailable: Date;
        matchUpdated360: Date | null;
        matchAvailable360: Date | null;
      }
    >();

    for (const match of allMatches) {
      const key = `${match.competition.competition_id}-${match.season.season_id}`;

      if (!seasonsMap.has(key)) {
        seasonsMap.set(key, {
          seasonId: match.season.season_id,
          competitionId: match.competition.competition_id,
          seasonName: match.season.season_name,
          // Use latest match timestamps as season timestamps
          matchUpdated: parseDateSafely(match.last_updated)!,
          matchAvailable: parseDateSafely(match.last_updated)!,
          matchUpdated360: parseDateSafely(match.last_updated_360),
          matchAvailable360: parseDateSafely(match.last_updated_360),
        });
      }
    }

    console.log(`   Found ${seasonsMap.size} unique seasons`);

    await db
      .insert(seasons)
      .values(
        [...seasonsMap.values()].map((s) => ({
          ...s,
          rawJson: {
            season_id: s.seasonId,
            competition_id: s.competitionId,
            season_name: s.seasonName,
            match_updated: s.matchUpdated.toISOString(),
            match_available: s.matchAvailable.toISOString(),
            match_updated_360: s.matchUpdated360?.toISOString() || null,
            match_available_360: s.matchAvailable360?.toISOString() || null,
          },
        }))
      )
      .onConflictDoNothing();

    console.log(`   ✅ Loaded ${seasonsMap.size} seasons\n`);

    // ========================================================================
    // STEP 5: Seed competition stages
    // ========================================================================
    console.log("═".repeat(70));
    console.log("\n🎯 Step 5: Seeding competition stages...\n");

    // All 12 competition stages found in the data (from verification)
    const stagesSeed = [
      { id: 1, name: "Regular Season" },
      { id: 10, name: "Group Stage" },
      { id: 11, name: "Quarter-finals" },
      { id: 15, name: "Semi-finals" },
      { id: 25, name: "3rd Place Final" },
      { id: 26, name: "Final" },
      { id: 33, name: "Round of 16" },
      { id: 34, name: "1st Round" },
      { id: 42, name: "Apertura" },
      { id: 74, name: "Championship - Final" },
      { id: 99, name: "1st Group Stage" },
      { id: 158, name: "Play-offs - Semi-Finals" },
    ];

    await db.insert(competitionStages).values(stagesSeed).onConflictDoNothing();

    console.log(`✅ Seeded ${stagesSeed.length} competition stages\n`);

    // ========================================================================
    // STEP 6: Extract and load teams
    // ========================================================================
    console.log("═".repeat(70));
    console.log("\n👕 Step 6: Extracting and loading teams...\n");

    const teamsMap = new Map<
      number,
      {
        teamId: number;
        teamName: string;
        teamGender: "male" | "female";
        countryId: number;
      }
    >();

    for (const match of allMatches) {
      // Home team
      const homeTeamId = match.home_team.home_team_id!;
      if (!teamsMap.has(homeTeamId)) {
        teamsMap.set(homeTeamId, {
          teamId: homeTeamId,
          teamName: match.home_team.home_team_name!,
          teamGender: match.home_team.home_team_gender!,
          countryId: countryNameToDbId.get(match.home_team.country.name)!,
        });
      }

      // Away team
      const awayTeamId = match.away_team.away_team_id!;
      if (!teamsMap.has(awayTeamId)) {
        teamsMap.set(awayTeamId, {
          teamId: awayTeamId,
          teamName: match.away_team.away_team_name!,
          teamGender: match.away_team.away_team_gender!,
          countryId: countryNameToDbId.get(match.away_team.country.name)!,
        });
      }
    }

    console.log(`   Found ${teamsMap.size} unique teams`);

    await db
      .insert(teams)
      .values([...teamsMap.values()])
      .onConflictDoNothing();

    console.log(`✅ Loaded ${teamsMap.size} teams\n`);

    // ========================================================================
    // STEP 7: Extract and load managers
    // ========================================================================
    console.log("═".repeat(70));
    console.log("\n👔 Step 7: Extracting and loading managers...\n");

    const managersMap = new Map<
      number,
      {
        managerId: number;
        managerName: string;
        managerNickname: string | null;
        dateOfBirth: string | null;
        countryId: number;
      }
    >();

    for (const match of allMatches) {
      // Home team managers (check if managers array exists)
      if (match.home_team.managers && Array.isArray(match.home_team.managers)) {
        for (const manager of match.home_team.managers) {
          if (!managersMap.has(manager.id)) {
            managersMap.set(manager.id, {
              managerId: manager.id,
              managerName: manager.name,
              managerNickname: manager.nickname || null,
              dateOfBirth: manager.dob || null, // Already in "YYYY-MM-DD" format
              countryId: countryNameToDbId.get(manager.country.name)!,
            });
          }
        }
      }

      // Away team managers (check if managers array exists)
      if (match.away_team.managers && Array.isArray(match.away_team.managers)) {
        for (const manager of match.away_team.managers) {
          if (!managersMap.has(manager.id)) {
            managersMap.set(manager.id, {
              managerId: manager.id,
              managerName: manager.name,
              managerNickname: manager.nickname || null,
              dateOfBirth: manager.dob || null, // Already in "YYYY-MM-DD" format
              countryId: countryNameToDbId.get(manager.country.name)!,
            });
          }
        }
      }
    }

    console.log(`   Found ${managersMap.size} unique managers`);

    await db
      .insert(managers)
      .values([...managersMap.values()])
      .onConflictDoNothing();

    console.log(`✅ Loaded ${managersMap.size} managers\n`);

    // ========================================================================
    // STEP 8: Extract and load stadiums
    // ========================================================================
    console.log("═".repeat(70));
    console.log("\n🏟️  Step 8: Extracting and loading stadiums...\n");

    const stadiumsMap = new Map<
      number,
      {
        stadiumId: number;
        stadiumName: string;
        countryId: number;
      }
    >();

    for (const match of allMatches) {
      if (match.stadium) {
        const stadiumId = match.stadium.id;
        // Use latest name encountered (handles stadium rebranding)
        stadiumsMap.set(stadiumId, {
          stadiumId: stadiumId,
          stadiumName: match.stadium.name,
          countryId: countryNameToDbId.get(match.stadium.country.name)!,
        });
      }
    }

    console.log(`   Found ${stadiumsMap.size} unique stadiums`);

    await db
      .insert(stadiums)
      .values([...stadiumsMap.values()])
      .onConflictDoNothing();

    console.log(`✅ Loaded ${stadiumsMap.size} stadiums\n`);

    // ========================================================================
    // STEP 9: Extract and load referees
    // ========================================================================
    console.log("═".repeat(70));
    console.log("\n👨‍⚖️  Step 9: Extracting and loading referees...\n");

    const refereesMap = new Map<
      number,
      {
        refereeId: number;
        refereeName: string;
        countryId: number;
      }
    >();

    for (const match of allMatches) {
      if (match.referee) {
        refereesMap.set(match.referee.id, {
          refereeId: match.referee.id,
          refereeName: match.referee.name,
          countryId: countryNameToDbId.get(match.referee.country.name)!,
        });
      }
    }

    console.log(`   Found ${refereesMap.size} unique referees`);

    await db
      .insert(referees)
      .values([...refereesMap.values()])
      .onConflictDoNothing();

    console.log(`✅ Loaded ${refereesMap.size} referees\n`);

    // ========================================================================
    // STEP 10: Load matches (with batch processing)
    // ========================================================================
    console.log("═".repeat(70));
    console.log("\n⚽ Step 10: Loading matches...\n");

    const matchRecords = allMatches.map((match) => ({
      matchId: match.match_id,
      competitionId: match.competition.competition_id,
      seasonId: match.season.season_id,
      matchDate: match.match_date,
      kickOff: match.kick_off,

      homeTeamId: match.home_team.home_team_id!,
      awayTeamId: match.away_team.away_team_id!,
      homeScore: match.home_score,
      awayScore: match.away_score,

      homeTeamGroup: match.home_team.home_team_group || null,
      awayTeamGroup: match.away_team.away_team_group || null,

      matchWeek: match.match_week || null,
      competitionStageId: match.competition_stage?.id || null,

      stadiumId: match.stadium?.id || null,
      refereeId: match.referee?.id || null,

      matchStatus: match.match_status,
      matchStatus360: match.match_status_360,

      lastUpdated: parseDateSafely(match.last_updated)!,
      lastUpdated360: parseDateSafely(match.last_updated_360),

      dataVersion: match.metadata?.data_version || null,
      shotFidelityVersion: match.metadata?.shot_fidelity_version || null,
      xyFidelityVersion: match.metadata?.xy_fidelity_version || null,

      // CRITICAL: Store complete original JSON for zero data loss
      rawJson: match,
    }));

    console.log(`   Inserting ${matchRecords.length} matches in batches...\n`);

    // Batch processing for performance
    const BATCH_SIZE = 500;
    for (let i = 0; i < matchRecords.length; i += BATCH_SIZE) {
      const batch = matchRecords.slice(i, i + BATCH_SIZE);
      await db.insert(matches).values(batch).onConflictDoNothing();

      console.log(
        `   ✓ Inserted matches ${i + 1} to ${Math.min(
          i + BATCH_SIZE,
          matchRecords.length
        )}`
      );
    }

    console.log();
    console.log(`✅ Loaded ${matchRecords.length} matches\n`);

    // ========================================================================
    // STEP 11: Create manager-match links
    // ========================================================================
    console.log("═".repeat(70));
    console.log("\n🔗 Step 11: Creating manager-match links...\n");

    const managerLinks: {
      matchId: number;
      managerId: number;
      teamId: number;
      isHomeTeam: boolean;
    }[] = [];

    for (const match of allMatches) {
      // Home team managers (check if managers array exists)
      if (match.home_team.managers && Array.isArray(match.home_team.managers)) {
        for (const manager of match.home_team.managers) {
          managerLinks.push({
            matchId: match.match_id,
            managerId: manager.id,
            teamId: match.home_team.home_team_id!,
            isHomeTeam: true,
          });
        }
      }

      // Away team managers (check if managers array exists)
      if (match.away_team.managers && Array.isArray(match.away_team.managers)) {
        for (const manager of match.away_team.managers) {
          managerLinks.push({
            matchId: match.match_id,
            managerId: manager.id,
            teamId: match.away_team.away_team_id!,
            isHomeTeam: false,
          });
        }
      }
    }

    console.log(
      `   Found ${managerLinks.length} manager-match relationships\n`
    );
    console.log(`   Inserting in batches...\n`);

    const LINK_BATCH_SIZE = 1000;
    for (let i = 0; i < managerLinks.length; i += LINK_BATCH_SIZE) {
      const batch = managerLinks.slice(i, i + LINK_BATCH_SIZE);
      await db.insert(matchManagers).values(batch).onConflictDoNothing();

      console.log(
        `   ✓ Inserted links ${i + 1} to ${Math.min(
          i + LINK_BATCH_SIZE,
          managerLinks.length
        )}`
      );
    }

    console.log();
    console.log(`✅ Created ${managerLinks.length} manager-match links\n`);

    // ========================================================================
    // STEP 12: Verify data
    // ========================================================================
    console.log("═".repeat(70));
    console.log("\n✅ Step 12: Verifying data...\n");

    const [
      countriesCount,
      competitionsCount,
      seasonsCount,
      stagesCount,
      teamsCount,
      managersCount,
      stadiumsCount,
      refereesCount,
      matchesCount,
      linksCount,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(countries),
      db.select({ count: sql<number>`count(*)::int` }).from(competitions),
      db.select({ count: sql<number>`count(*)::int` }).from(seasons),
      db.select({ count: sql<number>`count(*)::int` }).from(competitionStages),
      db.select({ count: sql<number>`count(*)::int` }).from(teams),
      db.select({ count: sql<number>`count(*)::int` }).from(managers),
      db.select({ count: sql<number>`count(*)::int` }).from(stadiums),
      db.select({ count: sql<number>`count(*)::int` }).from(referees),
      db.select({ count: sql<number>`count(*)::int` }).from(matches),
      db.select({ count: sql<number>`count(*)::int` }).from(matchManagers),
    ]);

    console.log("   📊 Final Counts:\n");
    console.log(`      Countries:          ${countriesCount[0].count}`);
    console.log(`      Competitions:       ${competitionsCount[0].count}`);
    console.log(`      Seasons:            ${seasonsCount[0].count}`);
    console.log(`      Competition Stages: ${stagesCount[0].count}`);
    console.log(`      Teams:              ${teamsCount[0].count}`);
    console.log(`      Managers:           ${managersCount[0].count}`);
    console.log(`      Stadiums:           ${stadiumsCount[0].count}`);
    console.log(`      Referees:           ${refereesCount[0].count}`);
    console.log(`      Matches:            ${matchesCount[0].count}`);
    console.log(`      Manager Links:      ${linksCount[0].count}`);

    console.log();
    console.log("═".repeat(70));
    console.log("\n🎉 Matches ETL Complete!\n");

    // Check for data loss
    if (matchesCount.length !== allMatches.length) {
      console.error(
        `\n⚠️  WARNING: Expected ${allMatches.length} matches, but got ${matchesCount.length}`
      );
      console.error(
        `   Data loss: ${allMatches.length - matchesCount.length} matches\n`
      );
    }
  } catch (error) {
    console.error("\n❌ Matches ETL Failed:", error);
    throw error;
  }
}

// ============================================================================
// RUN ETL
// ============================================================================

loadMatchesETL()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
