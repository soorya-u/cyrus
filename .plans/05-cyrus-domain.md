# Plan: Cyrus Domain & Metadata (05)

**Depends on**: 04

## Goal
Define and implement the core shared metadata models while keeping execution local.

## Entities (server + shared)
- User (from better-auth)
- Device (registered)
  - deviceId (uuid or generated)
  - userId
  - publicKey
  - name (human)
  - lastSeen
  - platform? (desktop/mobile/worker)
- Worker (runtime instance on a device)
  - workerId
  - deviceId
  - capabilities: { agents: [{name, models[]}], hostname, online }
- Thread (metadata only)
  - id
  - title
  - ownerWorkerId
  - agent (e.g. "claude-code")
  - model
  - updatedAt
  - createdAt
  - userId / room (single room per user)
- Message (light metadata for list/preview)
  - id
  - threadId
  - role
  - summary (or first 100 chars)
  - createdAt
  - (full content lives on owner worker)

## Server DB (postgres via drizzle)
- Extend schema in packages/db/src/schema/cyrus.ts or threads.ts
- Relations to user
- No blobs, no full history.

## Local on workers (Turso/libsql later)
- Full execution state, ACP sessions, repos, checkpoints.

## API (oRPC in apps/server + packages/api)
- devices.register (pubkey + name + sig? bootstrap)
- devices.list
- threads.list (by user)
- threads.create (assign ownerWorker)
- threads.updateMetadata
- workers.heartbeat / capabilities.update
- presence (via ws or rpc)

## AuthZ
- All ops scoped to current user (from better-auth session)
- Device pubkey must match registered for the user.

## Device Identity
- Generated on first run of CLI or UI+worker device.
- Stored locally (never in git).
- On register: send deviceId + publicKey + name. Server stores.
- Later: challenge-response for P2P.

## Room Model
- Implicit: all devices/workers for a userId belong to user's single room.
- No explicit room table needed initially (can add later for multi-user if ever).

## Thread Ownership
- ownerWorkerId points to a worker that "owns" the ACP session.
- UI devices subscribe to metadata + events streamed from owner.

## Migration Notes
- Explicit migration only (export/import metadata + session?).

## Implementation Order
1. Add schema files.
2. Run db:generate / push.
3. Implement routers in server/api.
4. Basic CRUD in web (list/create threads as metadata).
5. CLI can "claim" a thread as owner.

## Zod schemas
- Share types in packages/api or a new packages/contracts if grows (like t3code).

## Verification
- After auth, web can list threads (empty), create a thread row (metadata only).
- CLI registers a worker for the user.
- Assign ownerWorker on thread create.
