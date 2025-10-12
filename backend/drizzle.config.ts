import type { Config } from "drizzle-kit";
import { env } from "./env.ts";

export default {
  schema: "./src/db/schema/**/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL!,
  },
} satisfies Config;
