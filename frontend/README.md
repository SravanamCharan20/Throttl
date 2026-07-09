# SkyCheck — Throttl demo frontend

An interactive playground for [Throttl](../backend), a rate limiter built from scratch. The
demo frames itself around **SkyCheck**, a fictional weather API: you play a developer hitting
its free-tier endpoint, and Throttl is the rate limiter standing between you and the data.

Pick one of the four strategies Throttl implements, tune the limit and window, then send single
requests or fire a burst to watch each algorithm accept and reject traffic in real time:

- **Sliding Window Log** — a live timeline of recent request timestamps
- **Sliding Window Counter** — previous/current window bars plus a blended estimate meter
- **Token Bucket** — a bucket that fills with idle time and drains per request
- **Leaky Bucket** — a bucket that rises with accepted requests and a paced processing queue

Every request (allowed, denied, or errored) shows up in a running log underneath.

## Running locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). By default it talks to a Throttl backend at
`http://localhost:8888` — start the backend from [`../backend`](../backend) first, or point
`NEXT_PUBLIC_THROTTL_API_URL` in `.env.local` at wherever it's running.

The app checks `GET /uptime` before showing the demo, and shows a "waking up" state if the
backend is slow to respond (useful for free-tier hosts that spin down when idle).

## Environment variables

| Variable                       | Description                              | Default                 |
| ------------------------------- | ----------------------------------------- | ------------------------ |
| `NEXT_PUBLIC_THROTTL_API_URL`   | Base URL of the Throttl backend           | `http://localhost:8888` |

## Building

```bash
npm run build
```

## Deploying to Vercel

This repo is a monorepo, so when importing it on Vercel:

1. Set **Root Directory** to `frontend`.
2. Add `NEXT_PUBLIC_THROTTL_API_URL` under Project Settings → Environment Variables, pointing at
   the deployed backend: `https://<your-backend>.onrender.com`.
3. Deploy — no other configuration needed.

Deployed backend URL: _add once deployed_.
