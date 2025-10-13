import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env, isDev, isTestEnv } from "../env.ts";
import { playersRouter } from "./routes/players.ts";
import { teamsRouter } from "./routes/teams.ts";
import { playgroundRouter } from "./routes/playground.ts";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan("dev", {
    skip: () => isTestEnv(),
  })
);

// API Routes (all under /api prefix)
const apiRouter = express.Router();

// Health check endpoint
apiRouter.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Football DB API",
  });
});

// Resource routes
apiRouter.use("/players", playersRouter);
apiRouter.use("/teams", teamsRouter);
apiRouter.use("/playground", playgroundRouter);

// Mount all API routes under /api
app.use("/api", apiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({
      error: "Something went wrong!",
      ...(isDev() && { details: err.message }),
    });
  }
);

export { app };

export default app;
