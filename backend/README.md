# Throttl backend

A rate limiter built from scratch (Node.js + Express + Redis, ESM), implementing four
rate-limiting algorithms:

- Sliding Window Log
- Sliding Window Counter
- Token Bucket
- Leaky Bucket

## API

### `POST /check`

```json
{
  "clientId": "string, required — identifies who's making the request",
  "algorithm": "sliding-window-log | sliding-window-counter | token-bucket | leaky-bucket",
  "limit": "number, optional, default 5",
  "windowSeconds": "number, optional, default 60"
}
```

Returns `200` if allowed or `429` if denied:

```json
{ "allowed": true, "remaining": 3, "resetAt": 1720440060000 }
```

`leaky-bucket` responses also include `queuePosition` and `estimatedProcessAt` (both `null` when
denied). Missing `clientId` or an unrecognized `algorithm` returns `400`:

```json
{ "error": "clientId is required" }
```

### `GET /uptime`

Returns `{ "status": "ok" }`. Used by the frontend to detect whether the backend is awake.
(Named `/uptime` rather than `/health` because some ad blockers and privacy extensions treat
generic `/health` endpoints as analytics/telemetry beacons and silently block them.)

## Running locally

```bash
npm install
cp .env.example .env
npm run dev
```

Requires a reachable Redis instance — set `REDIS_URL` in `.env` (a free instance from Redis
Cloud/Upstash works fine).

## Deploying to Render

A `render.yaml` blueprint is included at the repo root (`rootDir: backend`), so you can use
Render's "New Blueprint" flow and point it at this repo. It will:

- Install with `npm install` and start with `node index.js`
- Health-check against `/uptime`
- Prompt you to set `REDIS_URL` (not stored in the blueprint)

Render sets `PORT` automatically — the app already reads `process.env.PORT`.

Deploying manually instead works too: create a Web Service, set **Root Directory** to `backend`,
build command `npm install`, start command `node index.js`, and add the `REDIS_URL` env var.
