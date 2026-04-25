/**
 * Seed script — "Improve checkout completion" demo goal
 *
 * Inserts a goal with 4 experiments, control + patch variants,
 * and simulated pageview + conversion events using batch inserts.
 *
 * Usage:  npx tsx scripts/seed-demo.ts
 * Safe to re-run — deletes existing goal with the same title first.
 */

import "dotenv/config";

import { randomUUID } from "node:crypto";

import { pool } from "../src/db/pool";

const GOAL_TITLE = "Improve checkout completion";
const REPO = "growloop/web";
const CONVERSION_EVENT = "checkout_complete";

type ExperimentSeed = {
    name: string;
    description: string;
    prNumber: number;
    prBranch: string;
    visitors: number;
    patchRate: number;
    controlRate: number;
};

const EXPERIMENTS: ExperimentSeed[] = [
    {
        name: "Message clarity",
        description: "Tighten the primary message so visitors immediately understand how this supports checkout completion.",
        prNumber: 61,
        prBranch: "growloop/checkout-message-clarity",
        visitors: 1920,
        patchRate: 0.1297,
        controlRate: 0.108
    },
    {
        name: "Action path",
        description: "Reduce hesitation around the main action with a clearer next step and less competing friction.",
        prNumber: 62,
        prBranch: "growloop/checkout-action-path",
        visitors: 1855,
        patchRate: 0.1108,
        controlRate: 0.108
    },
    {
        name: "Trust proof",
        description: "Add or emphasize credibility cues near the decision point without changing the core flow.",
        prNumber: 63,
        prBranch: "growloop/checkout-trust-proof",
        visitors: 1810,
        patchRate: 0.1061,
        controlRate: 0.108
    },
    {
        name: "Activation nudge",
        description: "Introduce a lightweight prompt that moves qualified visitors toward the goal at the right moment.",
        prNumber: 64,
        prBranch: "growloop/checkout-activation-nudge",
        visitors: 1795,
        patchRate: 0.098,
        controlRate: 0.108
    }
];

/** Batch-insert events using unnest for speed */
async function seedEventsBatch(
    client: ReturnType<Awaited<ReturnType<typeof pool.connect>>>,
    experimentId: string,
    variantId: string,
    visitors: number,
    conversionRate: number,
    label: string
) {
    const conversions = Math.round(visitors * conversionRate);
    process.stdout.write(`    ${label}: ${visitors} pageviews, ${conversions} conversions\n`);

    const BATCH = 500;

    for (let offset = 0; offset < visitors; offset += BATCH) {
        const end = Math.min(offset + BATCH, visitors);
        const ids: string[] = [];
        const expIds: string[] = [];
        const varIds: string[] = [];
        const visitorIds: string[] = [];
        const eventNames: string[] = [];
        const urls: string[] = [];

        for (let i = offset; i < end; i++) {
            const vid = `demo-${variantId.slice(0, 8)}-${i}`;

            // pageview
            ids.push(randomUUID());
            expIds.push(experimentId);
            varIds.push(variantId);
            visitorIds.push(vid);
            eventNames.push("pageview");
            urls.push("https://example.com/checkout");

            // conversion
            if (i < conversions) {
                ids.push(randomUUID());
                expIds.push(experimentId);
                varIds.push(variantId);
                visitorIds.push(vid);
                eventNames.push(CONVERSION_EVENT);
                urls.push("https://example.com/checkout/success");
            }
        }

        await client.query(
            `insert into experiment_events (id, experiment_id, variant_id, visitor_id, event_name, url, metadata)
       select unnest($1::uuid[]), unnest($2::uuid[]), unnest($3::uuid[]),
              unnest($4::text[]), unnest($5::text[]), unnest($6::text[]), '{}'::jsonb`,
            [ids, expIds, varIds, visitorIds, eventNames, urls]
        );
    }
}

async function main() {
    const client = await pool.connect();

    try {
        await client.query("begin");

        // Clean up existing
        await client.query("delete from goals where title = $1", [GOAL_TITLE]);
        process.stdout.write(`Cleaned up existing "${GOAL_TITLE}" goal\n\n`);

        // Create goal
        const goalId = randomUUID();
        await client.query(
            `insert into goals (id, title, repo_full_name, conversion_event, status)
       values ($1, $2, $3, $4, 'running')`,
            [goalId, GOAL_TITLE, REPO, CONVERSION_EVENT]
        );
        process.stdout.write(`Created goal: ${GOAL_TITLE}\n\n`);

        for (const exp of EXPERIMENTS) {
            const experimentId = randomUUID();
            const controlVariantId = randomUUID();
            const patchVariantId = randomUUID();

            await client.query(
                `insert into experiments (id, goal_id, name, description, repo_full_name, conversion_event, status, traffic_weight)
         values ($1, $2, $3, $4, $5, $6, 'running', 1)`,
                [experimentId, goalId, exp.name, exp.description, REPO, CONVERSION_EVENT]
            );

            await client.query(
                `insert into experiment_variants (id, experiment_id, name, weight, status)
         values ($1, $2, 'Control', 1, 'active')`,
                [controlVariantId, experimentId]
            );

            await client.query(
                `insert into experiment_variants (id, experiment_id, name, weight, status, branch_name, pull_request_number, pull_request_url)
         values ($1, $2, 'Patch', 1, 'active', $3, $4, $5)`,
                [patchVariantId, experimentId, exp.prBranch, exp.prNumber, `https://github.com/${REPO}/pull/${exp.prNumber}`]
            );

            process.stdout.write(`  ${exp.name}\n`);
            await seedEventsBatch(client, experimentId, controlVariantId, exp.visitors, exp.controlRate, "Control");
            await seedEventsBatch(client, experimentId, patchVariantId, exp.visitors, exp.patchRate, "Patch  ");
            process.stdout.write("\n");
        }

        await client.query("commit");
        process.stdout.write("✓ Seed complete. Refresh the dashboard.\n");
    } catch (error) {
        await client.query("rollback");
        throw error;
    } finally {
        client.release();
    }
}

main()
    .catch((error: unknown) => {
        process.stderr.write(error instanceof Error ? `${error.stack ?? error.message}\n` : `${String(error)}\n`);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
