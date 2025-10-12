import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { threeSixtyFrames, threeSixtyPlayers, matches } from "../db/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, "../../football-open/data/three-sixty");

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
 * Load all 360 files and extract match_id from filename
 */
function loadAll360Files(): Map<
  number,
  { matchId: number; frames: ThreeSixtyFrame[] }
> {
  const files = fs
    .readdirSync(DATA_PATH)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(DATA_PATH, f));

  console.log(`📂 Found ${files.length} 360 files\n`);

  const framesMap = new Map<
    number,
    { matchId: number; frames: ThreeSixtyFrame[] }
  >();

  let skippedFiles = 0;
  let totalFrames = 0;

  for (const filePath of files) {
    // CRITICAL: Extract match_id from filename!
    const matchId = parseInt(path.basename(filePath, ".json"));

    if (isNaN(matchId) || matchId <= 0) {
      console.error(`   ❌ Invalid filename: ${path.basename(filePath)}`);
      skippedFiles++;
      continue;
    }

    try {
      const rawJson: ThreeSixtyFrame[] = JSON.parse(
        fs.readFileSync(filePath, "utf-8")
      );

      if (!Array.isArray(rawJson)) {
        console.error(
          `   ❌ ${path.basename(filePath)} is not an array, skipping`
        );
        skippedFiles++;
        continue;
      }

      framesMap.set(matchId, { matchId, frames: rawJson });
      totalFrames += rawJson.length;

      if (framesMap.size % 50 === 0) {
        console.log(
          `   ✓ Loaded ${
            framesMap.size
          } files (${totalFrames.toLocaleString()} frames)...`
        );
      }
    } catch (err) {
      console.error(
        `   ❌ Failed to parse ${path.basename(filePath)}: ${
          (err as Error).message
        }`
      );
      skippedFiles++;
    }
  }

  console.log(
    `   ✅ Successfully loaded ${
      framesMap.size
    } matches (${totalFrames.toLocaleString()} frames)`
  );
  if (skippedFiles > 0) {
    console.log(
      `   ⚠️  Skipped ${skippedFiles} corrupt/invalid files (${(
        (skippedFiles / files.length) *
        100
      ).toFixed(1)}%)`
    );
  }

  return framesMap;
}

// ============================================================================
// ETL Main Function
// ============================================================================

async function load360ETL() {
  console.log("🏁 Starting 360 Frames ETL...\n");

  // ========================================================================
  // STEP 1: Load all 360 files
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n📂 Step 1: Loading all 360 files...\n");

  const framesMap = loadAll360Files();

  console.log();
  console.log(`✅ Loaded ${framesMap.size} matches\n`);

  // ========================================================================
  // STEP 2: Verify matches exist in database
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n🔍 Step 2: Verifying matches exist in database...\n");

  const matchIds = Array.from(framesMap.keys());
  console.log(`   Checking ${matchIds.length} match IDs...`);

  // Query all matches at once
  const existingMatchesResult = await db
    .select({ matchId: matches.matchId })
    .from(matches);

  const existingMatchIds = new Set(existingMatchesResult.map((m) => m.matchId));

  const missingMatches = matchIds.filter((id) => !existingMatchIds.has(id));

  console.log(`   ✅ Found ${existingMatchIds.size} matches in database`);
  if (missingMatches.length > 0) {
    console.warn(
      `   ⚠️  ${missingMatches.length} matches not in database - will skip`
    );
    console.warn(`      Sample: ${missingMatches.slice(0, 5).join(", ")}...`);
  }

  // Filter to only existing matches
  for (const matchId of missingMatches) {
    framesMap.delete(matchId);
  }

  console.log();
  console.log(`✅ Processing ${framesMap.size} matches\n`);

  // ========================================================================
  // STEP 3: Insert frames and players
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n📊 Step 3: Inserting 360 frames and players...\n");

  let totalFramesInserted = 0;
  let totalPlayersInserted = 0;
  let matchesProcessed = 0;

  const FRAME_BATCH_SIZE = 100; // Reduced from 500 to avoid parameter limit (100 frames × 15 players × 8 fields = 12k params)

  for (const { matchId, frames } of framesMap.values()) {
    try {
      // Process frames in batches
      for (let i = 0; i < frames.length; i += FRAME_BATCH_SIZE) {
        const frameBatch = frames.slice(i, i + FRAME_BATCH_SIZE);

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
          if (!frameId) continue; // Frame was duplicate, skip

          // Find actor for distance calculations
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
              inVisibleArea: true, // TODO: Implement point-in-polygon check
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

      matchesProcessed++;
      if (matchesProcessed % 50 === 0) {
        console.log(
          `   ✓ Processed ${matchesProcessed}/${
            framesMap.size
          } matches (${totalFramesInserted.toLocaleString()} frames, ${totalPlayersInserted.toLocaleString()} players)...`
        );
      }
    } catch (err) {
      console.error(
        `   ❌ Failed to process match ${matchId}: ${(err as Error).message}`
      );
    }
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
