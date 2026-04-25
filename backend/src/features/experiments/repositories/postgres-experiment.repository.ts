import { randomUUID } from "node:crypto";

import type { DbPool } from "../../../db/pool";
import type {
  CreateExperimentInput,
  Experiment,
  ExperimentMetric,
  ExperimentVariant,
  ExperimentStatus,
  SdkExperimentConfig,
  TrackEventPayload,
  VariantStatus
} from "../types/experiment.types";
import type { ExperimentRepository } from "./experiment.repository";
import { mapExperiment, mapVariant } from "./postgres-experiment.mapper";

export class PostgresExperimentRepository implements ExperimentRepository {
  constructor(private readonly db: DbPool) {}

  async create(input: CreateExperimentInput): Promise<Experiment> {
    const client = await this.db.connect();

    try {
      await client.query("begin");
      const experimentId = randomUUID();
      const experiment = await client.query(
        `insert into experiments (id, name, repo_full_name, conversion_event, status)
         values ($1, $2, $3, $4, 'draft')
         returning *`,
        [experimentId, input.name, input.repoFullName, input.conversionEvent]
      );

      for (const variant of input.variants) {
        await client.query(
          `insert into experiment_variants (id, experiment_id, name, weight)
           values ($1, $2, $3, $4)`,
          [randomUUID(), experiment.rows[0].id, variant.name, variant.weight]
        );
      }

      await client.query("commit");
      const created = await this.findById(experiment.rows[0].id);

      if (!created) {
        throw new Error("Created experiment could not be loaded");
      }

      return created;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async findAll(): Promise<Experiment[]> {
    const experiments = await this.db.query("select * from experiments order by created_at desc");
    const variants = await this.db.query("select * from experiment_variants order by created_at asc");
    const variantsByExperiment = new Map<string, ExperimentVariant[]>();

    for (const row of variants.rows) {
      const items = variantsByExperiment.get(row.experiment_id) ?? [];
      items.push(mapVariant(row));
      variantsByExperiment.set(row.experiment_id, items);
    }

    return experiments.rows.map((row) => mapExperiment(row, variantsByExperiment.get(row.id) ?? []));
  }

  async findById(id: string): Promise<Experiment | null> {
    const experiment = await this.db.query("select * from experiments where id = $1", [id]);

    if (experiment.rowCount === 0) {
      return null;
    }

    const variants = await this.db.query(
      "select * from experiment_variants where experiment_id = $1 order by created_at asc",
      [id]
    );

    return mapExperiment(experiment.rows[0], variants.rows.map(mapVariant));
  }

  async findSdkConfig(id: string): Promise<SdkExperimentConfig | null> {
    const experiment = await this.findById(id);

    if (!experiment) {
      return null;
    }

    return {
      id: experiment.id,
      conversionEvent: experiment.conversionEvent,
      status: experiment.status,
      variants: experiment.variants
        .filter((variant) => variant.status === "active")
        .map((variant) => ({ id: variant.id, name: variant.name, weight: variant.weight }))
    };
  }

  async recordEvent(input: TrackEventPayload): Promise<void> {
    await this.db.query(
      `insert into experiment_events (id, experiment_id, variant_id, visitor_id, event_name, url, metadata)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        randomUUID(),
        input.experimentId,
        input.variantId,
        input.visitorId,
        input.eventName,
        input.url ?? null,
        JSON.stringify(input.metadata ?? {})
      ]
    );
  }

  async getMetrics(experimentId: string, conversionEvent: string): Promise<ExperimentMetric[]> {
    const result = await this.db.query(
      `select
         v.id as variant_id,
         count(distinct e.visitor_id) filter (where e.event_name = 'pageview') as visitors,
         count(distinct e.visitor_id) filter (where e.event_name = $2) as conversions
       from experiment_variants v
       left join experiment_events e on e.variant_id = v.id
       where v.experiment_id = $1
       group by v.id
       order by v.created_at asc`,
      [experimentId, conversionEvent]
    );

    return result.rows.map((row) => {
      const visitors = Number(row.visitors);
      const conversions = Number(row.conversions);

      return {
        variantId: row.variant_id,
        visitors,
        conversions,
        conversionRate: visitors === 0 ? 0 : conversions / visitors
      };
    });
  }

  async updateStatus(id: string, status: ExperimentStatus): Promise<Experiment | null> {
    await this.db.query("update experiments set status = $2, updated_at = now() where id = $1", [
      id,
      status
    ]);
    return this.findById(id);
  }

  async markWinner(experimentId: string, winnerVariantId: string): Promise<Experiment | null> {
    await this.db.query(
      `update experiments
       set winner_variant_id = $2, status = 'completed', updated_at = now()
       where id = $1`,
      [experimentId, winnerVariantId]
    );
    await this.updateVariantStatus(winnerVariantId, "winner");
    return this.findById(experimentId);
  }

  async updateVariantStatus(id: string, status: VariantStatus): Promise<void> {
    await this.db.query("update experiment_variants set status = $2 where id = $1", [id, status]);
  }

  async attachPullRequest(
    variantId: string,
    branchName: string,
    pullRequestNumber: number,
    pullRequestUrl: string
  ): Promise<void> {
    await this.db.query(
      `update experiment_variants
       set branch_name = $2, pull_request_number = $3, pull_request_url = $4
       where id = $1`,
      [variantId, branchName, pullRequestNumber, pullRequestUrl]
    );
  }
}
