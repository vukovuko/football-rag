import { sql } from "drizzle-orm";
import { db } from "../db/index.ts";

/**
 * PLAYER STATS AGGREGATION
 *
 * This script aggregates player statistics from various tables:
 * - total_matches: COUNT(DISTINCT match_id) from player_lineups
 * - total_goals: COUNT from shots WHERE outcome_name = 'Goal'
 * - total_assists: COUNT from pass_subtypes WHERE pass_goal_assist = true
 *
 * Run this AFTER all ETL processes complete.
 */

export async function aggregatePlayerStats() {
  console.log("🔢 Starting player stats aggregation...\n");

  try {
    // Update total_matches from player_lineups
    console.log("   Calculating total_matches...");
    await db.execute(sql`
      UPDATE players p
      SET total_matches = subquery.match_count
      FROM (
        SELECT 
          player_id,
          COUNT(DISTINCT match_id) as match_count
        FROM player_lineups
        GROUP BY player_id
      ) subquery
      WHERE p.player_id = subquery.player_id
    `);
    console.log("   ✓ Updated total_matches\n");

    // Update total_goals from shots table
    console.log("   Calculating total_goals...");
    await db.execute(sql`
      UPDATE players p
      SET total_goals = COALESCE(subquery.goal_count, 0)
      FROM (
        SELECT 
          e.player_id,
          COUNT(*) as goal_count
        FROM events e
        JOIN shots s ON e.id = s.event_id
        JOIN shot_outcomes so ON s.outcome_id = so.id
        WHERE so.name = 'Goal'
        GROUP BY e.player_id
      ) subquery
      WHERE p.player_id = subquery.player_id
    `);
    console.log("   ✓ Updated total_goals\n");

    // Update total_assists from passes table
    console.log("   Calculating total_assists...");
    await db.execute(sql`
      UPDATE players p
      SET total_assists = COALESCE(subquery.assist_count, 0)
      FROM (
        SELECT 
          e.player_id,
          COUNT(*) as assist_count
        FROM events e
        JOIN passes ps ON e.id = ps.event_id
        WHERE ps.goal_assist = true
        GROUP BY e.player_id
      ) subquery
      WHERE p.player_id = subquery.player_id
    `);
    console.log("   ✓ Updated total_assists\n");

    // Update total_yellow_cards from player_cards
    console.log("   Calculating total_yellow_cards...");
    await db.execute(sql`
      UPDATE players p
      SET total_yellow_cards = COALESCE(subquery.yellow_count, 0)
      FROM (
        SELECT 
          player_id,
          COUNT(*) as yellow_count
        FROM player_cards
        WHERE card_type = 'Yellow Card'
        GROUP BY player_id
      ) subquery
      WHERE p.player_id = subquery.player_id
    `);
    console.log("   ✓ Updated total_yellow_cards\n");

    // Update total_red_cards from player_cards
    console.log("   Calculating total_red_cards...");
    await db.execute(sql`
      UPDATE players p
      SET total_red_cards = COALESCE(subquery.red_count, 0)
      FROM (
        SELECT 
          player_id,
          COUNT(*) as red_count
        FROM player_cards
        WHERE card_type IN ('Red Card', 'Second Yellow')
        GROUP BY player_id
      ) subquery
      WHERE p.player_id = subquery.player_id
    `);
    console.log("   ✓ Updated total_red_cards\n");

    // Update total_minutes_played from player_lineups
    console.log("   Calculating total_minutes_played...");
    await db.execute(sql`
      UPDATE players p
      SET total_minutes_played = COALESCE(subquery.total_minutes, 0)
      FROM (
        SELECT 
          player_id,
          SUM(minutes_played) as total_minutes
        FROM player_lineups
        GROUP BY player_id
      ) subquery
      WHERE p.player_id = subquery.player_id
    `);
    console.log("   ✓ Updated total_minutes_played\n");

    // Get summary stats
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_players,
        SUM(CASE WHEN total_matches > 0 THEN 1 ELSE 0 END) as players_with_matches,
        SUM(CASE WHEN total_goals > 0 THEN 1 ELSE 0 END) as players_with_goals,
        SUM(CASE WHEN total_assists > 0 THEN 1 ELSE 0 END) as players_with_assists,
        MAX(total_matches) as max_matches,
        MAX(total_goals) as max_goals,
        MAX(total_assists) as max_assists,
        MAX(total_yellow_cards) as max_yellows,
        MAX(total_red_cards) as max_reds,
        MAX(total_minutes_played) as max_minutes
      FROM players
    `);

    console.log("═".repeat(70));
    console.log("\n📊 Aggregation Summary:\n");
    console.log(`   Total players: ${stats.rows[0].total_players}`);
    console.log(
      `   Players with matches: ${stats.rows[0].players_with_matches}`
    );
    console.log(`   Players with goals: ${stats.rows[0].players_with_goals}`);
    console.log(
      `   Players with assists: ${stats.rows[0].players_with_assists}`
    );
    console.log(`   Max matches: ${stats.rows[0].max_matches}`);
    console.log(`   Max goals: ${stats.rows[0].max_goals}`);
    console.log(`   Max assists: ${stats.rows[0].max_assists}`);
    console.log(`   Max yellow cards: ${stats.rows[0].max_yellows}`);
    console.log(`   Max red cards: ${stats.rows[0].max_reds}`);
    console.log(`   Max minutes played: ${stats.rows[0].max_minutes}\n`);

    console.log("✅ Player stats aggregation complete!\n");
  } catch (error) {
    console.error("❌ Error aggregating player stats:", error);
    throw error;
  }
}

// Run if executed directly
const isMainModule =
  (process.argv[1] && process.argv[1].endsWith("aggregate-player-stats.ts")) ||
  (process.argv[1] && process.argv[1].endsWith("aggregate-player-stats.js"));

if (isMainModule) {
  aggregatePlayerStats()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
