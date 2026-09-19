# Throttl

A distributed API rate limiter built from scratch — four rate-limiting algorithms, one shared Redis, one clean interface for swapping between them at request time.

**Live demo:** [throttl-flax.vercel.app](https://throttl-flax.vercel.app/)


## Why this exists

Most portfolio rate limiters implement one algorithm and stop. Throttl implements all four of the algorithms that actually show up in production systems and system design interviews — Sliding Window Log, Sliding Window Counter, Token Bucket, and Leaky Bucket — behind a single API, so the project demonstrates the full trade-off space (exact vs. approximate windowing, burst-rewarding vs. burst-smoothing bucket models) instead of one opinionated choice.

## The demo — SkyCheck

The live demo frames everything around a small story: **SkyCheck**, a fictional weather API, gives every developer a free-tier quota, and Throttl is the rate limiter standing at its door. Pick an algorithm, tune the limit/window, fire single requests or a full burst, and watch each strategy accept and reject traffic differently, live:

- **Sliding Window Log** — a live timeline of recent request timestamps
- **Sliding Window Counter** — previous/current window bars plus a blended estimate meter
- **Token Bucket** — a bucket that fills during idle time and drains per request
- **Leaky Bucket** — a real FIFO queue: requests wait, then leak out at a constant paced rate

## The four algorithms

| Algorithm | How it decides | Memory per client | Accuracy | Burst behavior |
|---|---|---|---|---|
| Sliding Window Log | Exact log of request timestamps in a Redis sorted set; trims anything outside the trailing window on every check | Grows with request volume | Exact — no boundary exploit | Strict, no reward for idle time |
| Sliding Window Counter | Two fixed-window counters (previous + current), blended by how much of the previous window still overlaps the trailing lookback | O(1) — two numbers | Close approximation, small bounded error at extreme edge cases | Strict, same as Log |
| Token Bucket | Tokens refill at a steady rate up to a capacity; each request spends one | O(1) — two numbers (tokens, last refill time) | Exact for its own model | Rewards idle time with burst capacity |
| Leaky Bucket | Real FIFO in a Redis ZSET scored by processAt; capacity = max queue length; `/check` waits until this request leaks out at interval window/limit | O(n) queued request ids | Exact for its own model | Smooths bursts — at most `limit` waiting; releases one per leak tick |

## Architecture

```
                    Caller (SkyCheck demo, curl, Postman)
                                   │
                     POST /check { clientId, algorithm,
                                    limit, windowSeconds }
                                   ▼
                          routes/check.js
                                   │
                     strategyFactory.getStrategy(name)
                                   │
        ┌───────────┬─────────────┼─────────────┬───────────┐
        ▼           ▼             ▼             ▼
  SlidingWindow  SlidingWindow  TokenBucket   LeakyBucket
     Log          Counter
        │           │             │             │
        └───────────┴──────┬──────┴─────────────┘
                            ▼
                Redis (shared, one instance)
        sorted sets · counters · atomic Lua scripts
```

Sliding Window Log, Sliding Window Counter, Token Bucket, and Leaky Bucket each run their
read-check-write sequence as a single Lua script (`EVAL`), so the whole thing is atomic on
Redis's single thread — see [Engineering notes](#engineering-notes--talking-points).

Every algorithm implements the same `RateLimiterStrategy` interface, so the route and factory never change when a new algorithm is added — only a new class and one line in the factory. Multiple backend instances can run behind a load balancer and still enforce one consistent limit per client, because they all read and write the same Redis — that's what makes this "distributed" rather than just "rate limiting."

## API reference

### `POST /check`

```json
{
  "clientId": "string, required — identifies who's making the request",
  "algorithm": "sliding-window-log | sliding-window-counter | token-bucket | leaky-bucket",
  "limit": "number, optional, default 5",
  "windowSeconds": "number, optional, default 60"
}
```

Returns `200` if allowed, `429` if denied (with a `Retry-After` header so clients can
back off until `resetAt`):

```json
{ "allowed": true, "remaining": 3, "resetAt": 1720440060000 }
```

`leaky-bucket` responses additionally include `queuePosition`, `estimatedProcessAt`, and
`processedAt` (all `null` when denied). `/check` **blocks until the request has been
processed** out of the FIFO at the leak rate — see [Engineering notes](#engineering-notes--talking-points).

Missing `clientId`, missing/unknown `algorithm`, or a non-positive `limit` / `windowSeconds` returns `400`:

```json
{ "error": "clientId is required" }
```

A Redis/Lua failure on the strategy's own read-check-write returns `503` instead — a signal to
retry, not a bad request:

```json
{ "error": "Rate limiter is temporarily unavailable. Please try again." }
```

### `GET /uptime`

Returns `{ "status": "ok" }`. Used by the frontend to detect whether the backend is awake before showing the demo (free-tier hosts spin down after inactivity). Named `/uptime` rather than `/health` because some ad blockers and privacy extensions block generic `/health`-style endpoints, mistaking them for analytics beacons.

## Tech stack

| Layer | Tool | Why |
|---|---|---|
| Backend | Node.js + Express (ESM) | Simple, fast, standard for a small API service |
| Storage | Redis Cloud (`ioredis`) | Atomic operations, TTL-based cleanup, and — critically — shared state across backend instances |
| Atomicity | Redis Lua scripting (`EVAL`) | Sliding Window Log, Token Bucket, and Leaky Bucket need multi-step read-compute-write sequences to be atomic; Lua scripts run as one indivisible unit on Redis's single thread |
| Frontend | Next.js (App Router) + TypeScript + Tailwind | Live, interactive demo with per-algorithm visualizations |
| Backend hosting | Render | Free tier, supports a real always-on process (required for a persistent Redis connection — see notes below) |
| Frontend hosting | Vercel | Standard for Next.js, fast static/edge delivery |
| Database hosting | Redis Cloud | 30MB free tier, no card required, TLS connection |

## Project structure

```
throttl/
├── render.yaml              Render deployment blueprint (rootDir: backend)
├── backend/                 Node.js + Express + Redis service
│   ├── concurrencyTest.js   20-way concurrent admission check (limit=5) per algorithm
│   ├── algorithms/
│   │   ├── RateLimiterStrategy.js   shared interface every algorithm implements
│   │   ├── slidingWindowLog.js      includes the Lua script + ioredis defineCommand
│   │   ├── slidingWindowCounter.js
│   │   ├── tokenBucket.js           includes the Lua script + ioredis defineCommand
│   │   ├── leakyBucket.js           includes the Lua script + ioredis defineCommand
│   │   └── strategyFactory.js       looks up an algorithm instance by name
│   ├── config/limits.js     default limit/window values
│   ├── lib/httpErrors.js    400 validation helpers + Redis failure classification
│   ├── routes/check.js      the POST /check endpoint
│   ├── redisClient.js       the one shared Redis connection
│   └── index.js             Express app entry point
└── frontend/                 Next.js + Tailwind demo ("SkyCheck")
    ├── app/                  App Router pages
    ├── components/           AlgorithmSelector, RequestLog, per-algorithm visualizers, etc.
    └── lib/                  API client, algorithm metadata, client ID handling
```

## Running locally

```bash
# backend
cd backend
npm install
cp .env.example .env      # set REDIS_URL to a local or Redis Cloud instance
npm run dev

# frontend, in another terminal
cd frontend
npm install
cp .env.example .env.local   # NEXT_PUBLIC_THROTTL_API_URL defaults to http://localhost:8888
npm run dev
```

Open `http://localhost:3000` for the demo; the backend runs on `http://localhost:8888`.

## Deployment

**Backend → Render.** A `render.yaml` blueprint is included at the repo root (`rootDir: backend`) — use Render's "New Blueprint" flow and point it at this repo. It installs with `npm install`, starts with `node index.js`, health-checks against `/uptime`, and prompts for `REDIS_URL` (not stored in the blueprint). Render sets `PORT` automatically.

**Frontend → Vercel.** Since this is a monorepo: set **Root Directory** to `frontend`, add `NEXT_PUBLIC_THROTTL_API_URL` under Environment Variables pointing at the deployed Render URL, and deploy — no other configuration needed.

**Database → Redis Cloud.** Free tier, 30MB, TLS connection string set as `REDIS_URL` on the backend.

## Engineering notes — talking points

A few decisions worth being able to explain without notes:

**Race conditions are handled with Redis Lua, not application locks.** Every algorithm's
read-check-write path runs as one `EVAL` script on Redis's single thread, so concurrent
clients cannot interleave mid-decision. Sliding Window Counter's older optimistic
`INCR` → estimate → `DECR` form (kept in `slidingWindowCounter_Prev.js` for comparison)
biases races toward being *too strict*; the Lua form removes the multi-round-trip race
entirely. Sliding Window Log / Token Bucket / Leaky Bucket need the same treatment for their
combined sorted-set or hash read-compute-write sequences — the naive multi-command variants
live in `*_Prev.js` / `*_testing.js`.

**Leaky Bucket is a real FIFO queue, not a Token Bucket mirror.** Requests are stored in a
Redis sorted set (`ratelimit:lb:q:*`) scored by absolute `processAt`. On every check a Lua
script (1) drops due items, (2) rejects if the queue is at capacity, else (3) schedules the
new request at `max(now, latestProcessAt) + leakInterval`. The HTTP handler then **waits until
that request id has been processed** before returning 200 — callers only proceed at the paced
output rate. The old water-level meter (mathematically equivalent to Token Bucket) is kept in
`leakyBucket_Prev.js` for comparison.

**Concurrency is tested, not assumed.** `backend/concurrencyTest.js` fires 20 simultaneous checks (via `Promise.all`, not sequential calls) against each algorithm on shared Redis with `limit=5` and fails the process if any algorithm admits more than 5 — proof the atomic Lua paths hold up under real contention. Run it with `npm run test:concurrency` from `backend/`. The SkyCheck demo also exposes **Validate 20 concurrent**, which runs the same probe over HTTP and surfaces pass/fail in the UI.
