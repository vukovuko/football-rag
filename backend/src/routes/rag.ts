import { Router } from "express";
import { streamText, tool, convertToModelMessages, stepCountIs } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { db } from "../db/index.ts";
import { sql } from "drizzle-orm";
import { getSchemaContext } from "../services/schema-cache.ts";
import { env } from "../../env.ts";

const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const router = Router();

const MAX_QUERY_TIME_MS = 30000; // 30 seconds
const MAX_ROWS_RETURNED = 1000;

const DANGEROUS_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "TRUNCATE",
  "ALTER",
  "CREATE",
  "GRANT",
  "REVOKE",
  "EXECUTE",
  "EXEC",
  "CALL",
  "INTO",
  "COPY",
  "VACUUM",
  "SET",
  "LOCK",
];

function validateSQL(query: string): { valid: boolean; error?: string } {
  const upperQuery = query.trim().toUpperCase();

  if (!upperQuery.startsWith("SELECT") && !upperQuery.startsWith("WITH")) {
    return {
      valid: false,
      error: "Only SELECT queries are allowed",
    };
  }

  for (const keyword of DANGEROUS_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(query)) {
      return {
        valid: false,
        error: `${keyword} operations are not allowed`,
      };
    }
  }

  const statements = query.split(";").filter((s) => s.trim());
  if (statements.length > 1) {
    return {
      valid: false,
      error: "Multiple statements are not allowed",
    };
  }

  return { valid: true };
}

async function executeSQL(query: string): Promise<any[]> {
  const validation = validateSQL(query);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    await db.execute(sql`BEGIN TRANSACTION READ ONLY`);
    await db.execute(
      sql.raw(`SET LOCAL statement_timeout = ${MAX_QUERY_TIME_MS}`)
    );

    // Remove trailing semicolon if present
    let cleanQuery = query.trim();
    if (cleanQuery.endsWith(";")) {
      cleanQuery = cleanQuery.slice(0, -1).trim();
    }

    // Only add LIMIT if query doesn't already have one
    const hasLimit = /\bLIMIT\b/i.test(cleanQuery);
    const finalQuery = hasLimit
      ? cleanQuery
      : `${cleanQuery} LIMIT ${MAX_ROWS_RETURNED}`;

    const result = await db.execute(sql.raw(finalQuery));

    await db.execute(sql`COMMIT`);

    return result.rows;
  } catch (error) {
    try {
      await db.execute(sql`ROLLBACK`);
    } catch {
      // Ignore rollback errors
    }
    throw error;
  }
}

router.post("/chat", async (req, res) => {
  try {
    console.log("📨 Received chat request");
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: "Messages array is required",
      });
    }

    console.log(`💬 Processing ${messages.length} messages`);
    const schemaContext = await getSchemaContext();
    console.log("✅ Schema context loaded");

    const systemPrompt = `You are a football statistics analyst with access to a StatsBomb PostgreSQL database.

CRITICAL RULES:
1. When the user asks a question, you MUST:
   a) Generate a valid PostgreSQL SELECT query
   b) Execute it to get the data
   c) Return ONLY a natural language answer based on the results
2. NEVER show SQL queries to the user
3. NEVER show raw data or technical details
4. Be conversational, helpful, and concise
5. If the query returns no results, say so naturally
6. If you encounter an error, explain it in simple terms

IMPORTANT SQL GUIDELINES:
- Always use proper JOIN syntax
- Always add LIMIT clause (max 1000 rows)
- Use aggregate functions (COUNT, SUM, AVG) for statistics
- Reference foreign keys correctly when joining tables
- Use ILIKE for case-insensitive text searches
- Handle NULL values with COALESCE or IS NOT NULL checks
- CRITICAL: The events table has 3.4M rows - queries on it are SLOW. Avoid complex joins on events table unless absolutely necessary.
- For pass completion rate or event-level stats, add WHERE clauses to filter specific matches or players FIRST before aggregating
- When querying events, ALWAYS filter by match_id or player_id first to reduce rows

${schemaContext}

KEY TABLES OVERVIEW:
- players: Player stats (player_name, total_goals, total_assists, total_matches, total_minutes_played) - NO birth dates or age
- teams: Team information (team_name, team_gender, country)
- matches: Match results (match_date, home_team, away_team, home_score, away_score, competition, season)
- competitions: Competition names and metadata (competition_name, country, gender)
- events: Individual match events (passes, shots, tackles, etc.) - 3.4M rows - use sparingly
- shots: Shot-specific data with xG values
- passes: Pass-specific data with completion info

IMPORTANT DATA LIMITATIONS:
- NO player birth dates or ages available
- NO player heights, weights, or physical attributes
- NO transfer fees or salaries
- Focus on match statistics, goals, assists, and game events

EXAMPLE INTERACTIONS:

User: "Who scored the most goals?"
You: "Based on the data, Lionel Messi leads with 23 goals, followed by Cristiano Ronaldo with 18 goals and Robert Lewandowski with 15 goals."

User: "Show me La Liga top scorers"
You: "In La Liga, the top scorers are Lionel Messi with 16 goals, Luis Suárez with 14 goals, and Karim Benzema with 12 goals."

User: "What was the highest scoring match?"
You: "The highest scoring match was between Barcelona and Real Madrid, ending 5-4 in favor of Barcelona on March 15, 2019."

Remember: Generate SQL, execute it, return natural language answer. Never expose technical details to the user.`;

    console.log("🤖 Calling Google Gemini API...");
    const result = await streamText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      temperature: 0.3,
      stopWhen: stepCountIs(5),
      tools: {
        executeQuery: tool({
          description:
            "Execute a SELECT query on the PostgreSQL database to retrieve football statistics data",
          inputSchema: z.object({
            query: z
              .string()
              .describe(
                "A valid PostgreSQL SELECT query to execute. Must be read-only."
              ),
          }),
          execute: async ({ query }) => {
            console.log(
              "🔧 Tool called with query:",
              query.substring(0, 100) + "..."
            );
            try {
              const rows = await executeSQL(query);
              console.log(`✅ Query returned ${rows.length} rows`);
              return {
                success: true,
                rowCount: rows.length,
                data: rows,
              };
            } catch (error) {
              console.error("❌ Query failed:", error);
              return {
                success: false,
                error: error instanceof Error ? error.message : "Query failed",
              };
            }
          },
        }),
      },
    });

    console.log("📤 Streaming response to client...");

    // Convert the Web API Response to an Express-compatible response
    const webResponse = result.toUIMessageStreamResponse();

    // Set headers from the Web API Response
    webResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Stream the body
    if (webResponse.body) {
      const reader = webResponse.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }

    res.end();
  } catch (error) {
    console.error("RAG chat error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process chat request",
    });
  }
});

export { router as ragRouter };
