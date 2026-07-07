## Context

`apps/cli/src/store/{projects,threads}.ts` back `Project`, `Thread`, and `ConversationEntry` with plain `Map`s (both files carry a `// TODO: Delete this and store in turso` comment). `ConversationEntry` already comes from `@cyrus/connections` (`shared/connections/src/schemas/rtc/threads.ts`); its `id` is generated from a process-local `conversationSeq` counter with no ordering semantics exposed to callers. `getConversations(threadId)` always returns the full history. `chat.ts`'s `emit()` calls `context.broadcaster.broadcast()` before `appendConversation()` — safe today because the store write is synchronous.

Separately, issue #15 (live-broadcast scoping, tracked independently) needs a way for a peer that starts watching a thread mid-conversation to fetch "everything since I started watching" without racing the live broadcast stream. That requires a durable, monotonic ordering key on conversation entries — something the in-memory store never had reason to expose. This design covers only what #13 needs to ship; the consumer of the cursor (`watchThread`/`unwatchThread`, broadcaster filtering) is out of scope here.

## Goals / Non-Goals

**Goals:**
- Conversation history, threads, and projects survive CLI worker restarts.
- Persisted `ConversationEntry` rows are semantically meaningful (one per finished message/tool event), not one per raw ACP stream fragment.
- Expose a monotonic `seq` on `ConversationEntry`/`ChatChunk` and a cursor param on `getConversations`, so a future consumer (#15) has what it needs without another schema migration.
- Broadcast always carries the durable sequence assigned at persistence time.

**Non-Goals:**
- Implementing #15's `watchThread`/`unwatchThread` RPC or `PeerBroadcaster` filtering.
- Multi-device sync or remote Turso replication — this is a local-only file per device.
- Unifying the hand-rolled `Project` type with `ProjectSchema` (issue #10).
- Handling concurrent writers to the same local DB file from multiple CLI processes — one active worker per device is assumed, matching the existing single-process model.

## Decisions

**Turso database engine (`@tursodatabase/database`) in local-file mode, not `@libsql/client` or `better-sqlite3`/`node:sqlite`.**
`@libsql/client` (the older libSQL fork of SQLite) is production-ready today and would work for this change in isolation, but the CLI's store is not the only place this engine choice matters: Cyrus needs the same schema and ORM layer to run in the browser (`apps/web`), on desktop, and on mobile (Expo/React Native) eventually, with a single source-of-truth sync strategy across devices. Only the new Turso engine family gives all of that as one coherent story:
- Official WASM build for browser (`@tursodatabase/database-wasm`) and official React Native bindings (`@tursodatabase/sync-react-native`), both backed by the same Rust core and a consistent driver-level API (connect/execute is shared; `sync`/`sync-react-native` add `push`/`pull`/`checkpoint` on top) — libSQL has no official mobile bindings, and its JS/WASM SDKs are being superseded by the Turso-native ones going forward.
- A CDC-based, single-source-of-truth sync protocol (`@tursodatabase/sync`, `push`/`pull` against a remote as the source of truth) — this is the model a future cross-device sync engine (potentially over Cyrus's own WebRTC transport) would build on. libSQL's sync story is an older embedded-replica/Hrana-based read-replica model, not a fit for "one source of truth, bidirectional."
- Architecture built for this project's actual shape: async I/O and MVCC (concurrent readers/writers) versus libSQL's single-writer SQLite-fork lineage.

The real cost: `@tursodatabase/database` is beta, versus `@libsql/client`'s production-ready status, and Drizzle's adapter for the new engine (`drizzle-orm/tursodatabase/database`) is itself beta and, as of this writing, only covers the Node/desktop/CLI package — there's no confirmed Drizzle adapter yet for `@tursodatabase/database-wasm` or `@tursodatabase/sync-react-native`. For this change specifically (CLI-only, no ORM), that gap doesn't block anything — `apps/cli`'s store talks to the driver directly, not through Drizzle. It matters for whichever later change extends this store to browser/desktop/mobile, and is called out as an open question below rather than solved here.

**Global monotonic `seq` via SQLite's native rowid/autoincrement, not a per-thread counter.**
A per-thread sequence (resetting at 0 per thread) would need its own counter table and a transaction to avoid races, since SQLite's `AUTOINCREMENT` is table-scoped, not partition-scoped. A single global sequence is free (native `INTEGER PRIMARY KEY AUTOINCREMENT`) and is sufficient for the cursor use case, since every read is already scoped by `thread_id`: `WHERE thread_id = ? AND seq > ? ORDER BY seq`. Density (gaps in a thread's own sequence from other threads' writes) doesn't matter — nothing needs contiguous per-thread numbers, only "greater than."

**`conversation_entries.chunk` stored as a JSON text column, not normalized into typed columns.**
`ChatChunk` is a validated zod discriminated union at the point it's written (it's already been through the RPC/handler boundary). Storing the serialized JSON keeps the table schema stable as `AgentEvent` variants evolve, at the cost of not being able to query inside the chunk from SQL — acceptable, since nothing today needs to query by event type.

**Persist-before-broadcast, using `INSERT ... RETURNING seq`.**
`emit()` in `chat.ts` currently broadcasts first. Once persistence is a Turso call (async, even against a local file — Bun's event loop still yields), broadcasting first means a peer could observe a `ChatChunk` before it's durable. Flipping the order and obtaining `seq` via `RETURNING` in the same round trip avoids a separate read-after-write.

**Per-message buffering lives in the write path (`chat.ts`/`runtime.ts`), scoped to a single turn — no cross-request cache needed.**
Unlike a long-lived server handling many concurrent conversations (where a buffer needs a TTL and eviction), each `chat()` call in this CLI is one `AsyncGenerator` for one turn. A `Map<messageId, string>` local to that generator's closure, flushed at `message.completed`/`reasoning.completed` and discarded when the generator returns, is sufficient — no TTL or cross-turn state required.

## Risks / Trade-offs

- **[Risk]** Persist-before-broadcast couples live-streaming latency to local disk I/O, where today it's pure in-memory. → **Mitigation**: local Turso file I/O is expected to be sub-millisecond in practice; enable WAL mode for the connection to avoid write-lock stalls under the existing `CYRUS_STREAM_THROTTLING_MS` emit cadence.
- **[Risk]** `@tursodatabase/database` is beta software — API surface, on-disk format, or stability could shift before GA. → **Mitigation**: isolate all Turso access behind the existing store function signatures (`apps/cli/src/store/{projects,threads}.ts`); a later swap to `@libsql/client` (or a GA `@tursodatabase/database`) stays contained to that layer.
- **[Risk]** Adding a required `seq` field to `ChatChunk` is a breaking wire-schema change. → **Mitigation**: `apps/cli` and `shared/connections` live in the same Bun workspace and are versioned together; there's no independently-deployed older client to stay compatible with.
- **[Risk]** The new "message completed" `AgentEvent` variant needs a corresponding case in every consumer that pattern-matches `AgentEvent.type` (e.g. `apps/web`'s conversation cache). → **Mitigation**: today those completed events fall into the generic `session_update` catch-all, which consumers already have to handle defensively; adding a named variant is additive, not a removal.

## Migration Plan

No data migration is needed — the existing store is in-memory only, so there is nothing durable to carry forward. Rollout is simply: on first run, create the Turso DB file under `CYRUS_HOME` and run `CREATE TABLE IF NOT EXISTS` for `projects`, `threads`, and `conversation_entries`. No rollback concerns beyond deleting the DB file to reset to a clean state, same as today's implicit reset-on-restart behavior.

## Open Questions

- Should the Turso connection enable WAL mode and a `busy_timeout` by default, or leave SQLite defaults? Leaning WAL, but not load-bearing for this design.
- Exact on-disk filename/path convention under `CYRUS_HOME` (e.g. `store.db` vs `cyrus.db`) — cosmetic, can be decided during implementation.
- When Cyrus extends this store to `apps/web` (browser, via `@tursodatabase/database-wasm`) and `apps/mobile` (via `@tursodatabase/sync-react-native`), will Drizzle have shipped adapters for those two packages by then, or will those platforms need to go through Drizzle's libSQL adapters (same schema file, different underlying engine on those platforms only) as an interim step? Not blocking for this change; worth checking before that follow-on work starts.
- What does the eventual sync engine (single source of truth, potentially over Cyrus's WebRTC transport rather than HTTP) look like on top of `@tursodatabase/sync`'s `push`/`pull` model? Turso's documented local-sync-server protocol doesn't expose a pluggable transport today, so this would likely mean reimplementing the CDC push/pull semantics over WebRTC rather than swapping a transport option. Out of scope for this change; noted here since the `seq`-ordered write path this change introduces is the same foundation that sync work would build on.
