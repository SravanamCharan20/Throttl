/**
 * Concurrency validation against shared Redis state.
 *
 * Fires 20 simultaneous checkLimit calls (Promise.all) per algorithm with
 * limit=5 and asserts that none admit more than 5 requests.
 *
 * Usage:
 *   npm run test:concurrency
 *
 * Optional HTTP pass (server must be running):
 *   THROTTL_API_URL=http://localhost:8888 npm run test:concurrency
 */
import dotenv from "dotenv";
dotenv.config();

import redis from "./redisClient.js";
import { getStrategy } from "./algorithms/strategyFactory.js";

const ALGORITHMS = [
  "sliding-window-log",
  "sliding-window-counter",
  "token-bucket",
  "leaky-bucket",
];

const CONCURRENT = 20;
const LIMIT = 5;
const WINDOW_SECONDS = 60;
const API_URL = process.env.THROTTL_API_URL || null;

async function clearClientKeys(clientId) {
  const exact = [
    `ratelimit:slw:log:${clientId}`,
    `ratelimit:tb:${clientId}`,
    `ratelimit:lb:${clientId}`,
  ];
  await redis.del(...exact);

  const swcKeys = await redis.keys(`ratelimit:swc:${clientId}:*`);
  if (swcKeys.length > 0) {
    await redis.del(...swcKeys);
  }
}

async function runStrategyBurst(algorithm) {
  const clientId = `concurrency-${algorithm}-${Date.now()}`;
  await clearClientKeys(clientId);

  const strategy = getStrategy(algorithm);
  const results = await Promise.all(
    Array.from({ length: CONCURRENT }, () =>
      strategy.checkLimit(clientId, LIMIT, WINDOW_SECONDS),
    ),
  );

  await clearClientKeys(clientId);

  const admitted = results.filter((r) => r.allowed).length;
  return { clientId, admitted, results };
}

async function runHttpBurst(algorithm) {
  const clientId = `concurrency-http-${algorithm}-${Date.now()}`;
  const base = API_URL.replace(/\/$/, "");

  const responses = await Promise.all(
    Array.from({ length: CONCURRENT }, async () => {
      const res = await fetch(`${base}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          algorithm,
          limit: LIMIT,
          windowSeconds: WINDOW_SECONDS,
        }),
      });
      const body = await res.json().catch(() => ({}));
      return { status: res.status, body, retryAfter: res.headers.get("Retry-After") };
    }),
  );

  const admitted = responses.filter((r) => r.status === 200 && r.body?.allowed).length;
  const denied = responses.filter((r) => r.status === 429).length;
  const failures = responses.filter((r) => r.status !== 200 && r.status !== 429);

  return { clientId, admitted, denied, failures, responses };
}

function assertAdmission(label, admitted) {
  if (admitted > LIMIT) {
    throw new Error(
      `${label}: admitted ${admitted} > configured limit ${LIMIT}`,
    );
  }
  if (admitted < 1) {
    throw new Error(
      `${label}: admitted ${admitted} — expected at least 1 under an empty bucket/window`,
    );
  }
  console.log(
    `  ✓ ${label}: ${admitted}/${CONCURRENT} admitted (limit ${LIMIT})`,
  );
}

async function main() {
  console.log(
    `\nConcurrency test: ${CONCURRENT} simultaneous checks, limit=${LIMIT}\n`,
  );

  let failed = false;

  console.log("Shared Redis (direct strategy calls):");
  for (const algorithm of ALGORITHMS) {
    try {
      const { admitted } = await runStrategyBurst(algorithm);
      assertAdmission(algorithm, admitted);
    } catch (err) {
      failed = true;
      console.error(`  ✗ ${algorithm}: ${err.message}`);
    }
  }

  if (API_URL) {
    console.log(`\nHTTP (POST ${API_URL}/check):`);
    for (const algorithm of ALGORITHMS) {
      try {
        const { admitted, denied, failures } = await runHttpBurst(algorithm);
        if (failures.length > 0) {
          throw new Error(
            `${failures.length} non-200/429 responses (e.g. status ${failures[0].status})`,
          );
        }
        assertAdmission(algorithm, admitted);
        console.log(
          `      ${denied} denied with 429; admitted+denied=${admitted + denied}`,
        );
      } catch (err) {
        failed = true;
        console.error(`  ✗ ${algorithm}: ${err.message}`);
      }
    }
  } else {
    console.log(
      "\n(Skipping HTTP pass — set THROTTL_API_URL to also hit POST /check)\n",
    );
  }

  await redis.quit();

  if (failed) {
    console.error("\nConcurrency test FAILED — at least one algorithm over-admitted.\n");
    process.exit(1);
  }

  console.log(
    "\nAll algorithms stayed within the configured limit under concurrent Redis contention.\n",
  );
  process.exit(0);
}

main().catch(async (err) => {
  console.error("Concurrency test crashed:", err);
  try {
    await redis.quit();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
