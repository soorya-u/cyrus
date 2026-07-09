## ADDED Requirements

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
