# Plan: Root Manifests, Tooling, and Configs (02)

**Depends on**: 01  
**Goal**: Replicate homeland root files exactly into cyrus root.

## Tasks
1. Copy/adapt:
   - package.json (name: cyrus, update workspaces, keep catalog, update scripts for cyrus apps: web, mobile, desktop, server, cli. Remove bff. Add cli scripts.)
   - turbo.json (global envs, tasks; add cli if needed)
   - bunfig.toml (exact)
   - biome.json (exact, adjust ignores if needed)
   - tsconfig.json (extends config)
   - lefthook.yml (biome)
   - mise.toml (bun)
   - compose.yml (postgres for server metadata/auth)
   - .env.example (root + per-app)
   - .gitignore (homeland's)
   - README.md (high level, point to ARCHITECTURE)
2. Add root .env.example updates for:
   - DATABASE_URL (server metadata)
   - BETTER_AUTH_*
   - CORS_ORIGIN
   - Later: signaling, webrtc turn etc. (commented)
3. Ensure no services/ directory created.
4. Add scripts:
   - dev:server, dev:cli, build:cli, etc.
5. Run `bun install` and verify.

## Deliverables
- Clean `bun run check` / types on root.
- `docker compose up` works for postgres.
- `bun run db:push` target wired (via packages/db).

## Notes
- Keep "catalog" from homeland for consistency.
- Package names: @cyrus/* (or keep @homeland/* temporarily? Prefer @cyrus to avoid confusion).
- Use "cyrus" as project name.
