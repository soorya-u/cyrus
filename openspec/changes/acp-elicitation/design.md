## Context

ACP elicitation is unstable in protocol but supported by major external agents. Similar blocking pattern to permissions: agent requests input, client must respond via `session/complete_elicitation` or equivalent through `@acp-kit`.

**PR #49 context (merged):** Web timeline uses flat `FeedEntryView` with per-entry rows (`tool`, `diff`, `message`). Elicitation UI renders as its own flat feed entry via `feed-entry-view.tsx` — not inside a collapsible work log.

## Goals / Non-Goals

**Goals:** Form and URL elicitation modes, persisted events, respond RPC, feed UI.

**Non-goals:** Custom dialog types beyond ACP schema.

## Decisions

### 1. Host bridge

Implement client-side elicitation callback in ACP host (alongside requestPermission). Emit `elicitation_request` wire event with schema fields + elicitationId.

### 2. respondElicitation RPC

Input: `{ threadId, elicitationId, action: accept | decline, content?: Record<string, unknown> }`.

Maps to ACP complete elicitation notification/response.

### 3. UI

Form mode: dynamic fields from JSON schema in event, rendered in `feed-entry-view.tsx` as a flat `elicitation` feed entry. URL mode: link + confirm button in the same pattern.

### 4. Capability gating

Only show/subscribe if bind snapshot includes elicitation capability (from initialize/client caps negotiation stored at bind).

## Risks / Trade-offs

- **[Risk] Protocol drift** → Pin to `@agentclientprotocol/sdk` types; feature-detect per agent

## Migration Plan

Additive; no schema migration beyond wire events.

## Open Questions

- None for v1.
