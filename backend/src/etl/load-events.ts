import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";
import { env } from "../../env.ts";
import { db } from "../db/index.ts";
import {
  events,
  passes,
  shots,
  carries,
  dribbles,
  pressures,
  duels,
  blocks,
  interceptions,
  clearances,
  ballReceipts,
  ballRecoveries,
  fiftyFifties,
  fouls,
  badBehaviours,
  goalkeeperEvents,
  eventRelationships,
} from "../db/index.ts";

const EVENTS_PATH = path.join(env.DATA_PATH, "events");

// Batch sizes (tuned to avoid parameter limit)
const EVENT_BATCH_SIZE = 500; // 500 events × 20 fields = 10k params
const SUBTYPE_BATCH_SIZE = 1000; // Most subtypes have <20 fields
const RELATIONSHIP_BATCH_SIZE = 2000; // 2 UUIDs per row = 4k params

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface EventJson {
  id: string;
  index: number;
  period: number;
  timestamp: string;
  minute: number;
  second: number;
  type: { id: number; name: string };
  possession: number;
  possession_team: { id: number; name: string };
  play_pattern?: { id: number; name: string };
  team: { id: number; name: string };
  player?: { id: number; name: string };
  position?: { id: number; name: string };
  location?: [number, number];
  duration?: number;
  under_pressure?: boolean;
  off_camera?: boolean;
  out?: boolean;
  counterpress?: boolean;
  related_events?: string[];

  // Subtype fields
  pass?: any;
  shot?: any;
  carry?: any;
  dribble?: any;
  duel?: any;
  block?: any;
  interception?: any;
  clearance?: any;
  ball_receipt?: any;
  ball_recovery?: any;
  "50_50"?: any;
  foul_committed?: any;
  bad_behaviour?: any;
  goalkeeper?: any;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert timestamp string to PostgreSQL interval format
 * "00:05:30.500" -> "00:05:30.500"
 */
function parseTimestamp(ts: string): string {
  return ts; // PostgreSQL interval accepts HH:MM:SS.mmm format directly
}

/**
 * Extract match_id from filename (CRITICAL!)
 */
function extractMatchId(filePath: string): number {
  const matchId = parseInt(path.basename(filePath, ".json"));
  if (isNaN(matchId) || matchId <= 0) {
    throw new Error(`Invalid match_id from filename: ${filePath}`);
  }
  return matchId;
}

// ============================================================================
// ETL Main Function
// ============================================================================

async function loadEventsETL() {
  console.log("🏁 Starting Events ETL...\n");
  console.log("⚠️  WARNING: This is a MASSIVE ETL (12.2M events)");
  console.log("⏱️  Estimated time: 1-2 hours\n");

  const files = fs
    .readdirSync(EVENTS_PATH)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(EVENTS_PATH, f));

  console.log(`📂 Found ${files.length.toLocaleString()} event files\n`);

  // ========================================================================
  // PHASE 1: Load Core Events
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n📊 PHASE 1: Loading core events...\n");

  let totalEventsLoaded = 0;
  let filesProcessed = 0;
  let eventBatch: any[] = [];

  for (const filePath of files) {
    const matchId = extractMatchId(filePath);
    const eventsJson: EventJson[] = JSON.parse(
      fs.readFileSync(filePath, "utf-8")
    );

    for (const event of eventsJson) {
      const eventData = {
        id: event.id,
        index: event.index,
        matchId, // CRITICAL: Extracted from filename!

        // Timing
        period: event.period,
        timestamp: parseTimestamp(event.timestamp),
        minute: event.minute,
        second: event.second,

        // Type & Context
        typeId: event.type.id,
        possession: event.possession,
        possessionTeamId: event.possession_team.id,
        playPatternId: event.play_pattern?.id || null,

        // Actors (nullable!)
        teamId: event.team.id,
        playerId: event.player?.id || null,
        positionId: event.position?.id || null,

        // Location (nullable!)
        locationX: event.location?.[0]?.toString() || null,
        locationY: event.location?.[1]?.toString() || null,

        // Duration & Flags
        duration: event.duration?.toString() || null,
        underPressure: event.under_pressure || false,
        offCamera: event.off_camera || false,
        out: event.out || false,
        counterpress: event.counterpress || false,

        // Raw JSON (zero data loss)
        rawJson: event,
      };

      eventBatch.push(eventData);

      // Insert batch when full
      if (eventBatch.length >= EVENT_BATCH_SIZE) {
        await db.insert(events).values(eventBatch).onConflictDoNothing();
        totalEventsLoaded += eventBatch.length;
        eventBatch = [];

        if (totalEventsLoaded % 10000 === 0) {
          console.log(
            `   ✓ Loaded ${totalEventsLoaded.toLocaleString()} events...`
          );
        }
      }
    }

    filesProcessed++;
    if (filesProcessed % 500 === 0) {
      console.log(
        `   📂 Processed ${filesProcessed}/${
          files.length
        } files (${totalEventsLoaded.toLocaleString()} events)`
      );
    }
  }

  // Insert remaining events
  if (eventBatch.length > 0) {
    await db.insert(events).values(eventBatch).onConflictDoNothing();
    totalEventsLoaded += eventBatch.length;
  }

  console.log();
  console.log(`✅ Loaded ${totalEventsLoaded.toLocaleString()} core events\n`);

  // ========================================================================
  // PHASE 2: Load Subtype Tables
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n📊 PHASE 2: Loading subtype tables...\n");

  await loadSubtypeTables(files);

  // ========================================================================
  // PHASE 3: Load Event Relationships
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n🔗 PHASE 3: Loading event relationships...\n");

  await loadEventRelationships(files);

  // ========================================================================
  // PHASE 4: Verification
  // ========================================================================
  console.log("═".repeat(70));
  console.log("\n✅ PHASE 4: Verifying data...\n");

  await verifyEventsData();

  console.log("═".repeat(70));
  console.log("\n🎉 Events ETL Complete!\n");
}

// ============================================================================
// Subtype Loading Functions
// ============================================================================

async function loadSubtypeTables(files: string[]) {
  const passBatch: any[] = [];
  const shotBatch: any[] = [];
  const carryBatch: any[] = [];
  const dribbleBatch: any[] = [];
  const pressureBatch: any[] = [];
  const duelBatch: any[] = [];
  const blockBatch: any[] = [];
  const interceptionBatch: any[] = [];
  const clearanceBatch: any[] = [];
  const ballReceiptBatch: any[] = [];
  const ballRecoveryBatch: any[] = [];
  const fiftyFiftyBatch: any[] = [];
  const foulBatch: any[] = [];
  const badBehaviourBatch: any[] = [];
  const gkBatch: any[] = [];

  let filesProcessed = 0;

  for (const filePath of files) {
    const eventsJson: EventJson[] = JSON.parse(
      fs.readFileSync(filePath, "utf-8")
    );

    for (const event of eventsJson) {
      // PASSES (type 30)
      if (event.type.id === 30 && event.pass) {
        passBatch.push({
          eventId: event.id,
          recipientId: event.pass.recipient?.id || null,
          length: event.pass.length?.toString() || null,
          angle: event.pass.angle?.toString() || null,
          endX: event.pass.end_location?.[0]?.toString() || null,
          endY: event.pass.end_location?.[1]?.toString() || null,
          heightId: event.pass.height?.id || null,
          typeId: event.pass.type?.id || null,
          bodyPartId: event.pass.body_part?.id || null,
          techniqueId: event.pass.technique?.id || null,
          outcomeId: event.pass.outcome?.id || null,
          shotAssist: event.pass.shot_assist || false,
          goalAssist: event.pass.goal_assist || false,
          assistedShotId: event.pass.assisted_shot_id || null,
          switch: event.pass.switch || false,
          cross: event.pass.cross || false,
          cutBack: event.pass.cut_back || false,
          deflected: event.pass.deflected || false,
          miscommunication: event.pass.miscommunication || false,
          aerialWon: event.pass.aerial_won || false,
          noTouch: event.pass.no_touch || false,
          backheel: event.pass.backheel || false,
          throughBall: event.pass.through_ball || false,
          inswinging: event.pass.inswinging || false,
          outswinging: event.pass.outswinging || false,
          straight: event.pass.straight || false,
        });
      }

      // SHOTS (type 16)
      if (event.type.id === 16 && event.shot) {
        shotBatch.push({
          eventId: event.id,
          shotXg: event.shot.statsbomb_xg?.toString() || null,
          endX: event.shot.end_location?.[0]?.toString() || null,
          endY: event.shot.end_location?.[1]?.toString() || null,
          endZ: event.shot.end_location?.[2]?.toString() || null,
          outcomeId: event.shot.outcome.id,
          typeId: event.shot.type?.id || null,
          bodyPartId: event.shot.body_part?.id || null,
          techniqueId: event.shot.technique?.id || null,
          firstTime: event.shot.first_time || false,
          oneOnOne: event.shot.one_on_one || false,
          aerialWon: event.shot.aerial_won || false,
          deflected: event.shot.deflected || false,
          openGoal: event.shot.open_goal || false,
          followsDribble: event.shot.follows_dribble || false,
          redirect: event.shot.redirect || false,
          keyPassId: event.shot.key_pass_id || null,
          freezeFrame: event.shot.freeze_frame || null,
        });
      }

      // CARRIES (type 43)
      if (event.type.id === 43 && event.carry) {
        carryBatch.push({
          eventId: event.id,
          endX: event.carry.end_location?.[0]?.toString() || null,
          endY: event.carry.end_location?.[1]?.toString() || null,
        });
      }

      // DRIBBLES (type 14)
      if (event.type.id === 14 && event.dribble) {
        dribbleBatch.push({
          eventId: event.id,
          outcomeId: event.dribble.outcome?.id || null,
          overrun: event.dribble.overrun || false,
          nutmeg: event.dribble.nutmeg || false,
          noTouch: event.dribble.no_touch || false,
        });
      }

      // PRESSURES (type 17)
      if (event.type.id === 17) {
        pressureBatch.push({
          eventId: event.id,
          counterpress: event.counterpress || false,
        });
      }

      // DUELS (type 4)
      if (event.type.id === 4 && event.duel) {
        duelBatch.push({
          eventId: event.id,
          duelTypeId: event.duel.type?.id || null,
          outcomeId: event.duel.outcome?.id || null,
          counterpress: event.counterpress || false,
        });
      }

      // BLOCKS (type 6)
      if (event.type.id === 6 && event.block) {
        blockBatch.push({
          eventId: event.id,
          deflection: event.block.deflection || false,
          offensive: event.block.offensive || false,
          saveBlock: event.block.save_block || false,
          counterpress: event.counterpress || false,
        });
      }

      // INTERCEPTIONS (type 10)
      if (event.type.id === 10 && event.interception) {
        interceptionBatch.push({
          eventId: event.id,
          outcomeId: event.interception.outcome?.id || null,
          counterpress: event.counterpress || false,
        });
      }

      // CLEARANCES (type 9)
      if (event.type.id === 9 && event.clearance) {
        clearanceBatch.push({
          eventId: event.id,
          bodyPartId: event.clearance.body_part?.id || null,
          aerialWon: event.clearance.aerial_won || false,
        });
      }

      // BALL RECEIPTS (type 42)
      if (event.type.id === 42 && event.ball_receipt) {
        ballReceiptBatch.push({
          eventId: event.id,
          outcomeId: event.ball_receipt.outcome?.id || null,
        });
      }

      // BALL RECOVERIES (type 2)
      if (event.type.id === 2 && event.ball_recovery) {
        ballRecoveryBatch.push({
          eventId: event.id,
          recoveryFailure: event.ball_recovery.recovery_failure || false,
          offensive: event.ball_recovery.offensive || false,
        });
      }

      // 50/50s (type 33)
      if (event.type.id === 33 && event["50_50"]) {
        fiftyFiftyBatch.push({
          eventId: event.id,
          outcomeId: event["50_50"].outcome?.id || null,
          counterpress: event.counterpress || false,
        });
      }

      // FOULS (types 21, 22)
      if (
        (event.type.id === 21 || event.type.id === 22) &&
        event.foul_committed
      ) {
        foulBatch.push({
          eventId: event.id,
          penalty: event.foul_committed.penalty || false,
          cardId: event.foul_committed.card?.id || null,
          foulTypeId: event.foul_committed.type?.id || null,
          counterpress: event.counterpress || false,
        });
      }

      // BAD BEHAVIOUR (type 24)
      if (event.type.id === 24 && event.bad_behaviour) {
        badBehaviourBatch.push({
          eventId: event.id,
          cardId: event.bad_behaviour.card?.id || null,
        });
      }

      // GOALKEEPER (type 23)
      if (event.type.id === 23 && event.goalkeeper) {
        gkBatch.push({
          eventId: event.id,
          positionId: event.goalkeeper.position?.id || null,
          techniqueId: event.goalkeeper.technique?.id || null,
          bodyPartId: event.goalkeeper.body_part?.id || null,
          gkTypeId: event.goalkeeper.type?.id || null,
          outcomeId: event.goalkeeper.outcome?.id || null,
        });
      }
    }

    filesProcessed++;

    // Flush batches frequently to avoid stack overflow
    const shouldFlush =
      filesProcessed % 50 === 0 ||
      filesProcessed === files.length ||
      passBatch.length >= SUBTYPE_BATCH_SIZE ||
      shotBatch.length >= SUBTYPE_BATCH_SIZE;

    if (shouldFlush) {
      await flushSubtypeBatches({
        passes: passBatch,
        shots: shotBatch,
        carries: carryBatch,
        dribbles: dribbleBatch,
        pressures: pressureBatch,
        duels: duelBatch,
        blocks: blockBatch,
        interceptions: interceptionBatch,
        clearances: clearanceBatch,
        ballReceipts: ballReceiptBatch,
        ballRecoveries: ballRecoveryBatch,
        fiftyFifties: fiftyFiftyBatch,
        fouls: foulBatch,
        badBehaviours: badBehaviourBatch,
        goalkeepers: gkBatch,
      });

      if (filesProcessed % 100 === 0) {
        console.log(
          `   ✓ Processed ${filesProcessed}/${files.length} files for subtypes...`
        );
      }
    }
  }

  console.log("\n✅ All subtype tables loaded\n");
}

async function flushSubtypeBatches(batches: any) {
  if (batches.passes.length > 0) {
    await db.insert(passes).values(batches.passes).onConflictDoNothing();
    batches.passes.length = 0;
  }
  if (batches.shots.length > 0) {
    await db.insert(shots).values(batches.shots).onConflictDoNothing();
    batches.shots.length = 0;
  }
  if (batches.carries.length > 0) {
    await db.insert(carries).values(batches.carries).onConflictDoNothing();
    batches.carries.length = 0;
  }
  if (batches.dribbles.length > 0) {
    await db.insert(dribbles).values(batches.dribbles).onConflictDoNothing();
    batches.dribbles.length = 0;
  }
  if (batches.pressures.length > 0) {
    await db.insert(pressures).values(batches.pressures).onConflictDoNothing();
    batches.pressures.length = 0;
  }
  if (batches.duels.length > 0) {
    await db.insert(duels).values(batches.duels).onConflictDoNothing();
    batches.duels.length = 0;
  }
  if (batches.blocks.length > 0) {
    await db.insert(blocks).values(batches.blocks).onConflictDoNothing();
    batches.blocks.length = 0;
  }
  if (batches.interceptions.length > 0) {
    await db
      .insert(interceptions)
      .values(batches.interceptions)
      .onConflictDoNothing();
    batches.interceptions.length = 0;
  }
  if (batches.clearances.length > 0) {
    await db
      .insert(clearances)
      .values(batches.clearances)
      .onConflictDoNothing();
    batches.clearances.length = 0;
  }
  if (batches.ballReceipts.length > 0) {
    await db
      .insert(ballReceipts)
      .values(batches.ballReceipts)
      .onConflictDoNothing();
    batches.ballReceipts.length = 0;
  }
  if (batches.ballRecoveries.length > 0) {
    await db
      .insert(ballRecoveries)
      .values(batches.ballRecoveries)
      .onConflictDoNothing();
    batches.ballRecoveries.length = 0;
  }
  if (batches.fiftyFifties.length > 0) {
    await db
      .insert(fiftyFifties)
      .values(batches.fiftyFifties)
      .onConflictDoNothing();
    batches.fiftyFifties.length = 0;
  }
  if (batches.fouls.length > 0) {
    await db.insert(fouls).values(batches.fouls).onConflictDoNothing();
    batches.fouls.length = 0;
  }
  if (batches.badBehaviours.length > 0) {
    await db
      .insert(badBehaviours)
      .values(batches.badBehaviours)
      .onConflictDoNothing();
    batches.badBehaviours.length = 0;
  }
  if (batches.goalkeepers.length > 0) {
    await db
      .insert(goalkeeperEvents)
      .values(batches.goalkeepers)
      .onConflictDoNothing();
    batches.goalkeepers.length = 0;
  }
}

// ============================================================================
// Event Relationships Loading
// ============================================================================

async function loadEventRelationships(files: string[]) {
  let relationshipBatch: any[] = [];
  let totalRelationships = 0;
  let filesProcessed = 0;

  for (const filePath of files) {
    const eventsJson: EventJson[] = JSON.parse(
      fs.readFileSync(filePath, "utf-8")
    );

    for (const event of eventsJson) {
      if (event.related_events && event.related_events.length > 0) {
        for (const relatedId of event.related_events) {
          relationshipBatch.push({
            eventId: event.id,
            relatedEventId: relatedId,
          });
        }
      }

      if (relationshipBatch.length >= RELATIONSHIP_BATCH_SIZE) {
        await db
          .insert(eventRelationships)
          .values(relationshipBatch)
          .onConflictDoNothing();
        totalRelationships += relationshipBatch.length;
        relationshipBatch = [];

        if (totalRelationships % 100000 === 0) {
          console.log(
            `   ✓ Loaded ${totalRelationships.toLocaleString()} relationships...`
          );
        }
      }
    }

    filesProcessed++;
  }

  // Insert remaining
  if (relationshipBatch.length > 0) {
    await db
      .insert(eventRelationships)
      .values(relationshipBatch)
      .onConflictDoNothing();
    totalRelationships += relationshipBatch.length;
  }

  console.log();
  console.log(
    `✅ Loaded ${totalRelationships.toLocaleString()} event relationships\n`
  );
}

// ============================================================================
// Verification
// ============================================================================

async function verifyEventsData() {
  const [eventsCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events);
  const [passesCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(passes);
  const [shotsCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(shots);
  const [relationshipsCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eventRelationships);

  console.log("   📊 Final Counts:\n");
  console.log(
    `      Events:              ${(
      eventsCount.count as number
    ).toLocaleString()}`
  );
  console.log(
    `      Passes:              ${(
      passesCount.count as number
    ).toLocaleString()}`
  );
  console.log(
    `      Shots:               ${(
      shotsCount.count as number
    ).toLocaleString()}`
  );
  console.log(
    `      Event Relationships: ${(
      relationshipsCount.count as number
    ).toLocaleString()}`
  );

  if ((eventsCount.count as number) >= 12000000) {
    console.log("\n   ✅ Event count looks good (≥12M)!");
  } else {
    console.warn(
      `\n   ⚠️  Expected ~12.2M events, got ${(
        eventsCount.count as number
      ).toLocaleString()}`
    );
  }
}

// ============================================================================
// Run ETL
// ============================================================================

loadEventsETL()
  .then(() => {
    console.log("\n✅ Events ETL finished successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ ETL failed:", err);
    process.exit(1);
  });
