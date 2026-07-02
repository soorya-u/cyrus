# Plan: Apps Structure (04)

**Depends on**: 03

## apps/web
- Exact from homeland: Vite + TanStack Router + React 19 + oRPC + tanstack-query + better-auth client
- package.json scripts: dev, build, check:types
- src/: main, routes (index, login, _auth/*), components (header, loader, theme, auth forms), lib/auth, utils/orpc
- Use @cyrus/ui, @cyrus/api, @cyrus/auth, @cyrus/env/web
- Seed placeholder Thread list page (from later plan)

## apps/mobile
- Expo + Router + React Native + heroui-native or similar
- Copy structure: app/_layout, (drawer)/, components, contexts, lib/auth, utils/orpc
- Global css, uniwind or tailwind via nativewind if used in homeland
- Thread UI seed from t3code mobile

## apps/desktop
- Electrobun
- package.json with scripts matching homeland (dev:hmr, build:stable etc.)
- src/bun/index.ts : BrowserWindow loading web (dev server or bundled)
- Depends on web build for stable

## apps/server  (CRITICAL: replaces services/bff)
- Location: apps/server
- package.json: elysia, @orpc/*, better-auth, @cyrus/db/auth/api/env
- src/index.ts : Elysia app
  - CORS, helmet, rate limit, csrf, evlog
  - /api/auth/* → betterAuth.handler
  - /rpc → oRPC
  - /ws → WebSocket signaling (offers/answers/ice/presence)
  - Device bootstrap endpoints (register device pubkey)
  - Presence (who's online in room)
- .env (local) with DATABASE_URL etc.
- tsdown or build config if homeland bff used it
- NO thread state, NO agent execution.

## apps/cli  (Worker)
- package.json: name @cyrus/cli, bin or run via bun
- src/index.ts or src/main.ts : CLI entry
  - Parse args for worker name, agent, etc.
  - Generate/load device keypair (local file or secure store)
  - Connect to signaling (WS) for bootstrap
  - Register device (pubkey)
  - Advertise capabilities
  - Start AgentRuntime host
  - WebRTC peer handling (later)
  - Local Turso for owned threads/execution state
- Use zod for CLI flags
- Skeleton first: "worker online, registered"

## Root Scripts Updates
- "dev": turbo dev (web + server + ?)
- "dev:web", "dev:mobile", "dev:desktop", "dev:server", "dev:cli"
- "db:*" delegate to packages/db
- "auth:generate"

## Order
1. Create server app first (so auth/db testable).
2. Then web (login + dashboard).
3. Mobile shell.
4. Desktop shell.
5. cli skeleton.

## Verification
- Can `bun run dev:server` → http://localhost:3000 OK
- `bun run dev:web` → login page, after github auth sees dashboard
- `bun run dev:cli` → logs "worker registered"
