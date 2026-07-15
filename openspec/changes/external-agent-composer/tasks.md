## 1. Wire and worker

- [x] 1.1 Extend chat input schema for structured prompt blocks (text, file, url)
- [x] 1.2 Map structured blocks to ACP PromptRequest in worker (paths via `resolveThreadGitCwd`)
- [x] 1.3 Consume bind `capabilities` in client hook/store (already returned by Phase 1)
- [x] 1.4 Subscribe to availableCommands session updates after bind; forward to clients
- [x] 1.5 Add optional `getContextUsage({ threadId })` from session metadata

## 2. Mode and capabilities UI (extend PR #49/#52 composer)

- [x] 2.1 Add mode selector to `footer-controls.tsx` (wide) and/or `compact-composer-controls.tsx` (narrow); pass `agents` into `useAgentCatalog` like existing pickers
- [x] 2.2 Cache capabilities per thread from bind in hook/store
- [x] 2.3 Hide unsupported controls based on capabilities (gate placeholder @ and / affordances in `composer/index.tsx`)
- [x] 2.4 Display context/token usage in composer footer when `getContextUsage` returns data
- [x] 2.5 Delta-update `openspec/specs/composer-ui` with mode + capability + token requirements

## 3. Slash commands

- [x] 3.1 Implement `/` autocomplete in `composer/index.tsx` textarea (placeholder already references commands)
- [x] 3.2 Update commands on session notifications or catalog refresh

## 4. Prompt queue

- [x] 4.1 Add per-thread queue store (Zustand); compose with PR #49 `sending` guard
- [x] 4.2 Queue sends while `isThreadActive`; drain on turn complete
- [x] 4.3 Queue UI chips above composer footer in `composer/index.tsx`

## 5. Attachments

- [x] 5.1 Add @ file picker scoped to thread/project tree (paths relative to thread worktree cwd)
- [x] 5.2 Add URL attach input
- [x] 5.3 Render attachment chips in `composer/index.tsx` before send

## 6. Mobile

- [ ] 6.1 Port mode selector, capabilities gating, queue, and attachments

## 7. Tests

- [x] 7.1 Structured prompt maps to ACP content blocks
- [x] 7.2 Queue drains after turn_completed
- [x] 7.3 Mode selector hidden when no modes
