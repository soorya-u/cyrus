## Context

`react-call` v2 (`^2.0.2`, already in `apps/web/package.json`) works via `createCallable<Props, Response, RootProps>(UserComponent)`, which returns a callable component: mount it directly (`<Dialog />` — `.Root` is a deprecated alias for the same thing), and invoke it anywhere with `Dialog.call(props): Promise<Response>`. The `UserComponent` receives a `call` prop (`{ end, ended, key, root, index, stackSize }`); calling `call.end(response)` resolves the promise and unmounts (with an optional exit-animation delay).

Today, `ProjectThreadGroup` owns `renameOpen`/`renameValue`/`deleteOpen` as local `useState` and renders the shadcn `<Dialog>`/`<AlertDialog>` inline. `AddProjectDialog` is parent-controlled (`open`/`onOpenChange` passed down from `ProjectThreadExplorer`). Both patterns thread dialog visibility through component trees that don't otherwise need to know about it. `sonner`'s `<Toaster />` (mounted once in `__root.tsx`, called via `toast.success(...)` anywhere) is the existing precedent for the call-from-anywhere shape this change adopts.

## Goals / Non-Goals

**Goals:**
- Replace parent/local dialog-visibility state for New/Rename/Delete Project with `react-call` invocations.
- Split rename and delete into their own components (currently inline in `ProjectThreadGroup`).
- Keep the existing shadcn `Dialog`/`AlertDialog`/`CommandDialog` markup and the existing `useAddProjectBrowse` hook — only the open-state wiring changes, not the visual dialogs themselves.

**Non-Goals:**
- No `@tanstack/react-form` adoption (see proposal's Non-goals).
- No change to thread-row rename/delete or the mobile sidebar drawer.
- No change to the mutation logic in `use-projects.ts` — dialogs collect input and resolve, callers still own calling `onRenameProject`/`onRemoveProject`/`onCreate`.

## Decisions

**Dialogs resolve data; they don't perform mutations themselves.**
`RenameProjectDialog.call({ currentName })` resolves `Promise<string | null>` (`null` = cancelled). `DeleteProjectDialog.call({ projectName, threadCount })` resolves `Promise<boolean>`. `NewProjectDialog.call()` resolves `Promise<{ name: string; path: string } | null>`. Callers (menu `onSelect` handlers in `ProjectThreadGroup` / wherever "new project" is triggered) `await` the call and then invoke the existing `onRenameProject`/`onRemoveProject`/`onCreate` props.
- Alternative considered: have each dialog accept the mutation function/project id and perform the mutation itself before calling `call.end()`. Rejected — it would couple presentational portal components to `use-projects.ts` mutation hooks, making them harder to reuse or test in isolation, and mixes "collect input" with "cause a side effect" in one component.

**All three portal components live under `apps/web/src/components/portals/`, one file each.**
`new-project-dialog.tsx`, `rename-project-dialog.tsx`, `delete-project-dialog.tsx`. Each exports its `createCallable` result directly (mirrors how `sonner`'s `Toaster` is a single default export).

**Roots mount once in `apps/web/src/routes/_workspace/route.tsx`.**
`ChatSidebarLayout` (which renders the sidebar) is instantiated separately in `workers/index.tsx`, `workers/$workerId/route.tsx`, and `settings/route.tsx`. `_workspace/route.tsx`'s `WorkspaceLayout` is the nearest common ancestor of all three, so mounting `<NewProjectDialog />`, `<RenameProjectDialog />`, `<DeleteProjectDialog />` there guarantees exactly one instance of each regardless of which workspace page is active.
- Alternative considered: mount inside `ChatSidebarLayout` itself. Rejected — that component renders three separate times (once per route), which would either triple-mount the roots or require de-duping logic; `_workspace/route.tsx` avoids the problem structurally.

**Cancel via Escape/backdrop resolves the same as an explicit Cancel click.**
Each dialog's `onOpenChange(false)` handler (Escape, backdrop click, close button) calls `call.end(null)` / `call.end(false)`, identical to clicking "Cancel." Only explicit Save/Delete/Create actions resolve with real data.

## Risks / Trade-offs

- **Stacking**: `.call()` can be invoked multiple times concurrently, so double-triggering (e.g. a stray double-click on a menu item) could stack two instances of the same dialog. → Mitigation: not addressed now (menu items already close on click, making this unlikely); if it surfaces, switch to `.upsert()` with a fixed key to dedupe instead of `.call()`.
- **Losing shadcn's `onOpenChange` idiom**: every dialog body needs to remember to route `onOpenChange(false)` through `call.end(...)`, not just local `setOpen(false)`. → Mitigation: each new file is small (one dialog each), reviewed individually; this is exactly the kind of thing the "too big" component was hiding.

## Migration Plan

This is a UI-only refactor with no persisted state or API changes, so there's no rollback beyond reverting the commit.
1. Add the three files under `components/portals/`, each wrapping the existing shadcn dialog markup pulled out of `project-thread-group.tsx` / `add-project-dialog.tsx`.
2. Mount all three in `_workspace/route.tsx`.
3. Update call sites: `ProjectThreadGroup`'s dropdown menu items, and wherever `AddProjectDialog`'s parent (`ProjectThreadExplorer`) currently renders it with `open`/`onOpenChange`.
4. Delete `add-project-dialog.tsx` and the `renameOpen`/`renameValue`/`deleteOpen` state + inline dialog JSX from `project-thread-group.tsx`.
5. Manually verify: open/cancel/submit for all three dialogs, Enter-to-submit on rename, Escape/backdrop-dismiss treated as cancel, mobile viewport.

## Open Questions

- None outstanding — scope, file layout, and mount location were confirmed during exploration.
