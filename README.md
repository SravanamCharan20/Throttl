# Throttl

A rate limiter built from scratch, plus an interactive demo of it in action.

- [`backend/`](backend) — Node.js + Express + Redis service implementing four rate-limiting
  algorithms (Sliding Window Log, Sliding Window Counter, Token Bucket, Leaky Bucket) behind a
  single `POST /check` endpoint. Deploys to Render.
- [`frontend/`](frontend) — Next.js + Tailwind demo ("SkyCheck") that visualizes each algorithm's
  behavior live against the backend. Deploys to Vercel.

Each folder is a self-contained app with its own `package.json` and README — see those for setup
and deployment details.

## Quick start

```bash
# backend
cd backend && npm install && cp .env.example .env && npm run dev

# frontend, in another terminal
cd frontend && npm install && cp .env.example .env.local && npm run dev
```
