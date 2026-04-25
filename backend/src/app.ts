import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { pool } from "./db/pool";
import { createExperimentsRouter } from "./features/experiments/api/experiments.controller";
import { PostgresExperimentRepository } from "./features/experiments/repositories/postgres-experiment.repository";
import { ExperimentService } from "./features/experiments/services/experiment.service";
import { WinnerDetectionService } from "./features/experiments/services/winner-detection.service";
import { E2BCodexVariantGenerator } from "./features/integrations/e2b-codex/e2b-codex-generator";
import { createGitHubAppRouter } from "./features/integrations/github/api/github-app.controller";
import { GitHubAppClient } from "./features/integrations/github/github-app-client";
import { errorHandler } from "./middleware/error-handler";

export function createApp() {
  const app = express();
  const repository = new PostgresExperimentRepository(pool);
  const winnerDetection = new WinnerDetectionService();
  const github = new GitHubAppClient();
  const generator = new E2BCodexVariantGenerator();
  const service = new ExperimentService(repository, winnerDetection, github, generator);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.use("/api", createExperimentsRouter(service));
  app.use("/api", createGitHubAppRouter());
  app.use(errorHandler);

  return app;
}
