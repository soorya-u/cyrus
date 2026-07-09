## ADDED Requirements

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
