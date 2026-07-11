## 1. Schema and constants

- [x] 1.1 Update `agentEntrySchema` to `{ registryId, name, icon }` keyed by registry id
- [x] 1.2 Add `ACP_CACHE_DIR` constant (`~/.cyrus/acp`) and `ACPR_BIN_DIR` (`~/.cyrus/bin`) to CLI constants
- [x] 1.3 Extend `RegisteredAgentSchema` with `id`, `name`, `icon`; update `ListAgentsOutputSchema`

## 2. acpr path resolution and embedding

- [x] 2.1 Add `apps/cli/assets/acpr` gitignore entry and `acpr.rev` pin file
- [x] 2.2 Implement `src/lib/acpr.ts`: resolve path, extract embedded binary on standalone first use, stamp rev at `~/.cyrus/bin/.acpr-rev`
- [x] 2.3 Support `CYRUS_ACPR_PATH` and `Bun.which("acpr")` fallback in dev mode
- [x] 2.4 Add embed import `import acprBin from "../assets/acpr" with { type: "file" }` wired to extract logic

## 3. Registry integration

- [x] 3.1 Add Zod schema for cached ACP registry JSON (id, name, icon, distribution)
- [x] 3.2 Implement `readCachedRegistry()` reading `~/.cyrus/acp/registry.json`
- [x] 3.3 Implement `syncRegistry()` shelling out to `acpr --list --force registry --cache-dir ~/.cyrus/acp`
- [x] 3.4 Implement `warmRegistryCache()` via `acpr --list --cache-dir ~/.cyrus/acp`
- [x] 3.5 Add cheap preflight helpers: platform match for binary agents, npx/uvx PATH check

## 4. Agents store refactor

- [x] 4.1 Update `agents.ts` add/remove/list/get for new schema (registry id as key)
- [x] 4.2 Change `addAgent` to accept registry id, look up metadata from cached registry, write yml
- [x] 4.3 Remove PATH filtering from `listAvailableAgents`; return all enabled agents with metadata
- [x] 4.4 Update `agentEntryToProfile` to spawn `acpr <registryId> --cache-dir ~/.cyrus/acp`

## 5. CLI commands

- [x] 5.1 Add `cyrusd agents registry list` — ids only, green if added / blue if not
- [x] 5.2 Add `cyrusd agents registry sync` — delegates to acpr force refresh
- [x] 5.3 Rewrite `agents add <registry-id>` — validate id, preflight warn/fail, no --cmd/--args
- [x] 5.4 Update `agents list` to show id, name, icon url
- [x] 5.5 Remove `agents update` command and handler
- [x] 5.6 Update `agents doctor` to spawn via acpr and run ACP handshake
- [x] 5.7 Update `agents rm` messaging for registry ids

## 6. Worker and wire API

- [x] 6.1 Update `handlers/controller/agents.ts` listAgents output shape
- [x] 6.2 Update `AgentPool` / ping to use acpr-resolved spawn profile
- [x] 6.3 Remove `isCommandAvailable` filtering from listAgents path

## 7. Web composer

- [x] 7.1 Update `footer-controls.tsx` agent select to show icon + display name
- [x] 7.2 Update `useAgentCatalog` to use `id`/`name`/`icon` from wire schema

## 8. Build and release

- [x] 8.1 Add CI script to download acpr from cargo-quickinstall per target (fallback cargo install for missing targets)
- [x] 8.2 Update `apps/cli` build script to require `assets/acpr` before compile
- [x] 8.3 Add npm platform package structure (`@cyrus/cli` meta + optional deps) — stub if full publish is follow-up
- [x] 8.4 Document breaking change: delete old agents.yml, run registry sync + agents add

## 9. Verification

- [x] 9.1 Manual test: registry sync → registry list → add → list → doctor → spawn prompt
- [x] 9.2 Manual test: standalone extract acpr to ~/.cyrus/bin/acpr on first spawn
- [x] 9.3 Run `bun check` and `bun check:types`
