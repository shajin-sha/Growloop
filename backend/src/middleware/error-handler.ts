import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { logger } from "../logger";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: "Invalid request", details: error.flatten() });
    return;
  }

  logger.error("Unhandled request error", {
    module: "http",
    error: error instanceof Error ? error.message : "Unknown error"
  });

  response.status(500).json({ error: "Internal server error" });
};
