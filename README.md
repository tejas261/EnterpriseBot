# IPL Live — Full-Stack Real-Time Cricket Dashboard

## Overview

IPL Live is a complete web application for tracking IPL team updates and live match scores. It features:

- **Next.js dashboard** (App Router, TypeScript, Tailwind CSS, shadcn/ui)
- **MongoDB Change Streams** for real-time team document notifications
- **SSE notifications** delivered to authenticated browser tabs
- **WebSocket live scorecard** driven by a ball-by-ball simulator
- **JWT session cookie** auth (`ipl_session`, 12h TTL, HttpOnly, SameSite=Lax)
- **Field-level notification filtering** — subscribers choose which team fields trigger notifications
- **Idempotent, replay-safe Change Stream processing** via SHA-256 resume-token hashing and unique `{userId, sourceEventId}` index
- **Grouped multi-field notifications** — one notification per change event per user, regardless of how many fields changed

## Architecture

| Layer | Technology | Role |
|---|---|---|
| Web App | Next.js 16, React 19, Tailwind 3.4 | UI, auth, API routes |
| Realtime Service | Node.js, MongoDB driver, ws | SSE hub + WS `/ws/match` |
| Shared Logic | `@ipl/shared` (Zod, cricket helpers, notification builder) | Types, schemas, pure functions |
| Database | MongoDB 7 replica set (`rs0`) | Teams, users, subscriptions, notifications, matches, change stream checkpoints |

## Quick Start

```bash
# 1. Install dependencies (requires legacy-peer-deps)
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Start MongoDB replica set and initialize
npm run db:up

# 4. Wait for init, then seed teams + demo match
npm run db:seed

# 5. Create admin user (required for team editing)
npm run db:create-admin -- --username adminuser --password AdminPass123

# 6. Build indexes + change stream pre-images
npm run db:init

# 7. Start both services
npm run dev

# 8. Open http://localhost:3000, register/login, follow a team,
#    start the simulator, and see live updates.
```

### Commands Summary

| Command | Description |
|---|---|
| `npm run db:up` | Start MongoDB + replica init container |
| `npm run db:init` | Create MongoDB indexes + enable change stream pre-images |
| `npm run db:seed` | Seed all 10 IPL teams (2025 sample data, `$setOnInsert` so reruns are safe) |
| `npm run db:create-admin` | Create admin user from CLI |
| `npm run simulator` | Run the match ball simulator |
| `npm run dev` | Start Next.js + realtime service concurrently |
| `npm run build` | Produce production Next.js build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript strict typecheck |
| `npm run archive` | Create ZIP archive (excluding `node_modules`, build caches, secrets) |

### `.env` setup

Copy `.env.example` to `.env`. The repository root `.env` is the single source of truth shared by both the web and realtime services. Required variables:

```
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ipl_live?replicaSet=rs0
MONGODB_DB=ipl_live
JWT_ACCESS_SECRET=<16+ char secret>
AUTH_TOKEN_TTL=12h
WEB_ORIGIN=http://localhost:3000
REALTIME_PORT=4000
HEARTBEAT_MS=20000
SIMULATOR_INTERVAL_MS=5000
```

**Important**: `JWT_ACCESS_SECRET` must be at least 16 characters. The dev default is `dev-only-change-me-8f3c2b1a9d7e6f5c4b3a2d1e0f9e8d7c`.

### Docker development

```bash
# Start everything including Mongo replica init
docker compose up -d --wait mongo && docker compose run --rm mongo-init

# Then in another shell:
npm run db:seed
npm run db:init
npm run dev
```

## User Journeys

### Register & Login

1. Visit `/register` and choose a username (3-30 chars, `[a-zA-Z0-9_]` only).
2. Log in at `/login`.
3. A HttpOnly `ipl_session` cookie is set (12h expiry).
4. The dashboard `/dashboard` becomes available.

### Following a Team

1. On the dashboard, view "Discover teams" or "My teams".
2. Click **Follow** on a team card.
3. A subscription is stored in MongoDB — by default you subscribe to **all notifiable fields** (captain, head coach, home ground, titles, wins, losses, points).
4. Use the **field selector** to deselect fields you don't want notifications for.

### Receiving Notifications

When a subscribed team document changes via the admin API or direct `mongosh` update:

- An SSE event arrives at `/api/realtime/notifications` (cookie-authenticated).
- A grouped notification appears in the **notifications bell** in the header — one notification per event, regardless of how many fields changed.
- The notification includes a list of changed fields with old/new values.
- Unread notifications show a dot badge; the count updates in real time.
- **Cross-tab sync**: `BroadcastChannel` (`ipl-notifications`) keeps read state consistent across browser tabs.

### 

### Live Match Scorecard

1. The dashboard shows a live scorecard connected via WebSocket: the two active batters (runs, balls, strike rate, strike marker) and the current bowler.
2. Start the simulator with `npm run simulator`, or toggle the built-in runner over the API (below) to see ball-by-ball updates.
3. Overs notation (`0.0`, `1.1`, `19.5`, `20.0`) is maintained automatically.
4. The simulator uses weighted random outcomes — deterministic via a seeded `Math.random` if needed.

### Running the match over the API

Admins can start and stop the ball-by-ball runner without the CLI:

```bash
# start (intervalMs optional, 200–10000, defaults to SIMULATOR_INTERVAL_MS)
curl -X POST http://localhost:3000/api/matches/ipl-demo-match-001/simulation \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
  --cookie 'ipl_session=<session cookie>' \
  -d '{"running":true,"intervalMs":1500}'

# stop
curl -X POST http://localhost:3000/api/matches/ipl-demo-match-001/simulation \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
  --cookie 'ipl_session=<session cookie>' \
  -d '{"running":false}'
```

`GET /api/matches/:matchId/simulation` returns the current runner state. The runner lives in the web process, so a restart stops it and each web instance would run its own ticker (single-instance demo only).

Admins can also use the toggle in the dashboard header (`Toggle match simulation`) to start/stop the runner without curl.

## API Reference

### Auth

- `POST /api/auth/register` — `{ username, password }` → 201 `{ user: { id, username, role } }`
- `POST /api/auth/login` — same → `{ user }` with `Set-Cookie: ipl_session`
- `POST /api/auth/logout` → clears cookie
- `GET /api/auth/me` — requires cookie, returns `{ user: AuthUser }`

### Teams

- `GET /api/teams` — list all teams
- `GET /api/teams/:short` — team by short code
- `PATCH /api/admin/teams/:short` — admin only; `{ name, captain, headCoach, homeGround, titles, wins, losses, points }`

### Subscriptions

- `GET /api/subscriptions` — list user's subscriptions
- `POST /api/subscriptions` — `{ teamShort, fields? }` — follow a team
- `PATCH /api/subscriptions/:short` — `{ fields }` — change field preferences
- `DELETE /api/subscriptions/:short` — unfollow a team

### Notifications

- `GET /api/notifications?limit=20&cursor=&unreadOnly=true` — paginated notification list
- `GET /api/notifications/unread-count` → `{ unreadCount }`
- `PATCH /api/notifications/read-all` → marks all user notifications as read

### Matches

- `GET /api/matches/live` — initial live match snapshot (updates arrive over WebSocket)
- `GET /api/matches/:matchId` — stored match state
- `GET /api/matches/:matchId/simulation` — runner status `{ running, intervalMs }`
- `POST /api/matches/:matchId/simulation` — admin only; `{ running: boolean, intervalMs? }` starts/stops the ball-by-ball runner

### Realtime

- `GET /api/realtime/notifications` — SSE connection (requires `ipl_session` cookie)
- `WS /ws/match` — WebSocket for live scorecard (requires `ipl_session` cookie)
- `GET /health` → `{ status: "ok", ... }`
- `GET /ready` → service readiness check

### Admin (authenticated with cookie)

- All standard API endpoints plus `/api/admin/teams/:short` PATCH.

## Change Stream Pipeline

The realtime service runs two MongoDB Change Streams:

1. **`teams` stream** — watches `update` and `replace` events on the `teams` collection.
   - Falls back to an in-process cache when `changeStreamPreAndPostImages` is unavailable.
   - For each event, builds grouped notifications per subscriber using `buildTeamNotification()`.
   - Idempotency: unique `{ userId, sourceEventId }` index on `notifications`; SHA-256 of the resume token generates `sourceEventId`.
   - Checkpoint saved after each successful event; gap detection for `HistoryLost` errors.

2. **`matches` stream** — watches `insert`, `update`, `replace` on `matches`.
   - Broadcasts score update messages via WebSocket and SSE on every change.
   - Initial snapshot sent immediately on connection.

### Idempotency Strategy

- Each Change Stream event gets a `sourceEventId` = `SHA-256(EJSON resume token)`.
- The `notifications` collection has a unique index on `{ userId: 1, sourceEventId: 1 }`.
- Processing uses `bulkWrite` with `updateOne` + `upsert: true` — a replayed event simply updates the existing document (no duplicate notifications).
- Checkpoint (resume token) is persisted after every successful event processing.

## Notification Grouping

When multiple fields change in one database operation:

- A **single** grouped notification is generated per eligible subscriber.
- The notification message lists all changed fields naturally joined ("Captain and Points updated").
- The `changes` array contains one entry per changed field.
- If a user is subscribed to only a subset of changed fields, they receive a notification containing only their subscribed fields ("Captain only updated").
- If no subscribed fields changed, no notification is sent.

## Seed Data

Teams are seeded from `scripts/seed.ts` using `$setOnInsert` — rerunning never overwrites admin edits. All 10 IPL franchises are present with stable short codes. Sample 2025 season data:

| Team | Titles | Wins | Losses | Points |
|---|---|---|---|---|
| CSK | 5 | 6 | 8 | 12 |
| MI | 5 | 6 | 8 | 12 |
| RCB | 1 | 10 | 4 | 20 |
| KKR | 3 | 7 | 7 | 14 |
| SRH | 1 | 7 | 7 | 14 |
| RR | 1 | 6 | 8 | 12 |
| DC | 0 | 8 | 6 | 16 |
| PBKS | 0 | 9 | 5 | 18 |
| GT | 1 | 7 | 7 | 14 |
| LSG | 0 | 4 | 10 | 8 |

The demo match (`ipl-demo-match-001`) is seeded with a plausible scorecard. Labelled "simulated" in the UI.

### Player and squad data

- Squads are seeded once from `data/ipl_2026_seed_data/squads.json` into the `squads` collection (upserted by `{ teamShort, playerName }`).
- The demo match persists the two batting orders (`squads: { RCB: [...], CSK: [...] }`) used by the live scorecard.
- Seeding is a one-time operation; the MongoDB volume (`mongo-data`) keeps the data across restarts, and re-running the seed never overwrites live scores, team edits or squad members.
- Existing demo matches are repaired once: generic `RCB Batter 3` names are replaced with real squad names, keeping score progress intact.

## Manual Testing (Mongosh Verification)

The following steps verify the complete pipeline end-to-end:

```text
1. Start MongoDB replica set: docker compose up -d --wait mongo
2. Init: npm run db:init
3. Seed teams: npm run db:seed
4. Create admin: npm run db:create-admin -- --username adminuser --password AdminPass123
5. Start services: npm run dev
6. Register user A: register with username/password, log in
7. User A follows RCB (default all fields)
8. Register user B: different username, log in
9. User B follows RCB, then limits subscription to "captain" only
10. Admin: PATCH /api/admin/teams/RCB { captain: "Rajat Patidar", points: 22 }
11. User A receives one grouped notification: "Captain and Points updated" (2 changes)
12. User B receives one notification: "Captain updated" (1 change only)
13. Direct mongosh update: points-only change in MongoDB
14. User A receives notification (all fields subscribed)
15. User B receives no notification (only subscribed to captain)
16. Mark all read: /api/notifications/read-all
17. Verify unread count → 0
18. Close browser tab, re-login — offline-created notification persists
```

## Deployment

### Production considerations

- `JWT_ACCESS_SECRET` must be a long random value (rotated periodically).
- `NODE_ENV=production` — enables `secure: true` on the session cookie.
- Deploy the realtime service on a dedicated host/port (default 4000).
- Ensure WebSocket and SSE connections are allowed through your firewall/proxy.
- MongoDB must be a replica set for Change Streams to work.
- The `.env` file must never be committed — it contains the JWT secret and DB URI.

### Scaling

- SSE and WS are in-memory per-process. For horizontal scaling, use a message queue (e.g., Redis) or deploy a single realtime instance.
- The Change Stream processor is the single point of notification generation — it must be running for any team changes to trigger notifications.

## What's Excluded from this Repository

- `node_modules/` (in `.gitignore`, excluded from ZIP)
- `.env`, `.env.local`, `.env.*.local` (secrets, gitignored, excluded from ZIP)
- `.next/`, `out/`, `dist/` (build caches)
- `coverage/`, `playwright-report/`, `test-results/` (test artifacts)
- `*.log`, `*.zip` (runtime artifacts)

## License

MIT — feel free to use, modify, and extend.