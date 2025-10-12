import { db } from "./index.ts";
import { positions } from "./index.ts";

/**
 * Seed positions table with StatsBomb's 25 standardized positions
 *
 * Source: starting_over/04_LINEUPS_02_PLAYER_FIELDS.md (lines 351-378)
 */

const positionsData = [
  { id: 1, name: "Goalkeeper", category: "Goalkeeper", order: 1 },
  { id: 2, name: "Right Back", category: "Defender", order: 2 },
  { id: 3, name: "Right Center Back", category: "Defender", order: 3 },
  { id: 4, name: "Center Back", category: "Defender", order: 4 },
  { id: 5, name: "Left Center Back", category: "Defender", order: 5 },
  { id: 6, name: "Left Back", category: "Defender", order: 6 },
  { id: 7, name: "Right Wing Back", category: "Defender", order: 7 },
  { id: 8, name: "Left Wing Back", category: "Defender", order: 8 },
  { id: 9, name: "Right Defensive Midfield", category: "Midfielder", order: 9 },
  {
    id: 10,
    name: "Center Defensive Midfield",
    category: "Midfielder",
    order: 10,
  },
  {
    id: 11,
    name: "Left Defensive Midfield",
    category: "Midfielder",
    order: 11,
  },
  { id: 12, name: "Right Midfield", category: "Midfielder", order: 12 },
  { id: 13, name: "Right Center Midfield", category: "Midfielder", order: 13 },
  { id: 14, name: "Center Midfield", category: "Midfielder", order: 14 },
  { id: 15, name: "Left Center Midfield", category: "Midfielder", order: 15 },
  { id: 16, name: "Left Midfield", category: "Midfielder", order: 16 },
  { id: 17, name: "Right Wing", category: "Forward", order: 17 },
  {
    id: 18,
    name: "Right Attacking Midfield",
    category: "Midfielder",
    order: 18,
  },
  {
    id: 19,
    name: "Center Attacking Midfield",
    category: "Midfielder",
    order: 19,
  },
  {
    id: 20,
    name: "Left Attacking Midfield",
    category: "Midfielder",
    order: 20,
  },
  { id: 21, name: "Left Wing", category: "Forward", order: 21 },
  { id: 22, name: "Right Center Forward", category: "Forward", order: 22 },
  { id: 23, name: "Center Forward", category: "Forward", order: 23 },
  { id: 24, name: "Left Center Forward", category: "Forward", order: 24 },
  { id: 25, name: "Secondary Striker", category: "Forward", order: 25 },
] as const;

async function seedPositions() {
  console.log("🌱 Seeding positions table...\n");

  for (const pos of positionsData) {
    await db
      .insert(positions)
      .values({
        id: pos.id,
        positionName: pos.name,
        positionCategory: pos.category,
        displayOrder: pos.order,
      })
      .onConflictDoNothing();
  }

  console.log(`✅ Seeded ${positionsData.length} positions\n`);

  // Verify
  const count = await db.select().from(positions);
  console.log(`📊 Total positions in database: ${count.length}\n`);

  process.exit(0);
}

seedPositions().catch((err) => {
  console.error("❌ Error seeding positions:", err);
  process.exit(1);
});
