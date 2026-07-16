# Two schema layers — wire and view — joined by a pure fold()

_Decided 2026-07-09._

A thread's conversation is an append-only event log on the wire; clients derive render state through a pure, platform-agnostic `fold()` in `@cyrus/utils` that produces Zod-validated view schemas (`MessageView`, `ToolCallView`, `DiffView`, `TurnView`, `ThreadConversation`). View schemas keep wire/ACP field names end-to-end (`toolCallId`, `cwd`, `name`) — there is deliberately no client-side rename/alias layer. Feed layout (`FeedEntry`, `deriveFeed`) is presentation-only shared code and never part of wire or view schemas.

## Considered options

- Extending `ThreadSchema` with embedded `messages[]` — rejected: the thread list RPC must stay light.
- A server-side pre-folded projection endpoint — rejected: conflicts with the offline/sync goal.
- UI-friendly field aliases — rejected explicitly; one vocabulary from wire to screen.
