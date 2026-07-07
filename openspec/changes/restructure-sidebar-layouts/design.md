## Context

Today, `ChatSidebarLayout` (in `components/sidebar/`) is rendered independently by `workers/index.tsx`, `workers/$workerId/route.tsx`, and `settings/route.tsx`, each passing a different `sidebar` prop (`WorkersSidebar` for the first two, `SettingsSidebar` for the third). The first two duplicate identical wrapper JSX. Separately, `WorkersSidebar` and `SettingsSidebar` each hand-roll the same `ChatSidebarHeader` → `SidebarContent` → `SidebarFooter`/`ChatSidebarFooterActions` skeleton around different inner content and a different single footer action item. `settings/route.tsx` already demonstrates the pattern this change generalizes to `workers/*`: a pathless layout route above several leaf routes.

## Goals / Non-Goals

**Goals:**
- Remove duplicated layout wrapper JSX between `workers/index.tsx` and `workers/$workerId/route.tsx` using the same pathless-layout-route mechanism `settings/route.tsx` already uses.
- Remove duplicated Header/Content/Footer skeleton between `WorkersSidebar` and `SettingsSidebar` via a shared, slot-based layout component.
- Relocate `ChatSidebarLayout` next to `WorkspaceInset` (both are layout shells) and give `SidebarControl` its own file.

**Non-Goals:**
- No visual or behavioral change to either sidebar.
- No new `variant`/type-discriminator props — composition stays slot-based (`children`, `footerAction`), matching `ChatSidebarLayout`'s existing `sidebar: ReactNode` convention, so no shared component needs to know about or branch on which section is calling it.
- No interaction with the `adopt-react-call-project-dialogs` change — disjoint files.

## Decisions

**Use a pathless `workers/route.tsx` layout, mirroring `settings/route.tsx`.**
`settings/route.tsx` already wraps all `settings/*` leaf routes in one `ChatSidebarLayout`. Applying the identical pattern to `workers/route.tsx` needs no new routing concept — `workers/index.tsx` and `workers/$workerId/route.tsx` become plain content components, and `workers/$workerId/route.tsx` keeps its `beforeLoad` (`dialController`) and effects (`useWorkerConversationSync`, connection cleanup, `setLastWorkerId`) untouched, just drops the wrapper JSX in favor of a bare `<Outlet/>`.
- Alternative considered: centralize the sidebar choice even higher, in `_workspace/route.tsx`, branching on `pathname`. Rejected in exploration — it fights the router's own nested-route composition and turns a data-loading-only route into a sidebar-selection god-component (see conversation history / `adopt-react-call-project-dialogs` discussion).

**`SidebarSectionLayout` takes `children` + `footerAction` slots, not a `variant` prop.**
```
SidebarSectionLayout({ children, footerAction }) →
  <ChatSidebarHeader/>
  <SidebarContent>{children}</SidebarContent>
  <SidebarFooter><ChatSidebarFooterActions/>{footerAction}</SidebarFooter>
```
`WorkersSidebar` passes `<WorkerSelect/>` + `<ProjectThreadExplorer/>` as children and a "Settings" `SidebarMenuItem` as `footerAction`; `SettingsSidebar` passes its nav-item list as children and a "Back to chat" `SidebarMenuItem` as `footerAction`.
- Alternative considered: a `variant: "worker" | "settings"` prop with internal branching for the footer action, as originally sketched. Rejected — it would reintroduce inside a shared component the exact "branch on caller identity" smell just removed at the routing layer, and doesn't scale to a third sidebar type without editing the shared component again.

**Relocate `ChatSidebarLayout` to `layouts/`; extract `SidebarControl` to `components/sidebar/sidebar-control.tsx`.**
`layouts/` currently holds only `workspace-inset.tsx` — `ChatSidebarLayout` is the same kind of shell concept and has no other consumers to worry about breaking (confirmed: only `workers/index.tsx`, `workers/$workerId/route.tsx`, `settings/route.tsx` import it, and all three import sites are touched by this change anyway). `SidebarControl` has no external references, so extracting it is a pure move.

## Risks / Trade-offs

- **Sidebar/`SidebarProvider` state persistence changes for `/workers` navigation.** Today, navigating between `/workers` and `/workers/$workerId` remounts `SidebarProvider` (each route renders its own `ChatSidebarLayout`), though `defaultOpen` and the `localStorage`-backed resizable width make this mostly invisible. After this change, both share one `SidebarProvider` instance via `workers/route.tsx`, so open/collapsed state will persist across that navigation within a session. → Not mitigated — this is a net improvement and brings `/workers` in line with how `/settings/*` already behaves (its subpages already share one `SidebarProvider` today).
- **File moves touch import paths in up to 5 files** (`chat-sidebar-layout.tsx` relocation, `SidebarControl` extraction). → Mitigation: mechanical, caught immediately by `bun check:types`.

## Migration Plan

1. Add `apps/web/src/routes/_workspace/workers/route.tsx` with the `ChatSidebarLayout`/`WorkspaceInset`/`Outlet` wrapper.
2. Strip that wrapper from `workers/index.tsx` and `workers/$workerId/route.tsx`.
3. Move `chat-sidebar-layout.tsx` to `layouts/`; update its two remaining import sites (`workers/route.tsx`, `settings/route.tsx`).
4. Extract `SidebarControl` into `components/sidebar/sidebar-control.tsx`; import it back into `layouts/chat-sidebar-layout.tsx`.
5. Add `layouts/sidebar-section-layout.tsx`.
6. Refactor `WorkersSidebar` and `SettingsSidebar` to render through `SidebarSectionLayout`.
7. `bun check:types` + `bun check`, then manually verify both sections render identically to before and sidebar state persists correctly across in-section navigation.

No data migration or rollback concerns — pure client-side structural refactor, revertible by reverting the commit.

## Open Questions

- None outstanding.
