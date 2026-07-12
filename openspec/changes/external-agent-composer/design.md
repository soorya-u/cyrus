## Context

After PR #49, the web composer uses `AgentModelPicker` (agent+model), `CompactComposerControls` (effort/persona on narrow viewports), and `composer/index.tsx` with a textarea placeholder referencing `@files` and `/commands` — aspirational only. Mode selector, capabilities cache, token usage, slash autocomplete, prompt queue, and real attachments are still unimplemented. `getModes`/`setMode` exist server-side. Prompt is plain string in `chat` RPC.

## Goals / Non-Goals

**Goals:** Mode selector, capability-gated UI, token/context display, slash autocomplete, prompt queue, @file + @URL in prompts.

**Non-goals:** Images, auth, MCP, edit/resubmit.

## Decisions

### 1. Capabilities from bindAgent

Extend `BindAgentOutput` with `capabilities` object (prompt, session, auth flags from ACP initialize + session). Client stores per thread; controls visibility of attachment button, token meter, etc.

### 2. Mode selector

Add mode control to composer footer: inline `CatalogSelect` on wide viewports (alongside effort/persona in `footer-controls.tsx`), or a third section in `compact-composer-controls.tsx` overflow on mobile. Uses thread-scoped `getModes`/`setMode`. Align with `openspec/specs/composer-ui` compact breakpoint (~620px).

### 3. Token / context consumption

If session exposes usage via ACP session updates or config meta, map to `context_usage` wire event or thread-scoped query `getContextUsage({ threadId })`. Display in composer footer as "X / Y tokens" when data available; hide when agent doesn't report.

### 4. Slash commands

Worker subscribes to session `availableCommands` updates after bind; pushes `catalog_commands` event or includes in bind snapshot refresh. Client autocomplete when user types `/`.

### 5. Prompt queue

Client queue in Zustand (per thread): while `isThreadActive`, append to queue instead of immediate send. On turn complete, auto-send next or user-triggered. Worker unchanged — sequential `chat` calls. Steer/interrupt-not-in-scope for external agents.

PR #49 added `sending` dedup in `composer/index.tsx` — prompt queue should compose with (not replace) that guard.

Server option: accept optional `queueBehavior` later — v1 client-only queue.

### 6. Attachments (@file, @URL)

Extend chat input to structured blocks:

```ts
{ type: 'text', text } | { type: 'resource', uri, name? }
```

Worker maps to ACP `PromptRequest` content blocks. File paths resolved relative to project cwd on worker when agent expects path strings; URI fetch for URLs delegated to agent or worker readTextFile if needed.

Images: omitted — capability gate hides image attach when unsupported.

## Risks / Trade-offs

- **[Risk] Queue + cancel races** → Same cancel snapshot semantics as existing `stopThread`
- **[Risk] Large attachment payloads** → Limit file size/count in validation

## Migration Plan

**BREAKING:** `chat` message field becomes structured content array (or union string | blocks with string default for backward compat during transition).

## Open Questions

- URL fetch on worker vs pass-through to agent? **Pass URI in prompt block; agent fetches if capable.**
