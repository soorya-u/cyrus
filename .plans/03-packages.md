# Plan: Packages (03)

**Depends on**: 02

## Packages to Create (exact from homeland)

### packages/config/
- package.json (minimal)
- tsconfig.base.json (copy exact from homeland)

### packages/env/
- package.json
- src/server.ts (DATABASE_URL, BETTER_AUTH_*, CORS, NODE_ENV + cyrus additions later)
- src/web.ts (VITE_*)
- src/mobile.ts (EXPO_PUBLIC_*)
- src/cli.ts ? (for worker local env if needed)

### packages/db/
- package.json (drizzle, pg, @cyrus/env)
- drizzle.config.ts
- src/index.ts : createDb()
- src/schema/
  - index.ts
  - auth.ts (better-auth generated)
  - cyrus.ts or threads.ts, devices.ts (new)
- scripts or just use drizzle-kit

Initial Cyrus tables (server-side metadata only):
- devices (deviceId PK, userId, publicKey, name, lastSeen, capabilities json?)
- threads (id, title, ownerWorkerId, agent, model, updatedAt, room/user)
- workers (workerId, deviceId, capabilities, lastSeen)
- messages (light metadata only: id, threadId, role, summary?, createdAt) – or keep minimal

Better-Auth will generate user/session/account tables.

### packages/auth/
- package.json
- src/index.ts : createAuth() with GitHub provider, expo plugin
- src/client/web.ts, mobile.ts
- plugins if needed
- Use GitHub as primary (as per ARCHITECTURE)

### packages/api/
- orpc base: publicProcedure, protected, context with session + db
- routers: health, devices, threads (metadata only), workers (capabilities)
- No heavy execution here.

### packages/ui/
- shadcn/ui setup from homeland
- Copy components: button, input, card, sonner, etc.
- Tailwind + globals

## Steps
1. Create dirs and files mirroring homeland exactly.
2. Update imports to use @cyrus/* scope.
3. Wire db schema for cyrus entities.
4. Ensure auth:generate works for better-auth schema.
5. db:push, db:generate targets.

## Cyrus Scope Decision
Use `@cyrus/` for all internal packages to distinguish from homeland.

## Verification
- After packages, `bun run db:generate` and `db:push` (with postgres running) succeed.
- Auth tables + cyrus tables present.
