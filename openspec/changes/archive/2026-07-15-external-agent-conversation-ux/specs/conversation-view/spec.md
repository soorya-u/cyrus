## ADDED Requirements

### Requirement: Catalog refresh on model change

When the user changes model for a bound thread, the client SHALL invalidate and refetch effort and persona catalog queries for that thread. The worker SHALL return updated config options from the bound session after `setModel` completes.

#### Scenario: Effort options refresh

- **WHEN** `setModel` succeeds for a thread
- **THEN** the client refetches `getEfforts` and `getPersonas` for that thread
- **AND** invalid prior selections reset to a valid default

### Requirement: Draft composer client persistence

The web and mobile clients SHALL persist unsent composer text per thread using client-side storage (Zustand persist). Draft text SHALL survive navigation and app reload on the same device.

#### Scenario: Draft restored on return

- **WHEN** the user navigates away from a thread with unsent composer text and returns
- **THEN** the composer is pre-filled with the saved draft

#### Scenario: Draft cleared on send

- **WHEN** the user successfully sends a message
- **THEN** the persisted draft for that thread is cleared

## MODIFIED Requirements

### Requirement: View schemas for folded conversation data

The system SHALL define Zod view schemas in `@cyrus/schemas/view` for the client-derived conversation shape: `MessageViewSchema`, `ToolCallViewSchema`, `DiffViewSchema`, `TurnViewSchema`, and `ThreadConversationSchema`. TypeScript types SHALL be derived via `z.infer` with no parallel hand-rolled definitions. View schemas SHALL include representations for thread error entries and diff review state where applicable.

#### Scenario: View schemas use wire and ACP field names

- **WHEN** a consumer imports view types from `@cyrus/schemas/view`
- **THEN** tool call fields use `toolCallId` and `title` (not `id` and `name`)
- **AND** project paths use `cwd` from `ProjectSchema` (not a separate `path` alias)

#### Scenario: Error entries fold into conversation view

- **WHEN** `fold()` processes a thread error event
- **THEN** the result includes a renderable error entry associated with the correct turn
