import type { ExperimentMetric, WinnerResult } from "../types/experiment.types";

const MIN_VISITORS_PER_VARIANT = 25;
const MIN_LIFT = 0.05;

export class WinnerDetectionService {
  evaluate(metrics: ExperimentMetric[]): WinnerResult {
    const eligible = metrics.filter((metric) => metric.visitors >= MIN_VISITORS_PER_VARIANT);

    if (eligible.length < 2) {
      return {
        winnerVariantId: null,
        confidence: 0,
        reason: "Not enough visitors yet"
      };
    }

    const [winner, runnerUp] = [...eligible].sort(
      (left, right) => right.conversionRate - left.conversionRate
    );

    if (!winner || !runnerUp) {
      return {
        winnerVariantId: null,
        confidence: 0,
        reason: "No comparable variants"
      };
    }

    const lift = winner.conversionRate - runnerUp.conversionRate;

    if (lift < MIN_LIFT) {
      return {
        winnerVariantId: null,
        confidence: lift,
        reason: "Lift is below decision threshold"
      };
    }

    return {
      winnerVariantId: winner.variantId,
      confidence: lift,
      reason: `Winner selected with ${(lift * 100).toFixed(1)}% absolute lift`
    };
  }
}
