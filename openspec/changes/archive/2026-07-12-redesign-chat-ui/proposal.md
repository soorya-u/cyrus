## Why

GitHub issue #14 flagged the chat UI as a functional first pass — tool rows show raw JSON, the composer footer is four ghost selects, and loading/thinking states are conflated. With shadcn chat primitives now available (`MessageScroller`, `Bubble`, `Marker`) and `listAgents` returning icons, we can align the Cyrus web chat with t3code's polished patterns while fixing workspace navigation gaps (no dedicated empty states, truncated UUID breadcrumbs).

## What Changes

- **Timeline**: Replace hand-rolled scroll with `MessageScroller`; flat tool/diff rows (no `WorkLog` wrapper); t3-style `ToolRow` with parsed previews; `Marker` + shimmer for "Working for {time}s" during active turns; segregated thinking collapsible
- **Messages**: Replace hand-rolled user/assistant bubbles with `Message` + `Bubble`
- **Composer**: t3-style combined Agent+Model picker with icons; compact overflow menu for Effort/Persona on narrow screens
- **Chrome**: `Breadcrumb` in thread header (project name / thread name); remove UUID context label
- **Empty states**: Three `Empty` variants (workspace, project, thread) with install snippet on workspace; route redirects for incomplete paths
- **Dependencies**: `@shadcn/react`, shadcn chat UI components, `shadcn/tailwind.css` (shimmer/scroll-fade)

## Capabilities

### New Capabilities

- `chat-timeline-ui`: Timeline rendering — working marker, flat tool/diff rows, thinking segregation, MessageScroller integration, Message/Bubble messages
- `composer-ui`: Composer footer redesign — combined agent/model picker, compact controls, primary action parity with t3code
- `workspace-empty-states`: Workspace navigation empty states, route redirects, install snippet

### Modified Capabilities

- `conversation-view`: `deriveFeed` emits flat `tool`/`diff` entries; working indicator tied to turn lifecycle (not content arrival)

## Non-goals

- Mobile/React Native implementation (web only for this change)
- Server-side or ORPC schema changes
- Full shadcn `snippet` registry component (build a local install-snippet instead)
- Persisting composer catalog selections to thread metadata
- Turn-fold / "Worked for Xs" collapsed history (t3code settled-turn folding — follow-up)

## Impact

- `apps/web/src/components/chat/**` — messages, work-log, feed, composer, empty, thread-header
- `apps/web/src/routes/_workspace/workers/**` — new index routes and redirects
- `shared/hooks/src/use-thread-feed.ts` — feed derivation for flat entries
- `apps/web/package.json` — `@shadcn/react`, shadcn components
- Closes direction for GitHub issue #14
