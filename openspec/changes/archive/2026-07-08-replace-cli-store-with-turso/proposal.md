## Why

`apps/cli/src/store/{projects,threads}.ts` are in-memory `Map`s — every project, thread, and conversation entry is lost on worker restart. ACP's `session/load` cannot fill this gap: direct testing (see issue #13's comment) confirmed it resumes the agent's own reasoning state but never replays transcript content to the client. The store needs a durable backing, and since this is the moment its schema gets rewritten anyway, it's also the right time to give `ConversationEntry` a real, monotonic sequence — issue #15 (live-broadcast scoping) already needs a cursor-based catch-up read to solve a client join race, and retrofitting that later would mean a second schema migration.

The specific engine matters beyond this change too: Cyrus will eventually need the same schema running in the browser and on mobile, plus a single-source-of-truth sync strategy across devices. Only Turso's new database engine (as opposed to the older libSQL fork) ships official WASM and React Native bindings and a CDC-based sync protocol — so this change adopts that engine now rather than picking the safer, production-ready libSQL and having to migrate later.

## What Changes

- Replace `apps/cli/src/store/{projects,threads}.ts`'s `Map`-based storage with a Turso (`@tursodatabase/database`, local file under `CYRUS_HOME`) backed store for `Project`, `Thread`, and `ConversationEntry`.
- Add a monotonic `seq` column to `conversation_entries`; expose `seq` on the `ConversationEntry` and `ChatChunk` schemas. **BREAKING**: `ChatChunk`'s wire shape gains a required `seq` field.
- Add an optional `afterSeq` cursor param to the `getConversations` RPC input schema and handler.
- Flip `chat.ts`'s `emit()` to persist before broadcasting: obtain the DB-assigned `seq` (`INSERT ... RETURNING seq`), attach it to the `ChatChunk`, then call `PeerBroadcaster.broadcast()`. Today broadcast fires first — harmless against a synchronous `Map`, but an ordering hazard once persistence is async.
- Add a first-class "message completed"/"reasoning completed" `AgentEvent` case in `apps/cli/src/core/acp/events.ts` (currently silently dropped into a generic `session_update` catch-all), and buffer per-`messageId` text/thought deltas in the write path so exactly one `ConversationEntry` is persisted per finished message — not one per raw ACP fragment. Live delta broadcast to the UI is unaffected. Tool call / tool-call-update / plan events remain atomic and persist immediately, as today.

## Capabilities

### New Capabilities
- `conversation-persistence`: Turso-backed durable store for projects, threads, and conversation entries, with a monotonic sequence for cursor-based reads.

### Modified Capabilities
- `acp-session-router`: adds a requirement that the worker emit a discrete "message completed"/"reasoning completed" `AgentEvent` carrying the full accumulated text, in addition to the existing raw per-fragment deltas.

## Impact

- `apps/cli/src/store/{projects,threads}.ts` — rewritten against Turso.
- `apps/cli/src/handlers/controller/{chat,threads}.ts` — persist-before-broadcast ordering; cursor param on `getConversations`.
- `apps/cli/src/core/acp/events.ts`, `apps/cli/src/core/agents/runtime.ts` — completion event mapping and per-message buffering.
- `shared/connections/src/schemas/rtc/{chat,threads}.ts` — `seq` field, `afterSeq` cursor param.
- New dependency: `@tursodatabase/database` in `apps/cli` (beta package).
- Unblocks issue #15 (live-broadcast scoping); a natural precursor to issue #10 (Project type unification), not addressed here.

## Non-goals

- Does not implement #15's `watchThread`/`unwatchThread` RPC or `PeerBroadcaster` filtering — only exposes the `seq`/cursor primitive it depends on.
- Does not unify the hand-rolled `Project` type in `apps/cli/src/store/projects.ts` with the schema-defined `ProjectSchema` (issue #10).
- Does not add remote/synced Turso (multi-device replication) — local file only, per-device, matching the `agents.yml` convention.
- Does not add Drizzle or any ORM to `apps/cli` — the store talks to `@tursodatabase/database` directly; ORM adoption (and its browser/mobile adapter coverage) is a separate future concern.
