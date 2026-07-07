## Why

PR #9 review flagged `ProjectThreadGroup` (`apps/web/src/components/sidebar/projects/project-thread-group.tsx`) as too large, with its rename/delete dialogs driven by local `useState` threaded through the same ~235-line file that also renders the project row and thread list. `react-call` is already installed (`^2.0.2`) and the codebase already proves the imperative-call pattern works well via `sonner` (`<Toaster />` mounted once, called from anywhere). Moving the project dialogs to that same shape fixes the size complaint and the state-threading complaint together, since the split falls out of the dialogs becoming standalone call targets.

## What Changes

- Add `NewProjectDialog`, `RenameProjectDialog`, and `DeleteProjectDialog` as separate `react-call` components under `apps/web/src/components/portals/`, each with its own file.
- Mount their `.Root`s once in `apps/web/src/routes/_workspace/route.tsx` — the single common ancestor above the three existing `ChatSidebarLayout` render sites (`workers/index.tsx`, `workers/$workerId/route.tsx`, `settings/route.tsx`).
- **BREAKING (internal)**: `AddProjectDialog` (`components/sidebar/projects/add-project-dialog.tsx`) is replaced by `NewProjectDialog.call()`; its parent-controlled `open`/`onOpenChange` props are removed from all call sites.
- Remove `renameOpen`, `renameValue`, `deleteOpen` state and the inline `<Dialog>`/`<AlertDialog>` JSX from `ProjectThreadGroup`; menu items call `RenameProjectDialog.call(...)` / `DeleteProjectDialog.call(...)` instead.
- No form library adoption: `@tanstack/react-form` stays installed but unused. Both dialogs' validation (non-empty, trimmed name) is a one-line check with no async/multi-field/error-surfacing need to justify it.
- Explicitly unchanged: thread rename (inline edit in `thread-row.tsx`), thread delete (inline icon → "Confirm" two-click), and the mobile sidebar `Sheet` (stays on shared `SidebarContext`, which has multiple consumers a one-shot call model doesn't fit).

## Capabilities

### New Capabilities
- `sidebar-project-dialogs`: Imperative, promise-based create/rename/delete dialogs for projects in the sidebar, invoked via `react-call` instead of component-local open state.

### Modified Capabilities
(none — no existing spec covers this behavior)

## Impact

- **Affected code**: `apps/web/src/components/sidebar/projects/project-thread-group.tsx`, `apps/web/src/components/sidebar/projects/add-project-dialog.tsx` (removed), `apps/web/src/components/sidebar/projects/project-thread-explorer.tsx` (call sites), `apps/web/src/routes/_workspace/route.tsx`.
- **New files**: `apps/web/src/components/portals/new-project-dialog.tsx`, `rename-project-dialog.tsx`, `delete-project-dialog.tsx`.
- **Dependencies**: `react-call` (already added to `apps/web/package.json`). No catalog changes.

## Non-goals

- Adopting `@tanstack/react-form` — no current dialog has validation, async-check, or multi-field complexity to justify it.
- Changing thread rename (stays inline `useState` in `thread-row.tsx`) or thread delete (stays inline icon → "Confirm" two-click).
- Changing the mobile sidebar `Sheet`/drawer — it's shared `SidebarContext` state with multiple consumers, not a one-shot call+result flow.
- Adding server-side validation, error UI, or async validators to the rename/create flows — acknowledged gaps, deferred.
