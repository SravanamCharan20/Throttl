# Prompt for Claude Code — Throttl Demo Frontend

Copy everything below this line into Claude Code as your starting prompt.

---

## Context

I've built **Throttl**, a backend rate-limiting service (Node.js + Express + Redis, ESM) that implements four rate-limiting algorithms from scratch: Sliding Window Log, Sliding Window Counter, Token Bucket, and Leaky Bucket. It exposes a single endpoint, `POST /check`, and the algorithm to use is selected per-request. The backend is already built and either running locally or deployed — you are NOT building or modifying the backend. Your job is a separate, new project: a **Next.js + Tailwind frontend** that demonstrates it well.

## The API contract (do not guess this — use exactly this)

Base URL: configurable via env var (see Tech Requirements below). Locally it's `http://localhost:8888`.

**`POST /check`**

Request body:
```json
{
  "clientId": "string, required — identifies who's making the request",
  "algorithm": "sliding-window-log | sliding-window-counter | token-bucket | leaky-bucket",
  "limit": "number, optional, default 5 — max requests allowed",
  "windowSeconds": "number, optional, default 60 — the time window in seconds"
}
```

Response, status `200` if allowed or `429` if denied, JSON body:
```json
{
  "allowed": true,
  "remaining": 3,
  "resetAt": 1720440060000
}
```

For `algorithm: "leaky-bucket"` specifically, the response includes two additional fields not present for the other three algorithms:
```json
{
  "allowed": true,
  "remaining": 3,
  "resetAt": 1720440060000,
  "queuePosition": 1,
  "estimatedProcessAt": 1720440042000
}
```
`queuePosition: 0` means "processed immediately, nobody ahead." `estimatedProcessAt` is a timestamp — when this request would be processed under strict constant-rate pacing. When `allowed: false`, `queuePosition` and `estimatedProcessAt` are `null`.

Error response (e.g. missing `clientId`, or an unknown `algorithm` string), status `400`:
```json
{ "error": "clientId is required" }
```

There's also `GET /health` (returns `{ status: "ok" }`) and `GET /` — use `/health` to detect if the backend is reachable/awake before showing the main UI (the deployed backend may be on a free tier that spins down after inactivity and takes 20-30s to wake — handle that gracefully with a "waking up the server..." state, don't let it look broken).

## The demo concept — build this narrative, don't build generic "4 buttons"

Frame the whole page around one continuous story: **the user is playing the role of a developer client hitting a fictional weather API ("SkyCheck") that uses Throttl to protect itself.** This should feel like a small interactive playground, not a raw API tester.

Sections, in order:
1. **Brief scenario intro** — 2-3 sentences: SkyCheck gives every developer a free-tier quota; pick which rate-limiting strategy is protecting the endpoint right now and see how it behaves.
2. **Algorithm selector** — 4 cards (one per algorithm), each with its name and a one-line plain-English description of its behavior/tradeoff (e.g. Token Bucket: "Rewards idle time with burst capacity"; Leaky Bucket: "Smooths bursts into a steady, paced output"). Selecting one switches the whole demo to that algorithm.
3. **Config controls** — editable `limit` and `windowSeconds`, with sane defaults (e.g. limit 5, window 20s — short enough that resets are visible without a long wait).
4. **Actions** — a "Send one request" button, and a "Simulate burst" button that fires N requests (configurable, default ~8) as close to simultaneously as possible using `Promise.all`, to visibly demonstrate accept/reject behavior under a real burst.
5. **Live algorithm-state visualization** — this is the most important part, build a distinct visual per algorithm so their behavior is visibly different, not just textually different:
   - *Sliding Window Log:* a horizontal timeline representing the trailing window, with dots placed at the timestamps of recent requests, dots fading/disappearing as they age out of the window.
   - *Sliding Window Counter:* two adjacent bars (previous window count, current window count) plus a computed "blended estimate" meter showing the weighted total against the limit.
   - *Token Bucket:* a bucket graphic that fills toward capacity over time and visibly drains by one unit per allowed request.
   - *Leaky Bucket:* a bucket graphic that rises with each accepted request and visibly drains over time, plus a small queue list showing pending `queuePosition` / `estimatedProcessAt` values.
6. **Live request log** — a running list of every request sent this session: timestamp, allowed (green) or denied (red), remaining, and the leaky-bucket-specific fields when relevant.
7. **Proper messaging, not just colors** — on denial, show a real, human message like a production API would return, e.g. "Rate limit exceeded. Try again in 12s." with a live countdown to `resetAt`, not just a red badge.

## Tech requirements

- Next.js (App Router), TypeScript, Tailwind CSS.
- Backend URL read from `NEXT_PUBLIC_THROTTL_API_URL` env var, defaulting to `http://localhost:8888` in development. Never hardcode the URL in components.
- Handle backend-unreachable and backend-waking-up states gracefully (see `/health` note above) — no unhandled fetch errors reaching the console/UI as a crash.
- Fully responsive (this will be viewed on both desktop and mobile by recruiters).
- Clean component decomposition (e.g. `AlgorithmSelector`, `ConfigPanel`, `RequestLog`, `BucketVisualizer`, `WindowVisualizer`, etc.) — this is a portfolio piece, code quality and structure matter, not just the visual result.
- No `localStorage`/`sessionStorage` dependency required; in-memory React state for the session is fine.

## Production-readiness checklist

- `npm run build` completes with no errors or type errors.
- No console errors/warnings in normal use.
- Include a `README.md` for this frontend project: what it is, the scenario it demonstrates, how to run it locally (`NEXT_PUBLIC_THROTTL_API_URL` setup), and a link placeholder for the deployed backend.
- Ready to deploy to **Vercel** with zero extra configuration beyond setting the env var in the Vercel dashboard.

## Git / commit hygiene — important

Initialize a **separate** git repository for this frontend (do not touch or merge into the existing Throttl backend repo). Write normal, human-style commit messages describing the actual change (e.g. `"add token bucket visualizer"`, `"wire up burst simulation"`). Do **not** add any AI-tool attribution, co-author lines, "Generated with Claude Code" footers, or any mention of AI assistance anywhere — not in commit messages, not in code comments, not in the README. Commits should read as ordinary engineering work.

## Deliverable

A working, deployable Next.js app that tells the SkyCheck story clearly, visibly demonstrates all four algorithms behaving differently from each other in real time, and is ready to `vercel deploy` once the backend's live URL is dropped into the env var.
