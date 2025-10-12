import { env as loadEnv } from "custom-env";
import { z } from "zod";

process.env.APP_STAGE = process.env.APP_STAGE || "dev";

const isProduction = process.env.APP_STAGE === "production";
const isDevelopment = process.env.APP_STAGE === "dev";
const isTest = process.env.APP_STAGE === "test";

// Load .env file
if (isDevelopment) {
  loadEnv();
} else if (isTest) {
  loadEnv("test");
}

// Define the schema with environment-specific requirements
const envSchema = z.object({
  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  APP_STAGE: z.enum(["dev", "production", "test"]).default("dev"),

  DATA_PATH: z.string().default("./football-open/data"),

  // Server
  PORT: z.coerce.number().positive().default(3000),
  HOST: z.string().default("localhost"),

  // Database
  DATABASE_URL: z.string().startsWith("postgresql://"),

  // CORS
  CORS_ORIGIN: z
    .string()
    .or(z.array(z.string()))
    .transform((val) => {
      if (typeof val === "string") {
        return val.split(",").map((origin) => origin.trim());
      }
      return val;
    })
    .default([]),

  // Logging
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "debug", "trace"])
    .default(isProduction ? "info" : "debug"),
});

// Parse and validate environment variables
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");

  console.error(z.prettifyError(parsed.error));

  process.exit(1);
}

const env = parsed.data;

// Type for the validated environment
export type Env = z.infer<typeof envSchema>;

// Helper functions for environment checks
export const isProd = () => env.NODE_ENV === "production";
export const isDev = () => env.NODE_ENV === "development";
export const isTestEnv = () => env.NODE_ENV === "test";

// Export the validated environment object
export { env };

// Default export for convenience
export default env;
