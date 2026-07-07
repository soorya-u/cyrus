## Why

While scoping the react-call dialogs change (`adopt-react-call-project-dialogs`), we found the sidebar's layout shell is duplicated where it doesn't need to be: `workers/index.tsx` and `workers/$workerId/route.tsx` both wrap their content in an identical `<ChatSidebarLayout sidebar={<WorkersSidebar/>}>`, and `WorkersSidebar`/`SettingsSidebar` both hand-roll the same Header/Content/Footer skeleton around different inner content. Consolidating both removes copy-pasted structure without changing any user-visible behavior.

## What Changes

- Add `apps/web/src/routes/_workspace/workers/route.tsx` as a pathless layout route (mirroring the existing `settings/route.tsx` pattern) that renders `<ChatSidebarLayout sidebar={<WorkersSidebar/>}><WorkspaceInset><Outlet/></WorkspaceInset></ChatSidebarLayout>` once for the whole `/workers/*` subtree.
- Strip the now-redundant `ChatSidebarLayout`/`WorkspaceInset` wrapper out of `workers/index.tsx` and `workers/$workerId/route.tsx`; `$workerId/route.tsx` keeps its `beforeLoad` and effects, just returns a bare `<Outlet/>`.
- Move `components/sidebar/chat-sidebar-layout.tsx` to `layouts/chat-sidebar-layout.tsx`, alongside `layouts/workspace-inset.tsx`.
- Extract the `SidebarControl` function currently inlined in `chat-sidebar-layout.tsx` into its own file, `components/sidebar/sidebar-control.tsx`.
- Add `layouts/sidebar-section-layout.tsx` exporting `SidebarSectionLayout({ children, footerAction })` — a slot-based wrapper for `ChatSidebarHeader` + `SidebarContent` + `SidebarFooter`/`ChatSidebarFooterActions`, matching `ChatSidebarLayout`'s existing `sidebar: ReactNode`-slot convention (not a `variant: "worker" | "settings"` prop, to avoid a component that branches on caller identity).
- Refactor `WorkersSidebar` and `SettingsSidebar` to render through `SidebarSectionLayout`, each supplying its own content and its own footer action item (Settings button / Back-to-chat button).

## Capabilities

### New Capabilities
- `sidebar-layout-structure`: How sidebar chrome (layout shell, header/content/footer composition) is shared across the workers and settings sections without per-route or per-variant duplication.

### Modified Capabilities
(none — no existing spec covers this behavior)

## Impact

- **Affected code**: `apps/web/src/routes/_workspace/workers/index.tsx`, `workers/$workerId/route.tsx`, `apps/web/src/components/sidebar/chat-sidebar-layout.tsx` (moved), `apps/web/src/components/sidebar/workers/workers-sidebar.tsx`, `apps/web/src/components/sidebar/settings-sidebar.tsx`.
- **New files**: `apps/web/src/routes/_workspace/workers/route.tsx`, `apps/web/src/layouts/chat-sidebar-layout.tsx`, `apps/web/src/layouts/sidebar-section-layout.tsx`, `apps/web/src/components/sidebar/sidebar-control.tsx`.
- **Dependencies**: none new.
- **Relationship to other changes**: independent of `adopt-react-call-project-dialogs` — no shared files, safe to land in either order.

## Non-goals

- No user-visible behavior or styling change — this is a structural/organizational refactor only.
- No change to `WorkersSidebar`/`SettingsSidebar` business logic beyond removing duplicated wrapper markup.
- Does not touch the react-call dialog work from `adopt-react-call-project-dialogs`.
