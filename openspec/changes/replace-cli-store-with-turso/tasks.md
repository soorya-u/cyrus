## 1. Turso setup

- [ ] 1.1 Add `@tursodatabase/database` dependency (beta) to `apps/cli/package.json`
- [ ] 1.2 Resolve the DB file path under `CYRUS_HOME` (`apps/cli/src/lib/env.ts`) and open a local-file Turso connection
- [ ] 1.3 Write `CREATE TABLE IF NOT EXISTS` schema for `projects`, `threads`, and `conversation_entries` (with `conversation_entries.seq` as `INTEGER PRIMARY KEY AUTOINCREMENT`, `chunk` as a JSON text column), run on connection init

## 2. Project and thread store rewrite

- [ ] 2.1 Rewrite `apps/cli/src/store/projects.ts` (`listProjects`, `getProject`, `createProject`, `renameProject`, `deleteProject`, `resolveProjectCwd`) against Turso, keeping existing signatures
- [ ] 2.2 Rewrite `apps/cli/src/store/threads.ts`'s thread functions (`getThread`, `listThreads`, `renameThread`, `deleteThread`, `deleteThreadsForProject`, `ensureThread`, `createThread`) against Turso, keeping existing signatures
- [ ] 2.3 Remove the `// TODO: Delete this and store in turso` comments once replaced

## 3. Conversation entry persistence with sequence and cursor

- [ ] 3.1 Add `seq: z.number()` to `ConversationEntrySchema` in `shared/connections/src/schemas/rtc/threads.ts`
- [ ] 3.2 Add `seq: z.number()` to `ChatChunkSchema` in `shared/connections/src/schemas/rtc/chat.ts`
- [ ] 3.3 Rewrite `appendConversation(threadId, chunk)` in `apps/cli/src/store/threads.ts` to `INSERT ... RETURNING seq` into `conversation_entries`, returning the persisted entry (including `seq`)
- [ ] 3.4 Add an optional `afterSeq` field to `ThreadQueryInputSchema` (or a dedicated schema) in `shared/connections/src/schemas/rtc/threads.ts`
- [ ] 3.5 Rewrite `getConversations(threadId, afterSeq?)` in `apps/cli/src/store/threads.ts` to query Turso, filtering by `seq > afterSeq` when provided, ordered by `seq`
- [ ] 3.6 Update the `getConversations` handler in `apps/cli/src/handlers/controller/threads.ts` to pass through `afterSeq`

## 4. Persist-before-broadcast ordering

- [ ] 4.1 In `apps/cli/src/handlers/controller/chat.ts`'s `emit()`, call `appendConversation` before `context.broadcaster.broadcast()`
- [ ] 4.2 Attach the `seq` returned from the persisted write onto the `ChatChunk` before broadcasting it

## 5. Coalesced message persistence

- [ ] 5.1 Add a `message.completed` case in `apps/cli/src/core/acp/events.ts` mapping to a new first-class `AgentEvent` variant (e.g. `message_completed`) carrying the full accumulated text, instead of falling through to `session_update`
- [ ] 5.2 Add the equivalent `reasoning.completed` case for thought/reasoning messages
- [ ] 5.3 Add the new event variant(s) to `AgentEventSchema` in `shared/connections/src/schemas/rtc/chat.ts`
- [ ] 5.4 In the chat turn's write path (`apps/cli/src/handlers/controller/chat.ts` and/or `apps/cli/src/core/agents/runtime.ts`), buffer `token`/`thought` deltas per `messageId` for the duration of the turn
- [ ] 5.5 On each delta: broadcast immediately as today, but skip the Turso write
- [ ] 5.6 On `message_completed`/`reasoning_completed`: persist exactly one `ConversationEntry` with the full buffered text, then broadcast that completion event
- [ ] 5.7 Confirm tool call, tool call update, and plan events are unaffected and continue to persist immediately

## 6. Verification

- [ ] 6.1 Manual test: send a multi-turn chat through `apps/cli`, restart the worker process, confirm `getConversations` still returns full prior history
- [ ] 6.2 Manual test: confirm exactly one persisted `ConversationEntry` per streamed assistant message, not one per delta (inspect the Turso DB file directly)
- [ ] 6.3 Manual test: call `getConversations` with `afterSeq` set to a mid-conversation value and confirm only later entries are returned
- [ ] 6.4 Run `bun check:types` and `bun check` across `apps/cli` and `shared/connections`
