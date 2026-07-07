# Sidebar Layout Structure

## Purpose

Define how sidebar chrome (layout shell, header/content/footer composition) is shared across the workers and settings sections without per-route or per-variant duplication.

## Requirements

### Requirement: Shared Settings Section Layout

The system SHALL render the sidebar chrome (`ChatSidebarLayout` with the settings sidebar) exactly once for the entire `/settings/*` route subtree via a single pathless layout route.

#### Scenario: Navigating within the settings section preserves sidebar state

- **WHEN** a user toggles the sidebar open/closed on one settings page and then navigates to another `/settings/*` route
- **THEN** the sidebar's open/closed state is preserved, because all settings routes share one mounted layout instance

### Requirement: Workers Sidebar Stays on Routes That Provide Controller Context

The workers sidebar SHALL be rendered within route components that sit under `workers/$workerId`, not in a parent `workers` pathless layout, so `WorkersSidebar` can read `orpcController` from the `$workerId` route's `beforeLoad` context.

#### Scenario: Project explorer renders after selecting a worker

- **WHEN** a user selects a worker and navigates to `/workers/$workerId`
- **THEN** `WorkersSidebar` receives `orpcController` from route context and renders `ProjectThreadExplorer`

#### Scenario: Workers pages render identical sidebar content to before

- **WHEN** a user visits `/workers` or `/workers/$workerId`
- **THEN** the same `WorkersSidebar` content and layout chrome renders as before the restructuring, with no visible difference

### Requirement: Slot-Based Sidebar Section Composition

The system SHALL compose the shared header/content/footer skeleton for worker and settings sidebars using caller-supplied content and footer-action slots, without any shared component branching on which section is calling it.

#### Scenario: Worker sidebar supplies its own footer action

- **WHEN** `WorkersSidebar` renders through the shared section layout
- **THEN** it supplies its project explorer content and its "Settings" footer action as slot props, and the shared layout renders them without any conditional logic keyed to "worker" identity

#### Scenario: Settings sidebar supplies its own footer action

- **WHEN** `SettingsSidebar` renders through the shared section layout
- **THEN** it supplies its navigation list content and its "Back to chat" footer action as slot props, and the shared layout renders them without any conditional logic keyed to "settings" identity

### Requirement: Layout Shells Grouped by Concern

The system SHALL locate cross-section layout shell components (`ChatSidebarLayout`, `SidebarSectionLayout`, `WorkspaceInset`) under `apps/web/src/layouts/`, and single-purpose sidebar chrome pieces (`SidebarControl`) under `apps/web/src/components/sidebar/`, so file location reflects whether a component composes page structure or renders a specific sidebar element.

#### Scenario: Layout shell is discoverable alongside its peers

- **WHEN** a developer looks in `apps/web/src/layouts/` for page/section structural components
- **THEN** `chat-sidebar-layout.tsx` and `sidebar-section-layout.tsx` are present alongside `workspace-inset.tsx`
