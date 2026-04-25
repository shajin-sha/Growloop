import { Router } from "express";

import { env } from "../../../../config/env";
import { logger } from "../../../../logger";

export function createGitHubAppRouter() {
  const router = Router();

  router.get("/github/app", (_request, response) => {
    const installUrl = env.GITHUB_APP_SLUG
      ? `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`
      : null;

    response.json({
      app: {
        configured: Boolean(
          env.GITHUB_APP_ID &&
            env.GITHUB_APP_INSTALLATION_ID &&
            (env.GITHUB_APP_PRIVATE_KEY || env.GITHUB_APP_PRIVATE_KEY_PATH)
        ),
        installUrl,
        slug: env.GITHUB_APP_SLUG ?? null
      }
    });
  });

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
