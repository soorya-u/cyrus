## 1. Relocate layout shells

- [ ] 1.1 Move `apps/web/src/components/sidebar/chat-sidebar-layout.tsx` to `apps/web/src/layouts/chat-sidebar-layout.tsx`.
- [ ] 1.2 Extract the inline `SidebarControl` function from `chat-sidebar-layout.tsx` into `apps/web/src/components/sidebar/sidebar-control.tsx`, and import it back into `layouts/chat-sidebar-layout.tsx`.

## 2. Workers layout route

- [ ] 2.1 Create `apps/web/src/routes/_workspace/workers/route.tsx` as a pathless layout: `beforeLoad`-free, rendering `<ChatSidebarLayout sidebar={<WorkersSidebar/>}><WorkspaceInset><Outlet/></WorkspaceInset></ChatSidebarLayout>`, modeled on `settings/route.tsx`.
- [ ] 2.2 Update `workers/index.tsx` to drop the `ChatSidebarLayout`/`WorkspaceInset` wrapper and its now-unused imports, returning just its page content.
- [ ] 2.3 Update `workers/$workerId/route.tsx` to drop the `ChatSidebarLayout`/`WorkspaceInset` wrapper (keep `beforeLoad` and existing effects), returning a bare `<Outlet/>`.

## 3. Shared sidebar section layout

- [ ] 3.1 Create `apps/web/src/layouts/sidebar-section-layout.tsx` exporting `SidebarSectionLayout({ children, footerAction })` per the design's slot-based composition.
- [ ] 3.2 Refactor `apps/web/src/components/sidebar/workers/workers-sidebar.tsx` to render through `SidebarSectionLayout`, passing its existing content as `children` and the "Settings" `SidebarMenuItem` as `footerAction`.
- [ ] 3.3 Refactor `apps/web/src/components/sidebar/settings-sidebar.tsx` to render through `SidebarSectionLayout`, passing its nav list as `children` and the "Back to chat" `SidebarMenuItem` as `footerAction`.

## 4. Verification

- [ ] 4.1 Run `bun check:types` and `bun check` for `apps/web`.
- [ ] 4.2 Manually verify: `/workers`, `/workers/$workerId`, and `/settings/*` render identical sidebar chrome and content to before; sidebar open/closed state now persists when navigating between `/workers` and `/workers/$workerId`; mobile viewport still works for both sections.
