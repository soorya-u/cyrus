## 1. shadcn Primitives

- [x] 1.1 Add `@shadcn/react` and shadcn chat UI components (`marker`, `bubble`, `message`, `message-scroller`, `breadcrumb`, `empty`)
- [x] 1.2 Import `shadcn/tailwind.css` in `apps/web/src/index.css` for shimmer and scroll-fade utilities

## 2. Workspace Empty States

- [x] 2.1 Create `apps/web/src/components/chat/empty/` with `EmptyWorkspace`, `EmptyProject`, `EmptyThread`, and `InstallSnippet`
- [x] 2.2 Add redirect route `workers/$workerId/p/index.tsx` → `/workers/$workerId`
- [x] 2.3 Add redirect route `workers/$workerId/p/$projectId/t/index.tsx` → `/workers/$workerId/p/$projectId`
- [x] 2.4 Add project index route `workers/$workerId/p/$projectId/index.tsx` rendering `EmptyThread`
- [x] 2.5 Wire `/workers/` to `EmptyWorkspace` (replace `ThreadEmptyState`)
- [x] 2.6 Wire `/workers/$workerId/` to `EmptyProject` with create-project CTA
- [x] 2.7 Regenerate TanStack Router route tree and fix type errors
- [x] 2.8 Delete `thread-empty-state.tsx` after route wiring is complete

## 3. Thread Header

- [x] 3.1 Replace UUID context label in `thread-header.tsx` with `Breadcrumb` (project name → thread name)
- [x] 3.2 Resolve project name from `useControllerThreads().projects` by `projectId`

## 4. Chat Timeline

- [x] 4.1 Refactor `deriveFeed` to emit flat `tool` and `diff` entry types; remove `work` grouping
- [x] 4.2 Remove `WorkLog` wrapper; render `ToolRow`/`DiffRow` directly in `feed-entry-view`
- [x] 4.3 Redesign `ToolRow` with t3-style preview parsing; non-expandable when unparseable (add TODO comment)
- [x] 4.4 Add `WorkingMarker` component using `Marker` + shimmer + self-ticking elapsed timer
- [x] 4.5 Update `AssistantThinking` — remove spinner from trigger; keep collapsible reasoning only
- [x] 4.6 Replace `ChatFeed` `ScrollArea` + manual scroll with `MessageScroller` + `MessageScrollerItem`
- [x] 4.7 Migrate `UserMessage` and `AssistantMessage` to `Message` + `Bubble`

## 5. Composer

- [x] 5.1 Build combined Agent+Model picker popover (t3 `ProviderModelPicker` pattern) with agent icons in trigger
- [x] 5.2 Add compact overflow menu for Effort/Persona on narrow viewports
- [x] 5.3 Add send-button spinner while connecting/sending in `ComposerPrimaryAction`

## 6. Verification

- [x] 6.1 Run `bun check:types` in `apps/web`
- [ ] 6.2 Smoke test: `/workers/` → worker → project → thread navigation and empty states
- [ ] 6.3 Smoke test: active turn shows working marker with shimmer; thinking is separate
