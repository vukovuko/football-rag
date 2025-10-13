import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";
import { env } from "../../env.ts";
import { db } from "../db/index.ts";
import { threeSixtyFrames, threeSixtyPlayers, matches } from "../db/index.ts";

const DATA_PATH = path.join(
  process.cwd(),
  env.DATA_PATH || "./football-open/data",
  "three-sixty"
);

// ============================================================================
// TypeScript Interfaces (matching JSON structure)
// ============================================================================

interface ThreeSixtyPlayer {
  teammate: boolean;
  actor: boolean;
  keeper: boolean;
  location: [number, number];
}

interface ThreeSixtyFrame {
  event_uuid: string;
  visible_area: number[];
  freeze_frame: ThreeSixtyPlayer[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate area of polygon using Shoelace formula
 */
function calculateVisibleAreaSize(coords: number[]): number | null {
  if (coords.length < 6) return null; // Need at least 3 points

  let area = 0;
  const numPoints = coords.length / 2 - 1; // Exclude closing point

  for (let i = 0; i < numPoints; i++) {
    const j = (i + 1) % numPoints;
    area += coords[i * 2] * coords[j * 2 + 1];
    area -= coords[j * 2] * coords[i * 2 + 1];
  }

  return Math.abs(area / 2);
}

/**
 * Calculate distance between two points
 */
function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Load and process a batch of 360 files
 * Returns match data that was successfully loaded
 */
function loadFileBatch(
  filePaths: string[]
): Map<number, { matchId: number; frames: ThreeSixtyFrame[] }> {
  const batchMap = new Map<
    number,
    { matchId: number; frames: ThreeSixtyFrame[] }
  >();

  for (const filePath of filePaths) {
    const matchId = parseInt(path.basename(filePath, ".json"));

    if (isNaN(matchId) || matchId <= 0) {
      continue;
    }

    try {
      const rawJson: ThreeSixtyFrame[] = JSON.parse(
        fs.readFileSync(filePath, "utf-8")
      );

      if (!Array.isArray(rawJson)) {
        continue;
      }

      batchMap.set(matchId, { matchId, frames: rawJson });
    } catch (err) {
      // Skip corrupt files silently (will be logged in main function)
      continue;
    }
  }

  return batchMap;
}

// ============================================================================
// ETL Main Function
// ============================================================================

async function load360ETL() {
  console.log("🏁 Starting 360 Frames ETL...\n");

  // ========================================================================
  // STEP 1: Get list of 360 files
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n📂 Step 1: Scanning 360 files...\n");

  const allFiles = fs
    .readdirSync(DATA_PATH)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(DATA_PATH, f));

  console.log(`   Found ${allFiles.length} 360 files\n`);

  // ========================================================================
  // STEP 2: Query existing matches from database (once)
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n🔍 Step 2: Querying existing matches from database...\n");

  const existingMatchesResult = await db
    .select({ matchId: matches.matchId })
    .from(matches);

  const existingMatchIds = new Set(existingMatchesResult.map((m) => m.matchId));

  console.log(`   ✅ Found ${existingMatchIds.size} matches in database\n`);

  // ========================================================================
  // STEP 3: Process files in batches and insert data
  // ========================================================================
  console.log("═".repeat(70));
  console.log(
    "\n📊 Step 3: Processing files in batches and inserting data...\n"
  );

  let totalFramesInserted = 0;
  let totalPlayersInserted = 0;
  let totalFilesProcessed = 0;
  let totalSkipped = 0;

  const FILE_BATCH_SIZE = 50; // Process 50 files at a time to limit memory
  const FRAME_BATCH_SIZE = 100; // Insert 100 frames at a time

  // Process files in batches
  for (let i = 0; i < allFiles.length; i += FILE_BATCH_SIZE) {
    const fileBatch = allFiles.slice(i, i + FILE_BATCH_SIZE);

    // Load this batch of files
    const batchMap = loadFileBatch(fileBatch);

    // Process each match in the batch
    for (const { matchId, frames } of batchMap.values()) {
      // Skip if match not in database
      if (!existingMatchIds.has(matchId)) {
        totalSkipped++;
        continue;
      }

      try {
        // Process frames in sub-batches
        for (let j = 0; j < frames.length; j += FRAME_BATCH_SIZE) {
          const frameBatch = frames.slice(j, j + FRAME_BATCH_SIZE);

          // Prepare frame data
          const frameData = frameBatch.map((frame) => {
            const areaSize = calculateVisibleAreaSize(frame.visible_area);
            return {
              matchId,
              eventUuid: frame.event_uuid,
              visibleArea: frame.visible_area,
              playerCount: frame.freeze_frame.length,
              visibleAreaSize: areaSize !== null ? areaSize.toString() : null,
              rawJson: frame,
            };
          });

          // Insert frames
          const insertedFrames = await db
            .insert(threeSixtyFrames)
            .values(frameData)
            .onConflictDoNothing()
            .returning({
              id: threeSixtyFrames.id,
              eventUuid: threeSixtyFrames.eventUuid,
            });

          // Create frame_id map
          const frameIdMap = new Map(
            insertedFrames.map((f, idx) => [frameBatch[idx].event_uuid, f.id])
          );

          // Prepare player data
          const allPlayers: any[] = [];

          for (const frame of frameBatch) {
            const frameId = frameIdMap.get(frame.event_uuid);
            if (!frameId) continue;

            const actor = frame.freeze_frame.find((p) => p.actor);

            for (const player of frame.freeze_frame) {
              const distanceToActor = actor
                ? calculateDistance(
                    player.location[0],
                    player.location[1],
                    actor.location[0],
                    actor.location[1]
                  )
                : null;

              allPlayers.push({
                frameId,
                teammate: player.teammate,
                actor: player.actor,
                keeper: player.keeper,
                locationX: player.location[0],
                locationY: player.location[1],
                distanceToActor,
                inVisibleArea: true,
              });
            }
          }

          // Insert players
          if (allPlayers.length > 0) {
            await db
              .insert(threeSixtyPlayers)
              .values(allPlayers)
              .onConflictDoNothing();
            totalPlayersInserted += allPlayers.length;
          }

          totalFramesInserted += insertedFrames.length;
        }

        totalFilesProcessed++;
      } catch (err) {
        console.error(
          `   ❌ Failed to process match ${matchId}: ${(err as Error).message}`
        );
        totalSkipped++;
      }
    }

    // Progress update every batch
    console.log(
      `   ✓ Processed ${Math.min(i + FILE_BATCH_SIZE, allFiles.length)}/${
        allFiles.length
      } files (${totalFramesInserted.toLocaleString()} frames, ${totalPlayersInserted.toLocaleString()} players)...`
    );
  }

  if (totalSkipped > 0) {
    console.log(
      `   ⚠️  Skipped ${totalSkipped} files (corrupt or match not in database)`
    );
  }

  console.log();
  console.log(`✅ Inserted ${totalFramesInserted.toLocaleString()} frames`);
  console.log(
    `✅ Inserted ${totalPlayersInserted.toLocaleString()} player positions\n`
  );

  // ========================================================================
  // STEP 4: Verification
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n✅ Step 4: Verifying data...\n");

  const [framesResult, playersResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(threeSixtyFrames),
    db.select({ count: sql<number>`count(*)::int` }).from(threeSixtyPlayers),
  ]);

  const framesCount = framesResult[0].count as number;
  const playersCount = playersResult[0].count as number;

  console.log("   📊 Final Counts:\n");
  console.log(`      Frames:           ${framesCount.toLocaleString()}`);
  console.log(`      Player Positions: ${playersCount.toLocaleString()}`);
  console.log(
    `      Avg Players/Frame: ${(playersCount / framesCount).toFixed(1)}`
  );

  console.log();
  console.log("═".repeat(70));
  console.log("\n🎉 360 Frames ETL Complete!\n");

  if (framesCount !== totalFramesInserted) {
    console.warn(
      `\n⚠️  WARNING: Expected ${totalFramesInserted} frames, but got ${framesCount}`
    );
  }

  console.log("✅ ETL completed successfully");
}

// ============================================================================
// Run ETL
// ============================================================================

load360ETL()
  .then(() => {
    console.log("\n✅ 360 ETL finished successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ ETL failed:", err);
    process.exit(1);
  });
