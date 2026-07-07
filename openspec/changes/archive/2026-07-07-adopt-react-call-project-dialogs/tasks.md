## 1. Portal components

- [x] 1.1 Create `apps/web/src/components/portals/rename-project-dialog.tsx`: `createCallable<{ currentName: string }, string | null>` wrapping the existing shadcn `Dialog` markup pulled from `project-thread-group.tsx` (lines 160-186). Route `onOpenChange(false)` and Cancel through `call.end(null)`, Save through `call.end(trimmedName)`.
- [x] 1.2 Create `apps/web/src/components/portals/delete-project-dialog.tsx`: `createCallable<{ projectName: string; threadCount: number }, boolean>` wrapping the existing `AlertDialog` markup pulled from `project-thread-group.tsx` (lines 188-204). Route Cancel/`onOpenChange(false)` through `call.end(false)`, the destructive action through `call.end(true)`.
- [x] 1.3 Create `apps/web/src/components/portals/new-project-dialog.tsx`: `createCallable<void, { name: string; path: string } | null>` wrapping the existing `CommandDialog` markup and `useAddProjectBrowse` hook from `add-project-dialog.tsx`. Resolve `call.end({ name, path })` on submit, `call.end(null)` on cancel/backdrop/Escape.

## 2. Mount roots

- [x] 2.1 In `apps/web/src/routes/_workspace/route.tsx`, render `<NewProjectDialog />`, `<RenameProjectDialog />`, `<DeleteProjectDialog />` alongside `<Outlet />` in `WorkspaceLayout`.

## 3. Rewire call sites

- [x] 3.1 In `project-thread-group.tsx`: remove `renameOpen`/`renameValue`/`deleteOpen` state, the inline `Dialog`/`AlertDialog` JSX, and the `submitRename` helper. Change the "Rename" menu item to `onSelect={async () => { const name = await RenameProjectDialog.call({ currentName: project.name }); if (name) onRenameProject(project.id, name); }}`. Change the "Delete" menu item to `onSelect={async () => { const confirmed = await DeleteProjectDialog.call({ projectName: project.name, threadCount: threads.length }); if (confirmed) onRemoveProject(project.id); }}`.
- [x] 3.2 In `project-thread-explorer.tsx`: remove `addProjectOpen` state and the `<AddProjectDialog>` render. Change the "Add project" button's `onClick` to `async () => { const result = await NewProjectDialog.call(); if (result) createProject(result.name, result.path); }`.
- [x] 3.3 Delete `apps/web/src/components/sidebar/projects/add-project-dialog.tsx` and remove its import from `project-thread-explorer.tsx`.

## 4. Verification

- [x] 4.1 Run `bun check:types` and `bun check` (Biome/Ultracite) for `apps/web`.
- [x] 4.2 Manually verify in the browser: rename via dialog (submit + Enter key + cancel + Escape + backdrop), delete via dialog (confirm + cancel), create project via dialog (submit + cancel) — from each of workers list, a worker's thread view, and settings, confirming the dialogs open correctly from all three.
- [x] 4.3 Confirm thread rename (inline) and thread delete (inline two-click) in `thread-row.tsx` are untouched and still work.
