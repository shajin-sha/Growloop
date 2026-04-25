/**
 * SDK Smoke Test
 *
 * Simulates the full SDK flow end-to-end:
 * 1. Fetches goal SDK config (like the SDK does on init)
 * 2. Picks an experiment + variant (like the SDK's bucketing)
 * 3. Sends pageview events for simulated visitors
 * 4. Sends conversion events for a subset of visitors
 * 5. Verifies events are stored in the DB
 * 6. Calls the evaluate endpoint and checks metrics
 *
 * Usage:
 *   GOAL_ID=<uuid> npx tsx scripts/smoke-sdk.ts
 *   Or without GOAL_ID — it picks the first running goal.
 */

import "dotenv/config";

import { pool } from "../src/db/pool";

const API_URL = process.env.SMOKE_API_URL ?? "http://localhost:4100";
const VISITOR_COUNT = parseInt(process.env.SMOKE_VISITORS ?? "20", 10);
const CONVERSION_RATE = parseFloat(process.env.SMOKE_CONVERSION_RATE ?? "0.3");

type SdkGoalConfig = {
    id: string;
    conversionEvent: string;
    status: string;
    experiments: Array<{
        id: string;
        name: string;
        weight: number;
        variants: Array<{ id: string; name: string; weight: number }>;
    }>;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...init?.headers }
    });
    if (!res.ok) throw new Error(`${path} → ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
}

function log(msg: string) {
    process.stdout.write(`  ${msg}\n`);
}

async function main() {
    process.stdout.write("\n🔬 SDK Smoke Test\n\n");

    // Step 1: Find a goal
    let goalId = process.env.GOAL_ID;

    if (!goalId) {
        log("No GOAL_ID provided, fetching first running goal...");
        const { goals } = await api<{ goals: Array<{ id: string; title: string; status: string }> }>("/api/goals");
        const running = goals.find((g) => g.status === "running");
        if (!running) throw new Error("No running goals found. Create one first.");
        goalId = running.id;
        log(`Using goal: "${running.title}" (${goalId})`);
    }

    // Step 2: Fetch SDK config (this is what the SDK does on init)
    log("\nFetching SDK goal config...");
    const { goal: config } = await api<{ goal: SdkGoalConfig }>(`/api/sdk/goals/${goalId}`);

    if (!config) throw new Error("Goal SDK config not found");
    if (config.experiments.length === 0) throw new Error("No running experiments in this goal");

    log(`Goal: ${config.id}`);
    log(`Conversion event: ${config.conversionEvent}`);
    log(`Experiments: ${config.experiments.length}`);

    for (const exp of config.experiments) {
        log(`  ${exp.name} (${exp.id}) — ${exp.variants.length} variant(s)`);
        for (const v of exp.variants) {
            log(`    ${v.name} (${v.id}) weight=${v.weight}`);
        }
    }

    // Step 3: Pick first experiment + first variant (simulating SDK bucketing)
    const experiment = config.experiments[0];
    const variant = experiment.variants[0];

    if (!variant) throw new Error("No active variants found");

    log(`\nSimulating ${VISITOR_COUNT} visitors on experiment "${experiment.name}", variant "${variant.name}"`);
    log(`Target conversion rate: ${(CONVERSION_RATE * 100).toFixed(0)}%`);

    // Step 4: Send pageview + conversion events
    let pageviews = 0;
    let conversions = 0;

    for (let i = 0; i < VISITOR_COUNT; i++) {
        const visitorId = `smoke-test-visitor-${Date.now()}-${i}`;

        // Pageview (every visitor)
        await api("/api/events", {
            method: "POST",
            body: JSON.stringify({
                experimentId: experiment.id,
                variantId: variant.id,
                visitorId,
                eventName: "pageview",
                url: "https://smoke-test.example.com/"
            })
        });
        pageviews++;

        // Conversion (based on rate)
        if (Math.random() < CONVERSION_RATE) {
            await api("/api/events", {
                method: "POST",
                body: JSON.stringify({
                    experimentId: experiment.id,
                    variantId: variant.id,
                    visitorId,
                    eventName: config.conversionEvent,
                    url: "https://smoke-test.example.com/success"
                })
            });
            conversions++;
        }
    }

    log(`\nSent ${pageviews} pageviews, ${conversions} conversions`);

    // Step 5: Verify events in DB
    log("\nVerifying events in database...");

    const dbPageviews = await pool.query(
        `select count(distinct visitor_id) as cnt
     from experiment_events
     where experiment_id = $1 and variant_id = $2 and event_name = 'pageview'
       and visitor_id like 'smoke-test-visitor-%'`,
        [experiment.id, variant.id]
    );

    const dbConversions = await pool.query(
        `select count(distinct visitor_id) as cnt
     from experiment_events
     where experiment_id = $1 and variant_id = $2 and event_name = $3
       and visitor_id like 'smoke-test-visitor-%'`,
        [experiment.id, variant.id, config.conversionEvent]
    );

    const dbPageviewCount = Number(dbPageviews.rows[0].cnt);
    const dbConversionCount = Number(dbConversions.rows[0].cnt);

    log(`DB pageviews:   ${dbPageviewCount} (expected ${pageviews})`);
    log(`DB conversions: ${dbConversionCount} (expected ${conversions})`);

    if (dbPageviewCount < pageviews) {
        log("⚠️  Some pageviews missing from DB!");
    }
    if (dbConversionCount < conversions) {
        log("⚠️  Some conversions missing from DB!");
    }

    // Step 6: Call evaluate and check metrics
    log("\nEvaluating experiment...");
    const { result } = await api<{ result: { winnerVariantId: string | null; confidence: number; reason: string } }>(
        `/api/experiments/${experiment.id}/evaluate`,
        { method: "POST" }
    );

    log(`Winner: ${result.winnerVariantId ?? "none yet"}`);
    log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    log(`Reason: ${result.reason}`);

    // Step 7: Fetch updated goal and check metrics show up
    log("\nFetching updated goal metrics...");
    const { goal: updatedGoal } = await api<{ goal: { experiments: Array<{ id: string; name: string; metrics: Array<{ variantId: string; visitors: number; conversions: number; conversionRate: number }> }> } }>(
        `/api/goals/${goalId}`
    );

    const updatedExp = updatedGoal.experiments.find((e) => e.id === experiment.id);
    if (updatedExp) {
        for (const m of updatedExp.metrics) {
            const isTarget = m.variantId === variant.id;
            log(`  ${isTarget ? "→" : " "} Variant ${m.variantId.slice(0, 8)}: ${m.visitors} visitors, ${m.conversions} conversions, ${(m.conversionRate * 100).toFixed(1)}% rate`);
        }
    }

    // Summary
    const allGood = dbPageviewCount >= pageviews && dbConversionCount >= conversions;
    process.stdout.write(`\n${allGood ? "✅" : "⚠️ "} SDK smoke test ${allGood ? "passed" : "completed with warnings"}\n\n`);
}

main()
    .catch((error: unknown) => {
        process.stderr.write(`\n❌ ${error instanceof Error ? error.message : String(error)}\n\n`);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
