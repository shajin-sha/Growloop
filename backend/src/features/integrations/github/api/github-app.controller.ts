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
      let installation = await installations.findLatest();
      let installationVerified = false;
      const installUrl = env.GITHUB_APP_SLUG
        ? `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`
        : null;
      const hasCredentials = Boolean(
        env.GITHUB_APP_ID && (env.GITHUB_APP_PRIVATE_KEY || env.GITHUB_APP_PRIVATE_KEY_PATH)
      );

      if (installation && hasCredentials) {
        const liveInstallation = await github.findInstallationDetails(installation.installationId);

        if (liveInstallation) {
          installationVerified = true;
        } else {
          logger.info("Removing stale GitHub App installation", {
            module: "github",
            installationId: installation.installationId,
            accountLogin: installation.accountLogin
          });

          await installations.deleteById(installation.installationId);
          installation = null;
        }
      }

      response.json({
        app: {
          configured: hasCredentials && installationVerified,
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

  router.post("/github/webhook", async (request, response, next) => {
    try {
      const event = request.header("x-github-event") ?? "unknown";
      const installationId = readInstallationId(request.body);

      logger.info("GitHub App webhook received", {
        module: "github",
        event,
        action: readAction(request.body),
        installationId
      });

      if (event === "installation" && readAction(request.body) === "deleted" && installationId) {
        await installations.deleteById(installationId);
      }

      response.status(202).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function readAction(body: unknown) {
  if (typeof body !== "object" || body === null || !("action" in body)) {
    return null;
  }

  const action = (body as { action?: unknown }).action;
  return typeof action === "string" ? action : null;
}

function readInstallationId(body: unknown) {
  if (typeof body !== "object" || body === null || !("installation" in body)) {
    return null;
  }

  const installation = (body as { installation?: unknown }).installation;

  if (typeof installation !== "object" || installation === null || !("id" in installation)) {
    return null;
  }

  const id = (installation as { id?: unknown }).id;
  return typeof id === "number" ? id : null;
}
