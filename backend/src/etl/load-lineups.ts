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
 * Load a batch of lineup files
 * Returns map of match_id → lineup data
 */
function loadLineupBatch(
  lineupsDir: string,
  files: string[]
): Map<number, { matchId: number; teams: LineupJSON[] }> {
  const batchMap = new Map<number, { matchId: number; teams: LineupJSON[] }>();

  for (const file of files) {
    const matchId = parseInt(path.basename(file, ".json"));

    if (isNaN(matchId) || matchId <= 0) {
      continue;
    }

    try {
      const filePath = path.join(lineupsDir, file);
      const teams: LineupJSON[] = JSON.parse(
        fs.readFileSync(filePath, "utf-8")
      );

      batchMap.set(matchId, { matchId, teams });
    } catch (err) {
      // Skip corrupt files silently
      continue;
    }
  }

  return batchMap;
}

// ============================================================================
// MAIN ETL FUNCTION
// ============================================================================

async function loadLineupsETL() {
  console.log("🏁 Starting Lineups ETL...\n");

  // ========================================================================
  // STEP 1: Scan lineup files for unique players/countries
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n📂 Step 1: Scanning lineup files...\n");

  const lineupsDir = path.join(
    process.cwd(),
    env.DATA_PATH || "./football-open/data",
    "lineups"
  );

  console.log(`📂 Reading from: ${path.relative(process.cwd(), lineupsDir)}\n`);

  const allFiles = fs
    .readdirSync(lineupsDir)
    .filter((f) => f.endsWith(".json"));

  console.log(`   Found ${allFiles.length} lineup files\n`);

  const FILE_BATCH_SIZE = 100; // Process 100 files at a time
  const playersMap = new Map<
    number,
    { playerId: number; playerName: string; playerNickname: string | null }
  >();
  const allCountryNames = new Set<string>();

  // First pass: extract unique players and countries (lightweight)
  console.log("   Extracting unique players and countries...\n");

  for (let i = 0; i < allFiles.length; i += FILE_BATCH_SIZE) {
    const fileBatch = allFiles.slice(i, i + FILE_BATCH_SIZE);
    const batchMap = loadLineupBatch(lineupsDir, fileBatch);

    for (const { teams } of batchMap.values()) {
      for (const team of teams) {
        for (const player of team.lineup) {
          playersMap.set(player.player_id, {
            playerId: player.player_id,
            playerName: player.player_name,
            playerNickname: player.player_nickname,
          });

          if (player.country?.name) {
            allCountryNames.add(player.country.name);
          }
        }
      }
    }

    if (
      (i + FILE_BATCH_SIZE) % 500 === 0 ||
      i + FILE_BATCH_SIZE >= allFiles.length
    ) {
      console.log(
        `   ✓ Scanned ${Math.min(i + FILE_BATCH_SIZE, allFiles.length)}/${
          allFiles.length
        } files (${playersMap.size} unique players)...`
      );
    }
  }

  console.log(`\n   ✅ Found ${playersMap.size} unique players`);
  console.log(`   ✅ Found ${allCountryNames.size} unique countries\n`);

  // ========================================================================
  // STEP 2: Insert players
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n👤 Step 2: Inserting players...\n");

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
  console.log(`✅ Inserted ${playersArray.length} players\n`);

  // ========================================================================
  // STEP 3: Insert missing countries
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n🌍 Step 3: Ensuring all countries exist...\n");

  const existingCountryRecords = await db
    .select({ id: countries.id, name: countries.name })
    .from(countries);

  const countryNameToId = new Map(
    existingCountryRecords.map((c) => [c.name, c.id])
  );

  const missingCountries: {
    statsbombId: null;
    name: string;
    type: "country" | "region" | "international";
  }[] = [];

  for (const countryName of allCountryNames) {
    if (!countryNameToId.has(countryName)) {
      missingCountries.push({
        statsbombId: null,
        name: countryName,
        type: "country",
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

    await db.insert(countries).values(missingCountries).onConflictDoNothing();

    const updatedCountryRecords = await db
      .select({ id: countries.id, name: countries.name })
      .from(countries);

    countryNameToId.clear();
    updatedCountryRecords.forEach((c) => countryNameToId.set(c.name, c.id));

    console.log(`   ✅ Inserted ${missingCountries.length} missing countries`);
  }

  console.log(`   ✅ Total countries available: ${countryNameToId.size}\n`);

  // ========================================================================
  // STEP 4-6: Process files in batches and insert lineup data
  // ========================================================================
  console.log("═".repeat(70));
  console.log(
    "\n📋 Step 4-6: Processing files in batches and inserting lineup data...\n"
  );

  let totalLineupsInserted = 0;
  let totalPositionsInserted = 0;
  let totalCardsInserted = 0;

  // Second pass: process files in batches and insert data
  for (let i = 0; i < allFiles.length; i += FILE_BATCH_SIZE) {
    const fileBatch = allFiles.slice(i, i + FILE_BATCH_SIZE);
    const batchMap = loadLineupBatch(lineupsDir, fileBatch);

    const batchLineups: any[] = [];
    const batchPositions: any[] = [];
    const batchCards: any[] = [];

    for (const { matchId, teams } of batchMap.values()) {
      for (const team of teams) {
        for (const player of team.lineup) {
          if (!player.country?.name) {
            continue;
          }

          const countryId = countryNameToId.get(player.country.name)!;
          const isStarter =
            player.positions[0]?.start_reason === "Starting XI" || false;
          const minutesPlayed = calculateMinutesPlayed(player.positions);

          batchLineups.push({
            matchId,
            teamId: team.team_id,
            playerId: player.player_id,
            jerseyNumber: player.jersey_number,
            countryId,
            isStarter,
            minutesPlayed,
            rawJson: player,
          });

          for (const pos of player.positions) {
            batchPositions.push({
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

          for (const card of player.cards) {
            batchCards.push({
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

    // Insert batch lineups
    if (batchLineups.length > 0) {
      for (let j = 0; j < batchLineups.length; j += BATCH_SIZE) {
        const batch = batchLineups.slice(j, j + BATCH_SIZE);
        await db.insert(playerLineups).values(batch).onConflictDoNothing();
      }
      totalLineupsInserted += batchLineups.length;
    }

    // Insert batch positions
    if (batchPositions.length > 0) {
      for (let j = 0; j < batchPositions.length; j += BATCH_SIZE) {
        const batch = batchPositions.slice(j, j + BATCH_SIZE);
        await db.insert(playerPositions).values(batch).onConflictDoNothing();
      }
      totalPositionsInserted += batchPositions.length;
    }

    // Insert batch cards
    if (batchCards.length > 0) {
      for (let j = 0; j < batchCards.length; j += BATCH_SIZE) {
        const batch = batchCards.slice(j, j + BATCH_SIZE);
        await db.insert(playerCards).values(batch).onConflictDoNothing();
      }
      totalCardsInserted += batchCards.length;
    }

    // Progress update
    if (
      (i + FILE_BATCH_SIZE) % 500 === 0 ||
      i + FILE_BATCH_SIZE >= allFiles.length
    ) {
      console.log(
        `   ✓ Processed ${Math.min(i + FILE_BATCH_SIZE, allFiles.length)}/${
          allFiles.length
        } files (${totalLineupsInserted} lineups, ${totalPositionsInserted} positions, ${totalCardsInserted} cards)...`
      );
    }
  }

  console.log();
  console.log(`✅ Inserted ${totalLineupsInserted} player lineups`);
  console.log(`✅ Inserted ${totalPositionsInserted} player positions`);
  console.log(`✅ Inserted ${totalCardsInserted} player cards\n`);

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

  console.log("✅ ETL completed successfully");
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
