import { Router } from "express";
import { z } from "zod";

import type { ExperimentService } from "../services/experiment.service";

const createExperimentSchema = z.object({
  name: z.string().min(2),
  repoFullName: z.string().regex(/^[^/]+\/[^/]+$/),
  conversionEvent: z.string().min(1),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        weight: z.number().int().positive()
      })
    )
    .min(2)
});

const statusSchema = z.object({
  status: z.enum(["draft", "running", "paused", "completed", "killed"])
});

const eventSchema = z.object({
  experimentId: z.string().uuid(),
  variantId: z.string().uuid(),
  visitorId: z.string().min(1),
  eventName: z.string().min(1),
  url: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

const generateSchema = z.object({
  goal: z.string().min(5),
  allowList: z.array(z.string()).default([])
});

export function createExperimentsRouter(service: ExperimentService) {
  const router = Router();

  router.get("/experiments", async (_request, response, next) => {
    try {
      response.json({ experiments: await service.list() });
    } catch (error) {
      next(error);
    }
  });

  router.post("/experiments", async (request, response, next) => {
    try {
      const input = createExperimentSchema.parse(request.body);
      response.status(201).json({ experiment: await service.create(input) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/experiments/:id", async (request, response, next) => {
    try {
      const experiment = await service.get(request.params.id);

      if (!experiment) {
        response.status(404).json({ error: "Experiment not found" });
        return;
      }

      response.json({ experiment });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/experiments/:id/status", async (request, response, next) => {
    try {
      const input = statusSchema.parse(request.body);
      const experiment = await service.updateStatus(request.params.id, input.status);

      if (!experiment) {
        response.status(404).json({ error: "Experiment not found" });
        return;
      }

      response.json({ experiment });
    } catch (error) {
      next(error);
    }
  });

  router.post("/experiments/:id/evaluate", async (request, response, next) => {
    try {
      response.json({ result: await service.evaluate(request.params.id) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/experiments/:id/generate", async (request, response, next) => {
    try {
      const input = generateSchema.parse(request.body);
      const experiment = await service.generatePullRequests(
        request.params.id,
        input.goal,
        input.allowList
      );

      response.json({ experiment });
    } catch (error) {
      next(error);
    }
  });

  router.get("/experiments/:id/pull-requests", async (request, response, next) => {
    try {
      response.json({ pullRequests: await service.getPullRequestStatuses(request.params.id) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/experiments/:id/pull-requests/close-losers", async (request, response, next) => {
    try {
      response.json({ experiment: await service.closeLosingPullRequests(request.params.id) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/sdk/experiments/:id", async (request, response, next) => {
    try {
      const experiment = await service.getSdkConfig(request.params.id);

      if (!experiment) {
        response.status(404).json({ error: "Experiment not found" });
        return;
      }

      response.json({ experiment });
    } catch (error) {
      next(error);
    }
  });

  router.post("/events", async (request, response, next) => {
    try {
      await service.track(eventSchema.parse(request.body));
      response.status(202).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
