# Plan: Local Execution DB, Sync & Full Runtime (09)

**Depends on**: 05, 07

## Local Metadata + Execution
- Every device (esp. workers) has local Turso (libSQL file or in-memory for UI-only).
- Server Postgres: only auth + lightweight shared metadata (thread titles, owner, summaries, device registry).

## Tables (local on worker)
- threads (full)
- messages (full content + events)
- sessions (acp session ids, repo paths, checkpoints json)
- workers (local view)
- settings

## Sync Strategy (shared metadata)
- Workers push metadata changes (title, last message summary, updatedAt) to server via RPC or P2P broadcast to other known peers.
- UI devices pull metadata from server (or receive via P2P from any online peer).
- Conflict: last-writer-wins on updatedAt, or simple vector later.
- Never sync full context or raw execution state.

## Event Streaming
- Owner worker is source of truth for live AgentEvents.
- Stream over WebRTC to all observers in thread.
- Observers render in real-time.
- On disconnect, can replay from local or ask owner for recent history (summary).

## Continuation from any device
- UI on any device sends Prompt to ownerWorker (resolved via metadata).
- If owner offline: explicit migration UI, or queue? (defer).

## Tool calls / Approvals
- Events include ApprovalRequest.
- Any observing UI can respond (approval flows back to owner via P2P).

## File Diffs
- Workers compute diffs locally.
- Stream FileDiff events.
- UIs render.

## Offline Friendly
- Worker can run fully offline.
- When back online: register, sync metadata, rejoin P2P rooms.

## Turso Integration
- packages/local-db or per-app.
- Use libsql client + drizzle? (drizzle supports libsql).
- Migration story: same schema files? or separate.

## Verification
- Worker creates local thread execution.
- UI on another device sees updated title/summary (via server metadata sync).
- Live token stream appears on observer.
- Worker restarts, resume(sessionId) works locally.

## Later
- Full-text search across local.
- Snapshot export for migration.
- Encrypted at rest for local? (device key).
