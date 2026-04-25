import { Router } from "express";
import { z } from "zod";

import type { ExperimentService } from "../services/experiment.service";
import { getGenerationStatus } from "../services/generation-status";

const createExperimentSchema = z.object({
  goalId: z.string().uuid().nullable().optional(),
  name: z.string().min(2),
  repoFullName: z.string().regex(/^[^/]+\/[^/]+$/),
  conversionEvent: z.string().min(1),
  trafficWeight: z.number().int().positive().optional(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        weight: z.number().int().positive()
      })
    )
    .min(2)
});

const createGoalSchema = z.object({
  title: z.string().min(2),
  repoFullName: z.string().regex(/^[^/]+\/[^/]+$/).optional(),
  conversionEvent: z.string().min(1).optional(),
  experimentCount: z.number().int().min(1).max(4).optional()
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

  router.get("/goals", async (_request, response, next) => {
    try {
      response.json({ goals: await service.listGoals() });
    } catch (error) {
      next(error);
    }
  });

  router.post("/goals", async (request, response, next) => {
    try {
      const input = createGoalSchema.parse(request.body);
      response.status(201).json({ goal: await service.createGoal(input) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/goals/:id", async (request, response, next) => {
    try {
      const goal = await service.getGoal(request.params.id);

      if (!goal) {
        response.status(404).json({ error: "Goal not found" });
        return;
      }

      response.json({ goal });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/goals/:id", async (request, response, next) => {
    try {
      const deleted = await service.deleteGoal(request.params.id);

      if (!deleted) {
        response.status(404).json({ error: "Goal not found" });
        return;
      }

      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.get("/goals/:id/generation-status", (request, response) => {
    const status = getGenerationStatus(request.params.id);
    response.json({ status });
  });

  router.patch("/goals/:id/status", async (request, response, next) => {
    try {
      const input = statusSchema.parse(request.body);
      const goal = await service.updateGoalStatus(request.params.id, input.status);

      if (!goal) {
        response.status(404).json({ error: "Goal not found" });
        return;
      }

      response.json({ goal });
    } catch (error) {
      next(error);
    }
  });

  router.post("/goals/:id/resolve", async (request, response, next) => {
    try {
      const input = request.body as { experiments: Array<{ id: string; action: string }> };
      if (!Array.isArray(input.experiments)) {
        response.status(400).json({ error: "experiments array is required" });
        return;
      }
      const result = await service.resolveGoal(request.params.id, {
        experiments: input.experiments.map((e) => ({
          id: e.id,
          action: e.action as "keep" | "stop" | "kill"
        }))
      });
      response.json({ result });
    } catch (error) {
      next(error);
    }
  });

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

  router.get("/sdk/goals/:id", async (request, response, next) => {
    try {
      const goal = await service.getGoalSdkConfig(request.params.id);

      if (!goal) {
        response.status(404).json({ error: "Goal not found" });
        return;
      }

      response.json({ goal });
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
