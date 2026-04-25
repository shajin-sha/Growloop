import { Router } from "express";
import { z } from "zod";

import { env } from "../../../../config/env";
import { logger } from "../../../../logger";
import type { GitHubAppClient } from "../github-app-client";
import type { GitHubInstallationRepository } from "../repositories/github-installation.repository";

const installationSchema = z.object({
  installationId: z.number().int().positive(),
  setupAction: z.string().optional()
});

export function createGitHubAppRouter(
  github: GitHubAppClient,
  installations: GitHubInstallationRepository
) {
  const router = Router();

  router.get("/github/app", async (_request, response, next) => {
    try {
      const installation = await installations.findLatest();
      const installUrl = env.GITHUB_APP_SLUG
        ? `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`
        : null;

      response.json({
        app: {
          configured: Boolean(
            env.GITHUB_APP_ID &&
              installation &&
              (env.GITHUB_APP_PRIVATE_KEY || env.GITHUB_APP_PRIVATE_KEY_PATH)
          ),
          installUrl,
          installation,
          slug: env.GITHUB_APP_SLUG ?? null
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/github/callback", (request, response) => {
    logger.info("GitHub App callback received", {
      module: "github",
      installationId: request.query.installation_id ?? null,
      setupAction: request.query.setup_action ?? null
    });

    response.json({ ok: true });
  });

  router.post("/github/installations", async (request, response, next) => {
    try {
      const input = installationSchema.parse(request.body);
      const details = await github.getInstallationDetails(input.installationId);
      const installation = await installations.upsert({
        installationId: details.installationId,
        accountLogin: details.accountLogin,
        targetType: details.targetType,
        setupAction: input.setupAction ?? null
      });

      logger.info("GitHub App installation connected", {
        module: "github",
        installationId: installation.installationId,
        accountLogin: installation.accountLogin
      });

      response.status(201).json({ installation });
    } catch (error) {
      next(error);
    }
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
