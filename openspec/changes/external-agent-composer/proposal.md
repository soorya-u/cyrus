## Why

After draft session binding, the composer still lacks external-agent features Zed provides: permission mode selector, slash commands, prompt queue, @file/URL context, capability-gated controls, and context/token consumption display. Catalog backend for modes exists but UI omits mode; other features are unimplemented.

## What Changes

- Add mode selector to composer footer; wire `getModes`/`setMode` (thread-scoped)
- Cache agent capabilities from `bindAgent`; hide/disable unsupported controls (images, attachments, etc.)
- Display context/token consumption from session metadata or usage updates when agent provides them
- Subscribe to `availableCommands` session updates; slash autocomplete in composer
- Prompt queue: queue messages while turn running; send/cancel/edit queued items
- Structured prompt input: @file and @URL attachments mapped to ACP prompt content blocks (images deferred/out of scope per user)

## Capabilities

### New Capabilities

- `external-agent-composer`: Mode selector, capability-aware UI, token display, slash commands, prompt queue, file/URL attachments

### Modified Capabilities

- `wire-schemas`: Prompt input schema extensions, `availableCommands` in bind/catalog output, queue-related events if needed
- `conversation-view`: Queued message display in feed or composer chrome

## Non-goals

- Image attachments (delegated/out of scope)
- Agent auth, terminal creation, MCP forwarding
- Native Zed Agent profiles/skills
- Message edit/resubmit

## Prerequisites

- Merged [#51](https://github.com/soorya-u/cyrus/pull/51) (`acp-draft-session-lifecycle`): thread-bound `bindAgent`, thread-scoped catalog RPCs, `capabilities` in bind output.
- Merged [#49](https://github.com/soorya-u/cyrus/pull/49) + [#52](https://github.com/soorya-u/cyrus/pull/52): `composer-ui` with `AgentModelPicker`, compact effort/persona overflow, `useListAgents` at composer level, `ComposerSkeleton`/`ComposerUnavailable`, and `ComposerBranchToolbar` for git worktrees. Extend these components — do not restore pre-PR inline footer layout.

## Impact

- `apps/web`, `apps/mobile`: extend `agent-model-picker.tsx`, `compact-composer-controls.tsx`, `footer-controls.tsx`, `composer/index.tsx` (mode, caps, tokens, slash, queue, attachments)
- `apps/cli`: availableCommands subscription, structured `prompt` payload; thread cwd via `resolveThreadGitCwd` for @file paths
- `shared/hooks`: consume bind `capabilities` from existing catalog hook/store; optional `use-list-agents.ts` stays composer-level
- Modified spec: `composer-ui` (add mode, capability gating, token display requirements)
- Depends on: Phase 1 (#51), PR #49/#52 composer UI
