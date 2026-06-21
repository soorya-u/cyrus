# Plan: Bootstrap Cyrus using Homeland Structure

**Status**: In Progress  
**Priority**: High  
**Date**: 2026-06-21

## Goal
Initialize the Cyrus monorepo using the exact repository structure, conventions, tooling, and patterns from https://github.com/soorya-u/homeland.

- Use homeland for: root files, packages (config, db, env, auth, api, ui), apps layout (web, mobile, desktop), scripts, biome, turbo, bun, lefthook, etc.
- **Skip** `services/bff` entirely.
- Place the server inside `apps/server` (Elysia + oRPC + Better Auth + signaling).
- Add `apps/cli` for the worker (Bun executable, TypeScript).
- Adopt patterns from:
  - https://github.com/pingdotgg/t3code (Thread UI, mobile thread feed/composer, chat components, state management).
  - https://github.com/omnigent-ai/omnigent (Runner/worker concept, agent composition via adapter pattern, session sharing/ownership).
- Core philosophy: **Shared metadata, owned execution**.
- One user = one room. Peer-to-peer via WebRTC. Minimal server (auth, bootstrap, signaling, presence only).

## Non-Goals (Phase 1)
- Full WebRTC + P2P implementation details.
- Full agent plugin implementations (Claude ACP, Codex, etc.).
- Production deployment, mobile builds, desktop bundling.
- Thread migration, approvals, file sync.

## High-Level Phases
1. Replicate homeland skeleton exactly (no deviations in layout/tooling).
2. Cyrus-specific packages & domain (devices, threads metadata, workers, rooms).
3. Apps: web, mobile, desktop (UI shell), server (auth + signaling), cli (worker).
4. Seed thread/chat UI from t3code.
5. Introduce runner + agent adapter patterns from omnigent.
6. Local Turso + shared metadata sync (Phase 2+).
7. WebRTC signaling + peer auth (Phase 2+).
8. Agent runtimes (ACP/CLI/SDK bridges) (Phase 3+).

## Deliverables for Phase 1 (Bootstrap)
- Root configs match homeland 1:1 (package.json workspaces, turbo, biome, bunfig, lefthook, compose.yml, mise.toml, .env.example).
- packages/: config, db (postgres for server metadata + better-auth schema), env (server/web/mobile), auth (better-auth + github), api (orpc base), ui (shadcn).
- apps/server (instead of services/bff): Elysia, oRPC, better-auth, WS signaling endpoints, device registry.
- apps/web: Vite + TanStack Router + React 19 + shared UI + thread list/views (seeded).
- apps/mobile: Expo + React Native + similar thread UI.
- apps/desktop: Electrobun shell pointing to web.
- apps/cli: Bun-based worker entrypoint skeleton (identity, capabilities, agent runtime stub).
- .plans/ populated with this and follow-up plans.
- Basic `bun install`, `bun run db:push` (once postgres), typecheck, lint pass.
- ARCHITECTURE.md updated with structure notes if needed.
- No execution state in server. Server never owns threads/agents.

## Exact Structure to Replicate (adapted)
```
cyrus/
├── apps/
│   ├── web/
│   ├── mobile/
│   ├── desktop/
│   ├── server/          # NEW: replaces services/bff
│   └── cli/             # NEW: worker
├── packages/
│   ├── config/
│   ├── db/
│   ├── env/
│   ├── auth/
│   ├── api/
│   └── ui/
├── compose.yml
├── package.json (catalogs from homeland)
├── turbo.json
├── biome.json
├── bunfig.toml
├── lefthook.yml
├── mise.toml
├── .env.example
├── tsconfig.json
└── .gitignore
```

## Key Adaptations for Cyrus (from homeland)
- DB schema extensions: `devices`, `threads`, `workers`, `room_memberships` (single-room per user via better-auth user).
- Auth: GitHub provider (as specified). Device identity separate (keypair on device, public key registered).
- Env: Extend homeland's server/web/mobile env with cyrus-specific (TURSO_URL for local metadata? later, signaling urls, etc.).
- No casbin/module permissions initially unless needed for sharing (personal use).
- Server responsibilities: Better Auth, device bootstrap/registration, presence, WebSocket signaling only. No thread storage.
- CLI (worker): Registers as device, advertises capabilities, runs AgentRuntime adapters, owns ACP sessions locally.
- Desktop: Electrobun + React (web app embedded).
- Mobile: Expo + RN, use t3code mobile thread patterns.
- Web: TanStack Router, seed thread UI components from t3code's chat/threads.

## Reference Extractions (to copy/adapt)
- From homeland: all root manifests, package.jsons, env patterns, auth/db wiring, oRPC + elysia bff, ui components, mobile layout, desktop bun shell.
- From t3code: ThreadFeed.tsx, ThreadDetailScreen, Composer, chat components, thread state (adapt to our metadata), mobile thread navigation.
- From omnigent: runner concept → map to apps/cli + worker runtime; agent composition (entities/agent.py patterns) → define AgentRuntime interface + adapters.

## Next Steps (after this plan)
See sibling plans:
- 02-root-and-tooling.md
- 03-packages.md
- 04-apps-structure.md
- 05-cyrus-domain.md
- 06-thread-ui-seed.md
- 07-agent-runners.md
- ...

## Success Criteria
- `bun install` succeeds with homeland catalog.
- `bun run check-types` and biome clean on skeleton.
- Can run `bun run dev:db`, `bun run dev` (server + web).
- apps/cli can be invoked: `bun run --filter @cyrus/cli start`.
- DB has auth tables + initial cyrus tables (devices, threads).
- Login via GitHub works in web/mobile/desktop.
- Placeholder thread list appears (metadata only).

## Risks / Notes
- Turso vs Postgres: Homeland uses Postgres for server. For local device metadata, workers will use Turso (libSQL) locally. Server DB is for auth + registered devices + thread metadata sync (lightweight). Clarify in later plan.
- Device keypairs: Generated locally, never sent to server except publicKey + deviceId.
- Keep execution local: Agents run only in apps/cli worker processes or on UI+worker devices.
- Avoid localhost shortcuts: Even local comms via WebRTC DataChannels.

---
Follow the numbered plans sequentially. Update status in each.
