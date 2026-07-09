# Throttl

**Live demo:** [throttl-flax.vercel.app](https://throttl-flax.vercel.app/)
**Backend API:** `https://<your-render-service>.onrender.com` — swap in your actual Render URL once deployed

A distributed API rate limiter built from scratch — four rate-limiting algorithms, one shared Redis, one clean interface for swapping between them at request time.

## Why this exists

Most portfolio rate limiters implement one algorithm and stop. Throttl implements all four of the algorithms that actually show up in production systems and system design interviews — Sliding Window Log, Sliding Window Counter, Token Bucket, and Leaky Bucket — behind a single API, so the project demonstrates the full trade-off space (exact vs. approximate windowing, burst-rewarding vs. burst-smoothing bucket models) instead of one opinionated choice.

## The demo — SkyCheck

The live demo frames everything around a small story: **SkyCheck**, a fictional weather API, gives every developer a free-tier quota, and Throttl is the rate limiter standing at its door. Pick an algorithm, tune the limit/window, fire single requests or a full burst, and watch each strategy accept and reject traffic differently, live:

- **Sliding Window Log** — a live timeline of recent request timestamps
- **Sliding Window Counter** — previous/current window bars plus a blended estimate meter
- **Token Bucket** — a bucket that fills during idle time and drains per request
- **Leaky Bucket** — a bucket that rises with accepted requests, reporting a paced queue position instead of blocking

## The four algorithms

| Algorithm | How it decides | Memory per client | Accuracy | Burst behavior |
|---|---|---|---|---|
| Sliding Window Log | Exact log of request timestamps in a Redis sorted set; trims anything outside the trailing window on every check | Grows with request volume | Exact — no boundary exploit | Strict, no reward for idle time |
| Sliding Window Counter | Two fixed-window counters (previous + current), blended by how much of the previous window still overlaps the trailing lookback | O(1) — two numbers | Close approximation, small bounded error at extreme edge cases | Strict, same as Log |
| Token Bucket | Tokens refill at a steady rate up to a capacity; each request spends one | O(1) — two numbers (tokens, last refill time) | Exact for its own model | Rewards idle time with burst capacity |
| Leaky Bucket | A "water level" rises per request and drains at a constant rate; admission blocked if it would overflow | O(1) — two numbers (level, last leak time) | Exact for its own model | As a meter, mathematically mirrors Token Bucket — see engineering notes below |

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
     Log          Counter      (Lua script)  (Lua script)
        │           │             │             │
        └───────────┴──────┬──────┴─────────────┘
                            ▼
                Redis (shared, one instance)
        sorted sets · counters · atomic Lua scripts
```

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

Returns `200` if allowed, `429` if denied:

```json
{ "allowed": true, "remaining": 3, "resetAt": 1720440060000 }
```

`leaky-bucket` responses additionally include `queuePosition` and `estimatedProcessAt` (both `null` when denied) — see [Engineering notes](#engineering-notes--talking-points).

Missing `clientId` or an unrecognized `algorithm` returns `400`:

```json
{ "error": "clientId is required" }
```

### `GET /health`

Returns `{ "status": "ok" }`. Used by the frontend to detect whether the backend is awake before showing the demo (free-tier hosts spin down after inactivity).

## Tech stack

| Layer | Tool | Why |
|---|---|---|
| Backend | Node.js + Express (ESM) | Simple, fast, standard for a small API service |
| Storage | Redis Cloud (`ioredis`) | Atomic operations, TTL-based cleanup, and — critically — shared state across backend instances |
| Atomicity | Redis Lua scripting (`EVAL`) | Token Bucket and Leaky Bucket need multi-step read-compute-write sequences to be atomic; Lua scripts run as one indivisible unit on Redis's single thread |
| Frontend | Next.js (App Router) + TypeScript + Tailwind | Live, interactive demo with per-algorithm visualizations |
| Backend hosting | Render | Free tier, supports a real always-on process (required for a persistent Redis connection — see notes below) |
| Frontend hosting | Vercel | Standard for Next.js, fast static/edge delivery |
| Database hosting | Redis Cloud | 30MB free tier, no card required, TLS connection |

## Project structure

```
throttl/
├── render.yaml              Render deployment blueprint (rootDir: backend)
├── backend/                 Node.js + Express + Redis service
│   ├── algorithms/
│   │   ├── RateLimiterStrategy.js   shared interface every algorithm implements
│   │   ├── slidingWindowLog.js
│   │   ├── slidingWindowCounter.js
│   │   ├── tokenBucket.js           includes the Lua script + ioredis defineCommand
│   │   ├── leakyBucket.js           includes the Lua script + ioredis defineCommand
│   │   └── strategyFactory.js       looks up an algorithm instance by name
│   ├── config/limits.js     default limit/window values
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

**Backend → Render.** A `render.yaml` blueprint is included at the repo root (`rootDir: backend`) — use Render's "New Blueprint" flow and point it at this repo. It installs with `npm install`, starts with `node index.js`, health-checks against `/health`, and prompts for `REDIS_URL` (not stored in the blueprint). Render sets `PORT` automatically.

**Frontend → Vercel.** Since this is a monorepo: set **Root Directory** to `frontend`, add `NEXT_PUBLIC_THROTTL_API_URL` under Environment Variables pointing at the deployed Render URL, and deploy — no other configuration needed.

**Database → Redis Cloud.** Free tier, 30MB, TLS connection string set as `REDIS_URL` on the backend.

## Engineering notes — talking points

A few decisions worth being able to explain without notes:

**Race conditions are handled without locks.** Sliding Window Log and Sliding Window Counter use an "optimistic write, then self-correct" pattern: write first, check the result, and undo the write if it turned out to violate the limit. This biases any race condition toward being *too strict* (occasionally denying a request that technically should've squeaked through) rather than *too loose* (letting extra requests past the limit) — the safe direction for a rate limiter to fail in.

**Token Bucket and Leaky Bucket use Redis Lua scripting, not the optimistic pattern.** Both need a read-compute-write sequence (current tokens/level *and* a timestamp, combined) that has to be atomic as a whole, not just per-command. A Lua script sent via `EVAL` runs as one indivisible unit on Redis's single thread — no other client's command can interleave in the middle of it.

**Leaky Bucket, implemented as a "meter," is provably near-identical to Token Bucket in its admission decisions** — with matching capacity/rate and mirrored starting conditions (Token Bucket starts full, Leaky Bucket starts empty), `level(t) = capacity - tokens(t)` holds at every instant, so they make the same allow/deny call for any request sequence. The real differentiator is Leaky Bucket's literal queueing behavior: instead of blocking the HTTP response until a request's turn arrives (which would make `/check` unpredictably slow — not how real rate limiters behave), it responds instantly like the other three algorithms but includes `queuePosition` and `estimatedProcessAt`, giving the caller genuine queue-position information without ever holding a connection open.

**Concurrency is tested, not assumed.** A `concurrencyTest.js` script fires 20 simultaneous requests (via `Promise.all`, not sequential calls) against each algorithm and confirms none of them ever admits more than the configured limit — proof the atomic-write strategies actually hold up under real contention, not just one-request-at-a-time testing.
