## Purpose

Zod wire/ORPC contract schemas, signaling schemas, and shared enum primitives in `@cyrus/schemas` as a zod-only leaf package — separate from `@cyrus/connections` runtime code.

## Requirements

### Requirement: Wire schemas live in @cyrus/schemas

The system SHALL define all ORPC wire contract schemas and signaling schemas in `@cyrus/schemas`, not in `@cyrus/connections`. Wire schemas SHALL reside under `@cyrus/schemas/rtc/*` (chat, threads, projects, catalog, dir, agents, hello, common) and `@cyrus/schemas/signaling`. Schema shapes and ORPC contract definitions SHALL remain unchanged — only package location and import paths change.

#### Scenario: Consumer imports wire schema from schemas package

- **WHEN** a package needs `ProjectSchema`, `ThreadSchema`, or `AgentEventSchema`
- **THEN** it imports from `@cyrus/schemas/rtc/projects`, `@cyrus/schemas/rtc/threads`, or `@cyrus/schemas/rtc/chat`
- **AND** it does not import from `@cyrus/connections/schemas/*`

#### Scenario: Connections contracts reference schemas package

- **WHEN** `@cyrus/connections` defines ORPC contracts in `contracts/`
- **THEN** contract input/output schemas are imported from `@cyrus/schemas/rtc/*` or `@cyrus/schemas/signaling`
- **AND** no schema files remain under `shared/connections/src/schemas/`

### Requirement: Schemas package is a zod-only leaf

The `@cyrus/schemas` package SHALL depend only on `zod` (and dev tooling). It SHALL NOT depend on `@cyrus/connections`, `@cyrus/utils`, ORPC, WebRTC, or PartySocket.

#### Scenario: Database validates without connections runtime

- **WHEN** `@cyrus/database` validates persisted rows with `ProjectSchema` or `ConversationEntrySchema`
- **THEN** its `package.json` lists `@cyrus/schemas` (directly or via `@cyrus/utils`) as a dependency
- **AND** it does not list `@cyrus/connections` as a dependency

#### Scenario: Utils folds without connections runtime

- **WHEN** `@cyrus/utils` imports `ConversationEntry` and `AgentEvent` types for `fold()`
- **THEN** it imports from `@cyrus/schemas/rtc/*`
- **AND** it does not list `@cyrus/connections` as a dependency

### Requirement: Shared enums in dedicated modules

The system SHALL define reusable Zod enum schemas in `shared/schemas/src/enums/` as individual modules. Wire schema files SHALL import shared enums from `@cyrus/schemas/enums/*` rather than defining duplicate inline enums.

#### Scenario: Tool enums imported from enums package

- **WHEN** `rtc/chat.ts` references `ToolCallStatus` or `ToolKind`
- **THEN** it imports `ToolCallStatusSchema` and `ToolKindSchema` from `@cyrus/schemas/enums/tools`

#### Scenario: Plan enums extracted to enums package

- **WHEN** `rtc/chat.ts` references plan entry priority or status
- **THEN** it imports `PlanEntryPrioritySchema` and `PlanEntryStatusSchema` from `@cyrus/schemas/enums/plan`

#### Scenario: Permission enums extracted to enums package

- **WHEN** `rtc/chat.ts` references permission option kinds
- **THEN** it imports `PermissionOptionKindSchema` from `@cyrus/schemas/enums/permissions`

### Requirement: No compatibility re-exports from connections

The system SHALL NOT re-export wire schemas from `@cyrus/connections`. All consumers SHALL import schemas directly from `@cyrus/schemas`.

#### Scenario: New code uses correct import path

- **WHEN** a developer adds an import for a wire schema type
- **THEN** the import path starts with `@cyrus/schemas/`
- **AND** no `export { ... } from "@cyrus/schemas/..."` shim exists in `@cyrus/connections`

### Requirement: chat RPC returns turn acknowledgment

The controller contract `chat` operation SHALL output `ChatOutputSchema` (`{ threadId: string, turnId: string }`) instead of `eventIterator(ChatChunkSchema)`.

#### Scenario: Contract type is unary

- **WHEN** `controllerContract` is defined in `shared/connections/src/contracts/controller.ts`
- **THEN** `chat` uses `.output(ChatOutputSchema)` and not `eventIterator(ChatChunkSchema)`

#### Scenario: ChatOutput schema is exported

- **WHEN** a consumer imports chat types from `@cyrus/schemas/rtc/chat`
- **THEN** `ChatOutputSchema` and `ChatOutput` type are available

### Requirement: watchThread and unwatchThread contract schemas

The controller contract SHALL define `watchThread` and `unwatchThread` operations with Zod schemas in `@cyrus/schemas/rtc/threads` (or `rtc/chat` if colocated).

`WatchThreadInputSchema` SHALL contain `threadId: string`.
`WatchThreadOutputSchema` SHALL contain `snapshotHighWaterMark: number`.
`UnwatchThreadInputSchema` SHALL contain `threadId: string`.

#### Scenario: Watch RPC is on controller contract

- **WHEN** `controllerContract` is inspected
- **THEN** `watchThread` and `unwatchThread` are defined with the schemas above

#### Scenario: subscribe remains eventIterator

- **WHEN** `controllerContract` is inspected
- **THEN** `subscribe` still outputs `eventIterator(ChatChunkSchema)`

### Requirement: Bind agent wire contract

The controller contract SHALL define `bindAgent` accepting `threadId`, `projectId`, and `agentName`, returning catalog snapshot and bound session metadata.

#### Scenario: Bind output includes catalog

- **WHEN** a client calls `bindAgent`
- **THEN** the response includes models, modes, efforts, personas, and agent capabilities sufficient to populate the composer footer

### Requirement: Thread-scoped catalog inputs

Catalog controller operations (`getModels`, `getModes`, `getEfforts`, `getPersonas`, `setModel`, `setMode`, `setEffort`, `setPersona`) SHALL require `threadId` in their input schemas.

#### Scenario: getModels requires threadId

- **WHEN** `GetModelsInputSchema` is defined
- **THEN** it includes `threadId` as a required field

### Requirement: Thread schema wire fields

`ThreadSchema` SHALL include optional `sessionId` and `agentLocked` fields.

#### Scenario: Thread wire shape

- **WHEN** a consumer imports `ThreadSchema`
- **THEN** `sessionId` and `agentLocked` are optional fields on the thread object

### Requirement: Git wire schemas in @cyrus/schemas/rtc/git

The system SHALL define git RPC input/output schemas in `@cyrus/schemas/rtc/git.ts` as Zod schemas exportable from `@cyrus/schemas/rtc/git`.

#### Scenario: Git status schema

- **WHEN** a consumer imports git types from `@cyrus/schemas/rtc/git`
- **THEN** `GitStatusInputSchema`, `GitStatusOutputSchema`, and `GitFileChangeSchema` are available
- **AND** `GitStatusOutputSchema` includes `isRepo`, optional `refName`, `files`, `insertions`, and `deletions`

#### Scenario: Git patch schema

- **WHEN** a consumer imports git patch types
- **THEN** `GitPatchInputSchema` accepts `{ threadId, path? }`
- **AND** `GitPatchOutputSchema` contains `{ patch: string }`

#### Scenario: Git action schemas

- **WHEN** a consumer imports git action types
- **THEN** schemas exist for `listGitRefs`, `checkoutGitRef`, `createGitWorktree`, and `removeGitWorktree` inputs and outputs

### Requirement: ThreadSchema git context fields

`ThreadSchema` in `@cyrus/schemas/rtc/threads` SHALL include optional nullable fields `branch: string | null` and `worktreePath: string | null`.

#### Scenario: Thread wire shape includes git fields

- **WHEN** `ThreadSchema` is parsed for a thread with git context
- **THEN** `branch` and `worktreePath` are accepted as optional nullable strings
- **AND** threads without these fields parse successfully with defaults of null

### Requirement: Structured prompt input

`ChatInputSchema` SHALL accept `message` as a non-empty array of prompt content blocks (text and resource), not a plain string.

#### Scenario: Text and resource blocks

- **WHEN** the client sends a message with text and resource blocks
- **THEN** the schema accepts the array and the worker maps blocks to ACP prompt content

#### Scenario: Plain string rejected

- **WHEN** the client sends a plain string message
- **THEN** schema validation fails

### Requirement: Context usage query

The controller SHALL provide optional `getContextUsage({ threadId })` returning usage numbers when the session exposes them.

#### Scenario: Usage returned

- **WHEN** the agent session reports token usage metadata
- **THEN** `getContextUsage` returns used and limit values
