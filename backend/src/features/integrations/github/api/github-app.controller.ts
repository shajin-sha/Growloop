import { Router } from "express";

import { logger } from "../../../../logger";

export function createGitHubAppRouter() {
  const router = Router();

  router.get("/github/callback", (request, response) => {
    logger.info("GitHub App callback received", {
      module: "github",
      installationId: request.query.installation_id ?? null,
      setupAction: request.query.setup_action ?? null
    });

    response.json({ ok: true });
  });

  router.post("/github/webhook", (request, response) => {
    logger.info("GitHub App webhook received", {
      module: "github",
      event: request.header("x-github-event") ?? "unknown"
    });

    response.status(202).json({ ok: true });
  });

  return router;
}
