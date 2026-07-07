## 1. Relocate layout shells

- [x] 1.1 Move `apps/web/src/components/sidebar/chat-sidebar-layout.tsx` to `apps/web/src/layouts/chat-sidebar-layout.tsx`.
- [x] 1.2 Extract the inline `SidebarControl` function from `chat-sidebar-layout.tsx` into `apps/web/src/components/sidebar/sidebar-control.tsx`, and import it back into `layouts/chat-sidebar-layout.tsx`.

## 2. Workers layout route

- [x] 2.1 **Skipped:** do not add a pathless `workers/route.tsx`. `WorkersSidebar` (and `ProjectThreadExplorer`) must render under `workers/$workerId` so `orpcController` from that route's `beforeLoad` is available in route context.
- [x] 2.2 Keep `workers/index.tsx` rendering its own `ChatSidebarLayout`/`WorkspaceInset` wrapper for the `/workers` empty state (no `orpcController` needed there).
- [x] 2.3 Keep `workers/$workerId/route.tsx` rendering `ChatSidebarLayout`/`WorkspaceInset` with `WorkersSidebar` (preserve `beforeLoad`, effects, and `<Outlet/>` inside `WorkspaceInset`).

## 3. Shared sidebar section layout

- [x] 3.1 Create `apps/web/src/layouts/sidebar-section-layout.tsx` exporting `SidebarSectionLayout({ children, footerAction })` per the design's slot-based composition.
- [x] 3.2 Refactor `apps/web/src/components/sidebar/workers/workers-sidebar.tsx` to render through `SidebarSectionLayout`, passing its existing content as `children` and the "Settings" `SidebarMenuItem` as `footerAction`.
- [x] 3.3 Refactor `apps/web/src/components/sidebar/settings-sidebar.tsx` to render through `SidebarSectionLayout`, passing its nav list as `children` and the "Back to chat" `SidebarMenuItem` as `footerAction`.

## 4. Verification

- [x] 4.1 Run `bun check:types` and `bun check` for `apps/web`.
- [x] 4.2 Manually verify: `/workers`, `/workers/$workerId`, and `/settings/*` render identical sidebar chrome and content to before; selecting a worker shows projects/add-project; mobile viewport still works for both sections.
