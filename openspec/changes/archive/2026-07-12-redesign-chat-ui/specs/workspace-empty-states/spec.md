## ADDED Requirements

### Requirement: Three workspace empty states

The web app SHALL provide three distinct empty states using the shadcn `Empty` component: workspace (no worker), project (no project selected), and thread (no thread selected).

#### Scenario: Workspace empty state

- **WHEN** the user navigates to `/workers/` with no worker selected
- **THEN** an empty workspace view is displayed prompting worker selection or daemon installation

#### Scenario: Project empty state

- **WHEN** the user navigates to `/workers/$workerId/` with no project selected
- **THEN** an empty project view prompts selecting or creating a project

#### Scenario: Thread empty state

- **WHEN** the user navigates to `/workers/$workerId/p/$projectId/` with no thread selected
- **THEN** an empty thread view prompts picking or creating a thread from the sidebar

### Requirement: Install snippet on workspace empty state

The workspace empty state SHALL include an install snippet below the description, allowing the user to copy npm or shell install commands for the Cyrus daemon.

#### Scenario: Install snippet with copy

- **WHEN** the workspace empty state is displayed
- **THEN** an install snippet shows npm and shell command tabs
- **AND** the user can copy the active tab's command to the clipboard

### Requirement: Incomplete path redirects

Routes with missing trailing segments SHALL redirect to the nearest valid parent route.

#### Scenario: Project index redirects to worker

- **WHEN** the user navigates to `/workers/$workerId/p/`
- **THEN** they are redirected to `/workers/$workerId`

#### Scenario: Thread index redirects to project

- **WHEN** the user navigates to `/workers/$workerId/p/$projectId/t/`
- **THEN** they are redirected to `/workers/$workerId/p/$projectId`

### Requirement: Breadcrumb navigation in thread header

The thread header SHALL display project name and thread name using shadcn `Breadcrumb` instead of truncated worker/project UUIDs.

#### Scenario: Breadcrumb shows names

- **WHEN** a thread workspace is rendered
- **THEN** the header shows `project.name` as a link and `thread.name` as the current page
- **AND** no truncated UUID context label is displayed
