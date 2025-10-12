import { db } from "./index.ts";
import {
  eventTypes,
  playPatterns,
  bodyParts,
  passHeights,
  passTypes,
  passTechniques,
  passOutcomes,
  shotOutcomes,
  shotTypes,
  shotTechniques,
  duelTypes,
  duelOutcomes,
  goalkeeperPositions,
  goalkeeperTechniques,
  goalkeeperTypes,
  goalkeeperOutcomes,
  dribbleOutcomes,
  interceptionOutcomes,
  ballReceiptOutcomes,
  fiftyFiftyOutcomes,
} from "./index.ts";

console.log("🌱 Seeding event lookup tables...\n");

async function seedEventLookups() {
  // ============================================================================
  // EVENT TYPES (35 types - includes extras found in data)
  // ============================================================================
  console.log("📊 Seeding event types...");

  const eventTypeData = [
    { id: 2, name: "Ball Recovery" },
    { id: 3, name: "Dispossessed" },
    { id: 4, name: "Duel" },
    { id: 5, name: "Camera On" }, // Extra type found in data
    { id: 6, name: "Block" },
    { id: 8, name: "Offside" },
    { id: 9, name: "Clearance" },
    { id: 10, name: "Interception" },
    { id: 14, name: "Dribble" },
    { id: 16, name: "Shot" },
    { id: 17, name: "Pressure" },
    { id: 18, name: "Half Start" },
    { id: 19, name: "Substitution" },
    { id: 20, name: "Own Goal Against" }, // Extra type found in data
    { id: 21, name: "Foul Won" },
    { id: 22, name: "Foul Committed" },
    { id: 23, name: "Goal Keeper" },
    { id: 24, name: "Bad Behaviour" },
    { id: 25, name: "Own Goal For" }, // Extra type found in data
    { id: 26, name: "Player On" },
    { id: 27, name: "Player Off" },
    { id: 28, name: "Shield" }, // Extra type found in data
    { id: 29, name: "Camera off" }, // Extra type found in data
    { id: 30, name: "Pass" },
    { id: 33, name: "50/50" },
    { id: 34, name: "Half End" },
    { id: 35, name: "Starting XI" },
    { id: 36, name: "Tactical Shift" },
    { id: 37, name: "Error" },
    { id: 38, name: "Miscontrol" },
    { id: 39, name: "Dribbled Past" },
    { id: 40, name: "Injury Stoppage" },
    { id: 41, name: "Referee Ball-Drop" },
    { id: 42, name: "Ball Receipt*" },
    { id: 43, name: "Carry" },
  ];

  await db.insert(eventTypes).values(eventTypeData).onConflictDoNothing();
  console.log(`✅ Seeded ${eventTypeData.length} event types\n`);

  // ============================================================================
  // PLAY PATTERNS (9 patterns from verification)
  // ============================================================================
  console.log("🎯 Seeding play patterns...");

  const playPatternData = [
    { id: 1, name: "Regular Play" },
    { id: 2, name: "From Corner" },
    { id: 3, name: "From Free Kick" },
    { id: 4, name: "From Throw In" },
    { id: 5, name: "Other" },
    { id: 6, name: "From Counter" },
    { id: 7, name: "From Goal Kick" },
    { id: 8, name: "From Keeper" },
    { id: 9, name: "From Kick Off" },
  ];

  await db.insert(playPatterns).values(playPatternData).onConflictDoNothing();
  console.log(`✅ Seeded ${playPatternData.length} play patterns\n`);

  // ============================================================================
  // BODY PARTS (used by passes, shots, clearances)
  // ============================================================================
  console.log("🦵 Seeding body parts...");

  const bodyPartData = [
    { id: 35, name: "Both Hands" },
    { id: 36, name: "Chest" },
    { id: 37, name: "Head" },
    { id: 38, name: "Left Foot" },
    { id: 39, name: "Left Hand" },
    { id: 40, name: "Right Foot" },
    { id: 41, name: "Right Hand" },
    { id: 68, name: "Drop Kick" },
    { id: 69, name: "Keeper Arm" },
    { id: 70, name: "Other" },
    { id: 106, name: "No Touch" }, // v1.1.0
  ];

  await db.insert(bodyParts).values(bodyPartData).onConflictDoNothing();
  console.log(`✅ Seeded ${bodyPartData.length} body parts\n`);

  // ============================================================================
  // PASS-SPECIFIC LOOKUPS
  // ============================================================================
  console.log("⚽ Seeding pass lookups...");

  // Pass Heights
  await db
    .insert(passHeights)
    .values([
      { id: 1, name: "Ground Pass" },
      { id: 2, name: "Low Pass" },
      { id: 3, name: "High Pass" },
    ])
    .onConflictDoNothing();

  // Pass Types
  await db
    .insert(passTypes)
    .values([
      { id: 61, name: "Corner" },
      { id: 62, name: "Free Kick" },
      { id: 63, name: "Goal Kick" },
      { id: 64, name: "Interception" },
      { id: 65, name: "Kick Off" },
      { id: 66, name: "Recovery" },
      { id: 67, name: "Throw-in" },
      { id: 68, name: "Chipped" }, // In docs, not in data (rare)
    ])
    .onConflictDoNothing();

  // Pass Techniques (v1.1.0)
  await db
    .insert(passTechniques)
    .values([
      { id: 104, name: "Inswinging" },
      { id: 105, name: "Outswinging" },
      { id: 107, name: "Straight" },
      { id: 108, name: "Through Ball" },
      { id: 109, name: "Outswinging" }, // Duplicate ID in docs (rare)
      { id: 110, name: "Straight" }, // Duplicate ID in docs (rare)
    ])
    .onConflictDoNothing();

  // Pass Outcomes
  await db
    .insert(passOutcomes)
    .values([
      { id: 9, name: "Incomplete" },
      { id: 74, name: "Injury Clearance" },
      { id: 75, name: "Out" },
      { id: 76, name: "Pass Offside" },
      { id: 77, name: "Unknown" },
    ])
    .onConflictDoNothing();

  console.log("✅ Seeded pass lookups\n");

  // ============================================================================
  // SHOT-SPECIFIC LOOKUPS
  // ============================================================================
  console.log("🎯 Seeding shot lookups...");

  // Shot Outcomes
  await db
    .insert(shotOutcomes)
    .values([
      { id: 96, name: "Blocked" },
      { id: 97, name: "Goal" },
      { id: 98, name: "Off T" },
      { id: 99, name: "Post" },
      { id: 100, name: "Saved" },
      { id: 101, name: "Wayward" },
      { id: 102, name: "Wayward" }, // In docs, not in data (rare/duplicate)
      { id: 104, name: "Blocked" }, // In docs, not in data (rare/duplicate)
      { id: 115, name: "Saved Off Target" },
      { id: 116, name: "Saved to Post" },
    ])
    .onConflictDoNothing();

  // Shot Types
  await db
    .insert(shotTypes)
    .values([
      { id: 61, name: "Corner (Shot)" }, // Found in data (shared with pass type)
      { id: 62, name: "Free Kick (Shot)" }, // Found in data (shared with pass type)
      { id: 65, name: "Through Ball (Shot)" }, // Found in data (shared with pass type)
      { id: 87, name: "Open Play" },
      { id: 88, name: "Free Kick" },
      { id: 89, name: "Corner" }, // In docs, not in data (rare)
      { id: 90, name: "Penalty" }, // In docs, not in data (rare)
      { id: 91, name: "Kick Off" }, // In docs, not in data (rare)
    ])
    .onConflictDoNothing();

  // Shot Techniques
  await db
    .insert(shotTechniques)
    .values([
      { id: 89, name: "Backheel" },
      { id: 90, name: "Diving Header" },
      { id: 91, name: "Half Volley" },
      { id: 92, name: "Lob" },
      { id: 93, name: "Normal" },
      { id: 94, name: "Overhead Kick" },
      { id: 95, name: "Volley" },
      { id: 96, name: "Diving Header" }, // In docs, not in data (duplicate)
      { id: 107, name: "Lob" }, // In docs, not in data (duplicate)
      { id: 108, name: "Backheel" }, // In docs, not in data (duplicate)
    ])
    .onConflictDoNothing();

  console.log("✅ Seeded shot lookups\n");

  // ============================================================================
  // DUEL LOOKUPS
  // ============================================================================
  console.log("🤼 Seeding duel lookups...");

  await db
    .insert(duelTypes)
    .values([
      { id: 10, name: "Aerial Lost" },
      { id: 11, name: "Tackle" },
    ])
    .onConflictDoNothing();

  await db
    .insert(duelOutcomes)
    .values([
      { id: 4, name: "Won" },
      { id: 13, name: "Lost In Play" },
      { id: 14, name: "Lost Out" },
      { id: 16, name: "Success In Play" },
      { id: 17, name: "Success Out" },
    ])
    .onConflictDoNothing();

  console.log("✅ Seeded duel lookups\n");

  // ============================================================================
  // GOALKEEPER LOOKUPS
  // ============================================================================
  console.log("🧤 Seeding goalkeeper lookups...");

  await db
    .insert(goalkeeperPositions)
    .values([
      { id: 42, name: "Moving" },
      { id: 43, name: "Prone" },
      { id: 44, name: "Set" },
      { id: 45, name: "Out" }, // In docs, not in data (rare)
    ])
    .onConflictDoNothing();

  await db
    .insert(goalkeeperTechniques)
    .values([
      { id: 45, name: "Diving" },
      { id: 46, name: "Standing" },
      { id: 67, name: "Diving" }, // In docs, not in data (duplicate)
      { id: 68, name: "Standing" }, // In docs, not in data (duplicate)
      { id: 69, name: "Stooping" }, // In docs, not in data (rare)
    ])
    .onConflictDoNothing();

  await db
    .insert(goalkeeperTypes)
    .values([
      { id: 25, name: "Collected" },
      { id: 26, name: "Goal Conceded" },
      { id: 27, name: "Keeper Sweeper" },
      { id: 28, name: "Penalty Conceded" },
      { id: 29, name: "Penalty Saved" },
      { id: 30, name: "Punch" },
      { id: 31, name: "Save" },
      { id: 32, name: "Shot Faced" },
      { id: 33, name: "Shot Saved" },
      { id: 34, name: "Smother" },
      { id: 109, name: "Penalty Saved to Post" },
      { id: 110, name: "Saved to Post" },
      { id: 113, name: "Shot Saved Off Target" },
      { id: 114, name: "Shot Saved to Post" },
    ])
    .onConflictDoNothing();

  await db
    .insert(goalkeeperOutcomes)
    .values([
      { id: 1, name: "Lost" },
      { id: 4, name: "Won" },
      { id: 13, name: "Lost In Play" },
      { id: 14, name: "Lost Out" },
      { id: 15, name: "Success" },
      { id: 16, name: "Success In Play" },
      { id: 17, name: "Success Out" },
      { id: 47, name: "Claim" },
      { id: 48, name: "Clear" },
      { id: 49, name: "Collected Twice" },
      { id: 50, name: "Fail" },
      { id: 51, name: "Lost In Play" }, // In docs, not in data (duplicate)
      { id: 52, name: "In Play Danger" },
      { id: 53, name: "In Play Safe" },
      { id: 55, name: "No Touch" },
      { id: 56, name: "Saved Twice" },
      { id: 58, name: "Touched In" },
      { id: 59, name: "Touched Out" },
      { id: 117, name: "Punched out" },
    ])
    .onConflictDoNothing();

  console.log("✅ Seeded goalkeeper lookups\n");

  // ============================================================================
  // OTHER EVENT-SPECIFIC OUTCOMES (extracted from data)
  // ============================================================================
  console.log("🎲 Seeding other event outcome lookups...");

  await db
    .insert(dribbleOutcomes)
    .values([
      { id: 8, name: "Complete" },
      { id: 9, name: "Incomplete" },
    ])
    .onConflictDoNothing();

  await db
    .insert(interceptionOutcomes)
    .values([
      { id: 4, name: "Won" },
      { id: 13, name: "Lost In Play" },
      { id: 14, name: "Lost Out" },
      { id: 16, name: "Success In Play" },
      { id: 17, name: "Success Out" },
    ])
    .onConflictDoNothing();

  await db
    .insert(ballReceiptOutcomes)
    .values([{ id: 9, name: "Incomplete" }])
    .onConflictDoNothing();

  await db
    .insert(fiftyFiftyOutcomes)
    .values([
      { id: 1, name: "Lost" },
      { id: 2, name: "Success To Opposition" },
      { id: 3, name: "Success To Team" },
      { id: 4, name: "Won" },
    ])
    .onConflictDoNothing();

  console.log("✅ Seeded other event outcome lookups\n");

  console.log("═".repeat(70));
  console.log("\n🎉 All event lookup tables seeded!\n");
}

seedEventLookups()
  .then(() => {
    console.log("✅ Seed completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
