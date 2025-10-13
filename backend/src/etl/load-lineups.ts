import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";
import { env } from "../../env.ts";
import { db } from "../db/index.ts";
import {
  players,
  playerLineups,
  playerPositions,
  playerCards,
  countries,
} from "../db/index.ts";

/**
 * LINEUPS ETL
 *
 * Strategy:
 * 1. Load all lineup files
 * 2. Extract match_id from FILENAME (not in JSON!)
 * 3. Load players dimension table
 * 4. Load player_lineups fact table
 * 5. Load player_positions fact table
 * 6. Load player_cards fact table
 * 7. Verify data
 *
 * CRITICAL: match_id is extracted from filename!
 * Example: "15946.json" → match_id = 15946
 *
 * Source: starting_over/04_LINEUPS_03_DATABASE.md
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LineupJSON {
  team_id: number;
  team_name: string;
  lineup: PlayerJSON[];
}

interface PlayerJSON {
  player_id: number;
  player_name: string;
  player_nickname: string | null;
  jersey_number: number;
  country: {
    id: number;
    name: string;
  };
  cards: CardJSON[];
  positions: PositionJSON[];
}

interface CardJSON {
  time: string; // "MM:SS"
  card_type: string;
  reason: string;
  period: number;
}

interface PositionJSON {
  position_id: number;
  position: string;
  from: string; // "MM:SS"
  to: string | null; // "MM:SS" or null
  from_period: number;
  to_period: number | null;
  start_reason: string;
  end_reason: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert time string "MM:SS" to PostgreSQL INTERVAL
 */
function timeStringToInterval(time: string): string {
  const [minutes, seconds] = time.split(":").map(Number);
  return `${minutes} minutes ${seconds} seconds`;
}

/**
 * Calculate total minutes played from positions array
 */
function calculateMinutesPlayed(positions: PositionJSON[]): number {
  let totalMinutes = 0;

  for (const pos of positions) {
    const [fromMin, fromSec] = pos.from.split(":").map(Number);
    const fromMinutes = fromMin + fromSec / 60;

    let toMinutes = 90; // Default to 90 if null
    if (pos.to) {
      const [toMin, toSec] = pos.to.split(":").map(Number);
      toMinutes = toMin + toSec / 60;
    }

    totalMinutes += toMinutes - fromMinutes;
  }

  return Math.round(totalMinutes * 100) / 100; // Round to 2 decimals
}

/**
 * Load all lineup files with match_id extracted from filename
 */
function loadAllLineups(): Map<
  number,
  { matchId: number; teams: LineupJSON[] }
> {
  const lineupsDir = path.join(
    process.cwd(),
    env.DATA_PATH || "./football-open/data",
    "lineups"
  );

  console.log("🔍 [LINEUPS DEBUG] process.cwd():", process.cwd());
  console.log("🔍 [LINEUPS DEBUG] env.DATA_PATH:", env.DATA_PATH);
  console.log("🔍 [LINEUPS DEBUG] Final lineupsDir:", lineupsDir);
  console.log(`📂 Reading from: ${path.relative(process.cwd(), lineupsDir)}\n`);

  const files = fs.readdirSync(lineupsDir).filter((f) => f.endsWith(".json"));

  const lineupsMap = new Map<
    number,
    { matchId: number; teams: LineupJSON[] }
  >();

  for (const file of files) {
    // ⚠️ CRITICAL: Extract match_id from filename!
    const matchId = parseInt(path.basename(file, ".json"));

    const filePath = path.join(lineupsDir, file);
    const teams: LineupJSON[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    lineupsMap.set(matchId, { matchId, teams });
  }

  return lineupsMap;
}

// ============================================================================
// MAIN ETL FUNCTION
// ============================================================================

async function loadLineupsETL() {
  console.log("🏁 Starting Lineups ETL...\n");

  // ========================================================================
  // STEP 1: Load all lineup files
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n📂 Step 1: Loading all lineup files...\n");

  const lineupsMap = loadAllLineups();

  console.log(`✅ Loaded ${lineupsMap.size} matches with lineups\n`);

  // ========================================================================
  // STEP 2: Extract and load players
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n👤 Step 2: Extracting and loading players...\n");

  // Map: player_id → { name, nickname }
  // Use latest name/nickname if player appears in multiple matches
  const playersMap = new Map<
    number,
    { playerId: number; playerName: string; playerNickname: string | null }
  >();

  for (const { teams } of lineupsMap.values()) {
    for (const team of teams) {
      for (const player of team.lineup) {
        playersMap.set(player.player_id, {
          playerId: player.player_id,
          playerName: player.player_name,
          playerNickname: player.player_nickname,
        });
      }
    }
  }

  console.log(`   Found ${playersMap.size} unique players`);

  // Batch insert players
  const BATCH_SIZE = 1000;
  const playersArray = Array.from(playersMap.values());

  for (let i = 0; i < playersArray.length; i += BATCH_SIZE) {
    const batch = playersArray.slice(i, i + BATCH_SIZE);
    await db.insert(players).values(batch).onConflictDoNothing();

    console.log(
      `   ✓ Inserted players ${i + 1} to ${Math.min(
        i + BATCH_SIZE,
        playersArray.length
      )}`
    );
  }

  console.log();
  console.log(`✅ Loaded ${playersArray.length} players\n`);

  // ========================================================================
  // STEP 3: Ensure all countries exist
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n🌍 Step 3: Ensuring all countries exist...\n");

  // Get existing countries
  const existingCountryRecords = await db
    .select({ id: countries.id, name: countries.name })
    .from(countries);

  const countryNameToId = new Map(
    existingCountryRecords.map((c) => [c.name, c.id])
  );

  // Find missing countries from lineups
  const allCountryNamesInLineups = new Set<string>();
  for (const { teams } of lineupsMap.values()) {
    for (const team of teams) {
      for (const player of team.lineup) {
        if (player.country?.name) {
          allCountryNamesInLineups.add(player.country.name);
        }
      }
    }
  }

  const missingCountries: {
    statsbombId: null;
    name: string;
    type: "country" | "region" | "international";
  }[] = [];

  for (const countryName of allCountryNamesInLineups) {
    if (!countryNameToId.has(countryName)) {
      missingCountries.push({
        statsbombId: null, // Lineups don't provide country IDs for all countries
        name: countryName,
        type: "country", // Assume all are countries
      });
    }
  }

  if (missingCountries.length > 0) {
    console.log(
      `   ⚠️  Found ${missingCountries.length} countries not in database:`
    );
    missingCountries
      .slice(0, 10)
      .forEach((c) => console.log(`      - ${c.name}`));
    if (missingCountries.length > 10) {
      console.log(`      ... and ${missingCountries.length - 10} more`);
    }

    // Insert missing countries
    await db.insert(countries).values(missingCountries).onConflictDoNothing();

    // Re-fetch countries to get new IDs
    const updatedCountryRecords = await db
      .select({ id: countries.id, name: countries.name })
      .from(countries);

    countryNameToId.clear();
    updatedCountryRecords.forEach((c) => countryNameToId.set(c.name, c.id));

    console.log(`   ✅ Inserted ${missingCountries.length} missing countries`);
  }

  console.log(`   ✅ Total countries available: ${countryNameToId.size}\n`);

  // ========================================================================
  // STEP 4: Load player_lineups
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n📋 Step 4: Loading player lineups...\n");

  const playerLineupsArray: any[] = [];

  for (const { matchId, teams } of lineupsMap.values()) {
    for (const team of teams) {
      for (const player of team.lineup) {
        // Skip players without country data
        if (!player.country?.name) {
          console.warn(
            `   ⚠️  Player ${player.player_id} has no country data, skipping`
          );
          continue;
        }

        const countryId = countryNameToId.get(player.country.name)!; // Safe now - all countries inserted

        const isStarter =
          player.positions[0]?.start_reason === "Starting XI" || false;
        const minutesPlayed = calculateMinutesPlayed(player.positions);

        playerLineupsArray.push({
          matchId,
          teamId: team.team_id,
          playerId: player.player_id,
          jerseyNumber: player.jersey_number,
          countryId,
          isStarter,
          minutesPlayed,
          rawJson: player, // Zero data loss!
        });
      }
    }
  }

  console.log(
    `   Inserting ${playerLineupsArray.length} player lineup records...\n`
  );

  for (let i = 0; i < playerLineupsArray.length; i += BATCH_SIZE) {
    const batch = playerLineupsArray.slice(i, i + BATCH_SIZE);
    await db.insert(playerLineups).values(batch).onConflictDoNothing();

    console.log(
      `   ✓ Inserted records ${i + 1} to ${Math.min(
        i + BATCH_SIZE,
        playerLineupsArray.length
      )}`
    );
  }

  console.log();
  console.log(`✅ Loaded ${playerLineupsArray.length} player lineups\n`);

  // ========================================================================
  // STEP 5: Load player_positions
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n🎯 Step 5: Loading player positions...\n");

  const playerPositionsArray: any[] = [];

  for (const { matchId, teams } of lineupsMap.values()) {
    for (const team of teams) {
      for (const player of team.lineup) {
        for (const pos of player.positions) {
          playerPositionsArray.push({
            matchId,
            playerId: player.player_id,
            positionId: pos.position_id,
            fromTime: timeStringToInterval(pos.from),
            toTime: pos.to ? timeStringToInterval(pos.to) : null,
            fromPeriod: pos.from_period,
            toPeriod: pos.to_period,
            startReason: pos.start_reason,
            endReason: pos.end_reason,
          });
        }
      }
    }
  }

  console.log(
    `   Inserting ${playerPositionsArray.length} position records...\n`
  );

  for (let i = 0; i < playerPositionsArray.length; i += BATCH_SIZE) {
    const batch = playerPositionsArray.slice(i, i + BATCH_SIZE);
    await db.insert(playerPositions).values(batch).onConflictDoNothing();

    console.log(
      `   ✓ Inserted records ${i + 1} to ${Math.min(
        i + BATCH_SIZE,
        playerPositionsArray.length
      )}`
    );
  }

  console.log();
  console.log(`✅ Loaded ${playerPositionsArray.length} player positions\n`);

  // ========================================================================
  // STEP 6: Load player_cards
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n🟨 Step 6: Loading player cards...\n");

  const playerCardsArray: any[] = [];

  for (const { matchId, teams } of lineupsMap.values()) {
    for (const team of teams) {
      for (const player of team.lineup) {
        for (const card of player.cards) {
          playerCardsArray.push({
            matchId,
            playerId: player.player_id,
            time: timeStringToInterval(card.time),
            cardType: card.card_type,
            reason: card.reason,
            period: card.period,
          });
        }
      }
    }
  }

  console.log(`   Inserting ${playerCardsArray.length} card records...\n`);

  if (playerCardsArray.length > 0) {
    for (let i = 0; i < playerCardsArray.length; i += BATCH_SIZE) {
      const batch = playerCardsArray.slice(i, i + BATCH_SIZE);
      await db.insert(playerCards).values(batch).onConflictDoNothing();

      console.log(
        `   ✓ Inserted records ${i + 1} to ${Math.min(
          i + BATCH_SIZE,
          playerCardsArray.length
        )}`
      );
    }
  } else {
    console.log("   ℹ️  No cards to insert");
  }

  console.log();
  console.log(`✅ Loaded ${playerCardsArray.length} player cards\n`);

  // ========================================================================
  // STEP 7: Verify data
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n✅ Step 7: Verifying data...\n");

  const [
    playersCount,
    playerLineupsCount,
    playerPositionsCount,
    playerCardsCount,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(players),
    db.select({ count: sql<number>`count(*)::int` }).from(playerLineups),
    db.select({ count: sql<number>`count(*)::int` }).from(playerPositions),
    db.select({ count: sql<number>`count(*)::int` }).from(playerCards),
  ]);

  console.log("   📊 Final Counts:\n");
  console.log(`      Players:          ${playersCount[0].count}`);
  console.log(`      Player Lineups:   ${playerLineupsCount[0].count}`);
  console.log(`      Player Positions: ${playerPositionsCount[0].count}`);
  console.log(`      Player Cards:     ${playerCardsCount[0].count}`);

  console.log();
  console.log("═".repeat(70));
  console.log("\n🎉 Lineups ETL Complete!\n");

  // Check for data loss
  if (playerLineupsCount.length !== playerLineupsArray.length) {
    console.error(
      `\n⚠️  WARNING: Expected ${playerLineupsArray.length} player lineups, but got ${playerLineupsCount.length}`
    );
  }
}

// ============================================================================
// RUN ETL
// ============================================================================

loadLineupsETL()
  .then(() => {
    console.log("✅ ETL completed successfully\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ ETL failed:", error);
    process.exit(1);
  });
