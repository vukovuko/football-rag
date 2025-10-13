import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";
import { env } from "../../env.ts";
import { db } from "../db/index.ts";
import { countries, competitions, seasons } from "../db/index.ts";

/**
 * Load Competitions & Seasons
 *
 * Source: starting_over/01_COMPETITIONS_04_SUMMARY.md
 *
 * Loads data from: backend/football-open/data/competitions.json
 * Creates: ~15 countries, 21 competitions, 75 seasons
 */

// ============================================================================
// TYPES (from JSON structure)
// ============================================================================

interface CompetitionSeasonJSON {
  competition_id: number;
  season_id: number;
  competition_name: string;
  country_name: string;
  competition_gender: "male" | "female";
  competition_youth: boolean;
  competition_international: boolean;
  season_name: string;
  match_updated: string;
  match_available: string;
  match_updated_360: string | null;
  match_available_360: string | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCountryType(
  countryName: string
): "country" | "region" | "international" {
  const regions = [
    "Europe",
    "South America",
    "North and Central America",
    "Africa",
  ];
  if (regions.includes(countryName)) return "region";
  if (countryName === "International") return "international";
  return "country";
}

function parseDateSafely(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr);
  } catch (e) {
    console.warn(`Failed to parse date: ${dateStr}`);
    return null;
  }
}

// ============================================================================
// MAIN ETL FUNCTION
// ============================================================================

async function loadCompetitions() {
  console.log("🏁 Starting Competitions ETL...\n");

  // Step 1: Load raw JSON
  console.log("📂 Step 1: Loading competitions.json...");
  const dataPath = path.join(
    process.cwd(),
    env.DATA_PATH || "./football-open/data",
    "competitions.json"
  );
  const rawJson: CompetitionSeasonJSON[] = JSON.parse(
    fs.readFileSync(dataPath, "utf-8")
  );

  console.log(`   ✅ Loaded ${rawJson.length} competition-season pairs\n`);

  // Step 2: Query countries (should already be loaded by matches ETL)
  console.log("🗺️  Step 2: Looking up country IDs...");
  const countryMap = await db
    .select({ id: countries.id, name: countries.name })
    .from(countries);

  if (countryMap.length === 0) {
    throw new Error(
      "❌ No countries found! Please run 'npm run etl:matches' first to populate countries."
    );
  }

  // Map by name → auto-generated database ID
  const countryIdByName = new Map(countryMap.map((c) => [c.name, c.id]));
  console.log(`   ✅ Found ${countryIdByName.size} countries\n`);

  // Step 3: Extract & Load Competitions
  console.log("🏆 Step 3: Loading competitions...");
  const uniqueCompetitions = Array.from(
    new Map(rawJson.map((item) => [item.competition_id, item])).values()
  );

  // Find missing countries and insert them (regions like "Africa" not in matches data)
  const missingCountries: {
    name: string;
    type: "country" | "region" | "international";
  }[] = [];

  for (const comp of uniqueCompetitions) {
    if (!countryIdByName.has(comp.country_name)) {
      missingCountries.push({
        name: comp.country_name,
        type: getCountryType(comp.country_name),
      });
    }
  }

  if (missingCountries.length > 0) {
    console.log(
      `   ⚠️  Found ${missingCountries.length} regions not in matches data:`
    );
    missingCountries.forEach((c) =>
      console.log(`      - ${c.name} (${c.type})`)
    );

    // Insert missing regions with statsbombId = NULL
    // Database will auto-generate the id
    for (const country of missingCountries) {
      await db
        .insert(countries)
        .values({
          statsbombId: null, // Regions don't have StatsBomb IDs
          name: country.name,
          type: country.type,
        })
        .onConflictDoNothing();
    }

    // Re-query to get auto-generated IDs for new regions
    const updatedCountryMap = await db
      .select({ id: countries.id, name: countries.name })
      .from(countries);

    // Update the map with new regions
    updatedCountryMap.forEach((c) => countryIdByName.set(c.name, c.id));

    console.log(`   ✅ Inserted ${missingCountries.length} missing regions\n`);
  }

  for (const comp of uniqueCompetitions) {
    const countryId = countryIdByName.get(comp.country_name);

    await db
      .insert(competitions)
      .values({
        competitionId: comp.competition_id,
        competitionName: comp.competition_name,
        countryId: countryId!,
        competitionGender: comp.competition_gender,
        competitionYouth: comp.competition_youth,
        competitionInternational: comp.competition_international,
        // CRITICAL: Store complete original JSON (ZERO_DATA_LOSS_STRATEGY.md)
        rawJson: comp,
      })
      .onConflictDoNothing();
  }

  console.log(`   ✅ Inserted ${uniqueCompetitions.length} competitions\n`);

  // Step 4: Load Seasons
  console.log("📅 Step 4: Loading seasons...");

  for (const item of rawJson) {
    await db
      .insert(seasons)
      .values({
        seasonId: item.season_id,
        competitionId: item.competition_id,
        seasonName: item.season_name,
        matchUpdated: parseDateSafely(item.match_updated)!,
        matchAvailable: parseDateSafely(item.match_available)!,
        matchUpdated360: parseDateSafely(item.match_updated_360),
        matchAvailable360: parseDateSafely(item.match_available_360),
        // CRITICAL: Store complete original JSON (ZERO_DATA_LOSS_STRATEGY.md)
        rawJson: item,
      })
      .onConflictDoNothing();
  }

  console.log(`   ✅ Inserted ${rawJson.length} seasons\n`);

  // Step 5: Verification
  console.log("✅ Step 5: Verifying data...");
  const [countryResult, competitionResult, seasonResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(countries),
    db.select({ count: sql<number>`count(*)::int` }).from(competitions),
    db.select({ count: sql<number>`count(*)::int` }).from(seasons),
  ]);

  console.log(`   📊 Countries: ${countryResult[0].count}`);
  console.log(`   📊 Competitions: ${competitionResult[0].count}`);
  console.log(`   📊 Seasons: ${seasonResult[0].count}\n`);

  console.log("🎉 Competitions ETL Complete!\n");
}

// ============================================================================
// RUN
// ============================================================================

loadCompetitions()
  .catch((error) => {
    console.error("❌ ETL Failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
